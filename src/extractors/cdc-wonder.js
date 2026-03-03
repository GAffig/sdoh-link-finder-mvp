import { hostMatches, normalizeText, parseCsvRecords, parseYear, resolveHost } from "./helpers.js";

const WONDER_TERMS_URL = "https://wonder.cdc.gov/";
const CURRENT_YEAR = new Date().getUTCFullYear();
const DEFAULT_YEAR = CURRENT_YEAR - 1;

const WONDER_TEMPLATES = Object.freeze({
  mortality_county_v1: Object.freeze({
    id: "mortality_county_v1",
    label: "Mortality",
    module: "Underlying Cause of Death",
    databaseId: "D76",
    description: "Preconfigured mortality template with a single-year selector.",
    defaultYear: DEFAULT_YEAR,
    yearFilterParameter: "F_D76.V1",
    measurePriorityKeys: Object.freeze(["Deaths", "Crude Rate", "Age-adjusted Rate"]),
    baseParameters: Object.freeze([
      Object.freeze({ name: "B_1", values: Object.freeze(["D76.V1-level1"]) }),
      Object.freeze({ name: "M_1", values: Object.freeze(["D76.M1"]) }),
      Object.freeze({ name: "M_2", values: Object.freeze(["D76.M3"]) }),
      Object.freeze({ name: "F_D76.V2", values: Object.freeze(["*All*"]) }),
      Object.freeze({ name: "F_D76.V9", values: Object.freeze(["*All*"]) }),
      Object.freeze({ name: "F_D76.V27", values: Object.freeze(["*All*"]) }),
      Object.freeze({ name: "I_D76.V1", values: Object.freeze(["*All*"]) }),
      Object.freeze({ name: "O_javascript", values: Object.freeze(["off"]) })
    ])
  }),
  natality_county_v1: Object.freeze({
    id: "natality_county_v1",
    label: "Natality",
    module: "Natality",
    databaseId: "D66",
    description: "Preconfigured natality template with a single-year selector.",
    defaultYear: DEFAULT_YEAR,
    yearFilterParameter: "F_D66.V1",
    measurePriorityKeys: Object.freeze(["Births", "Birth Rate"]),
    baseParameters: Object.freeze([
      Object.freeze({ name: "B_1", values: Object.freeze(["D66.V1-level1"]) }),
      Object.freeze({ name: "M_1", values: Object.freeze(["D66.M1"]) }),
      Object.freeze({ name: "M_2", values: Object.freeze(["D66.M2"]) }),
      Object.freeze({ name: "F_D66.V8", values: Object.freeze(["*All*"]) }),
      Object.freeze({ name: "I_D66.V1", values: Object.freeze(["*All*"]) }),
      Object.freeze({ name: "O_javascript", values: Object.freeze(["off"]) })
    ])
  })
});

const WONDER_TEMPLATE_OPTIONS = Object.freeze(
  Object.values(WONDER_TEMPLATES).map((template) =>
    Object.freeze({
      id: template.id,
      label: template.label,
      module: template.module,
      description: template.description
    })
  )
);

export const cdcWonderExtractor = Object.freeze({
  id: "cdc_wonder",
  label: "CDC WONDER (Preset Templates)",
  method: "api_template",
  description: "Preset CDC WONDER templates with deterministic request bodies and limited controls.",
  supportedDomains: Object.freeze(["wonder.cdc.gov"]),
  supportedOutputFormats: Object.freeze(["csv"]),
  defaultParameters: Object.freeze({
    templateId: "mortality_county_v1",
    year: DEFAULT_YEAR
  }),
  eligibility(result) {
    const host = resolveHost(result?.url);
    if (!host || !hostMatches(host, "wonder.cdc.gov")) {
      return null;
    }

    return {
      sourceId: this.id,
      label: this.label,
      method: this.method,
      supportedOutputFormats: [...this.supportedOutputFormats],
      defaults: this.defaultParameters,
      templateOptions: WONDER_TEMPLATE_OPTIONS,
      notes: "Use preset templates only. State/county filters are not exposed in this MVP."
    };
  },
  async extract({ url, parameters, fetchImpl }) {
    const sourceHost = resolveHost(url);
    if (!hostMatches(sourceHost, "wonder.cdc.gov")) {
      throw createExtractorError(
        `CDC WONDER extraction is only supported for wonder.cdc.gov links. Selected host: ${sourceHost || "unknown"}.`,
        400
      );
    }

    const templateId = String(parameters?.templateId || this.defaultParameters.templateId).trim();
    const template = WONDER_TEMPLATES[templateId];
    if (!template) {
      throw createExtractorError(
        `Unknown CDC WONDER template "${templateId}". Supported templates: ${Object.keys(WONDER_TEMPLATES).join(", ")}.`,
        400
      );
    }

    const selectedYear = resolveSelectedYear(parameters?.year, template.defaultYear);
    const requestXml = buildRequestXml({
      template,
      selectedYear
    });
    const endpoint = `https://wonder.cdc.gov/controller/datarequest/${template.databaseId}`;
    const requestPayload = new URLSearchParams();
    requestPayload.set("request_xml", requestXml);
    requestPayload.set("accept_datause_restrictions", "true");

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/xml,text/xml,text/plain,text/csv",
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
      },
      body: requestPayload.toString()
    });

    const rawText = await response.text();
    if (!response.ok) {
      const providerMessage = extractProviderMessage(rawText);
      throw createExtractorError(
        `CDC WONDER template request returned HTTP ${response.status}. ${providerMessage || "Template request was rejected."}`,
        502,
        {
          templateId,
          module: template.module,
          databaseId: template.databaseId,
          endpoint,
          responseSnippet: rawText.slice(0, 500)
        }
      );
    }

    const tableRecords = parseWonderRecords(rawText);
    if (tableRecords.length === 0) {
      const providerMessage = extractProviderMessage(rawText);
      throw createExtractorError(
        "CDC WONDER response returned no tabular rows for the selected template/year.",
        422,
        {
          templateId,
          module: template.module,
          databaseId: template.databaseId,
          endpoint,
          providerMessage,
          responseSnippet: rawText.slice(0, 500)
        }
      );
    }

    const standardizedRows = tableRecords.map((row) =>
      normalizeWonderRow({
        row,
        template,
        selectedYear
      })
    );

    return {
      source: this.id,
      sourceUrl: url,
      method: this.method,
      parameters: {
        templateId,
        year: selectedYear
      },
      requestDetails: {
        endpoint,
        queryString: "",
        templateId,
        templateModule: template.module,
        databaseId: template.databaseId,
        requestXml
      },
      licenseOrTermsUrl: WONDER_TERMS_URL,
      rows: standardizedRows
    };
  }
});

function resolveSelectedYear(rawYear, defaultYear) {
  const parsed = parseYear(rawYear);
  if (parsed) {
    return parsed;
  }
  return parseYear(defaultYear) || DEFAULT_YEAR;
}

function buildRequestXml({ template, selectedYear }) {
  const parameters = [];
  for (const parameter of template.baseParameters) {
    parameters.push({
      name: parameter.name,
      values: [...parameter.values]
    });
  }

  parameters.push({
    name: template.yearFilterParameter,
    values: [String(selectedYear)]
  });

  const parameterBlocks = parameters.map((parameter) => buildParameterXml(parameter.name, parameter.values)).join("");
  return `<request-parameters>${parameterBlocks}</request-parameters>`;
}

function buildParameterXml(name, values) {
  const safeName = xmlEscape(name);
  const safeValues = Array.isArray(values) ? values : [];
  const valueBlocks = safeValues.map((value) => `<value>${xmlEscape(String(value))}</value>`).join("");
  return `<parameter><name>${safeName}</name>${valueBlocks}</parameter>`;
}

function parseWonderRecords(rawText) {
  const xmlRecords = parseWonderXmlRecords(rawText);
  if (xmlRecords.length > 0) {
    return xmlRecords;
  }

  const tsvRecords = parseTsvRecords(rawText);
  if (tsvRecords.length > 0) {
    return tsvRecords;
  }

  return parseCsvRecords(rawText);
}

function parseWonderXmlRecords(rawText) {
  const text = String(rawText || "");
  if (!text.includes("<")) {
    return [];
  }

  const tableMatch =
    text.match(/<data-table[^>]*>([\s\S]*?)<\/data-table>/i) ||
    text.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    return [];
  }

  const tableInner = tableMatch[1];
  const rows = [];
  const rowMatches = tableInner.matchAll(/<r(?:\s+[^>]*)?>([\s\S]*?)<\/r>/gi);
  for (const rowMatch of rowMatches) {
    const rowInner = rowMatch[1];
    const cells = [];
    const cellMatches = rowInner.matchAll(/<c(?:\s+[^>]*)?>([\s\S]*?)<\/c>/gi);
    for (const cellMatch of cellMatches) {
      const value = cleanCellValue(cellMatch[1]);
      cells.push(value);
    }
    if (cells.some((cell) => cell !== "")) {
      rows.push(cells);
    }
  }

  return rowsToRecords(rows);
}

function parseTsvRecords(rawText) {
  const text = String(rawText || "");
  if (!text.includes("\t")) {
    return [];
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return [];
  }

  const rows = lines.map((line) => line.split("\t").map((item) => item.trim()));
  return rowsToRecords(rows);
}

function rowsToRecords(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    return [];
  }

  const header = rows[0].map((value, index) => normalizeHeader(value, index));
  const records = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row || row.length === 0) {
      continue;
    }

    const record = {};
    for (let columnIndex = 0; columnIndex < header.length; columnIndex += 1) {
      const key = header[columnIndex];
      record[key] = row[columnIndex] ?? "";
    }

    if (Object.values(record).some((value) => String(value).trim() !== "")) {
      records.push(record);
    }
  }

  return records;
}

function normalizeHeader(value, index) {
  const cleaned = cleanCellValue(value);
  return cleaned || `column_${index + 1}`;
}

function cleanCellValue(value) {
  const text = String(value || "");
  const withoutTags = text.replace(/<[^>]+>/g, " ");
  const decoded = xmlDecode(withoutTags);
  return decoded.replace(/\s+/g, " ").trim();
}

function xmlDecode(value) {
  return String(value || "")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractProviderMessage(rawText) {
  const text = String(rawText || "");
  const patterns = [
    /<message[^>]*>([\s\S]*?)<\/message>/i,
    /<error-message[^>]*>([\s\S]*?)<\/error-message>/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }
    const cleaned = cleanCellValue(match[1]);
    if (cleaned) {
      return cleaned;
    }
  }

  return "";
}

function normalizeWonderRow({ row, template, selectedYear }) {
  const measureName = template.label;
  const valueCandidate = extractNumericValue(row, template.measurePriorityKeys);
  const year = parseYear(firstPresentValue(row, ["Year"])) || selectedYear;
  const geographyName = firstPresentValue(row, ["Location", "State", "County", "Residence"]) || "United States";

  return {
    source: "cdc_wonder",
    vintage_year: year,
    data_year: year,
    geography_type: "national",
    geography_name: geographyName,
    state_fips: null,
    county_fips: null,
    measure_name: measureName,
    measure_id: template.id,
    value: valueCandidate?.value ?? null,
    unit: inferUnit(valueCandidate?.key),
    lower_ci: toNumber(firstPresentValue(row, ["Lower 95% Confidence Limit", "Lower CI"])),
    upper_ci: toNumber(firstPresentValue(row, ["Upper 95% Confidence Limit", "Upper CI"])),
    notes: summarizeRow(row)
  };
}

function extractNumericValue(row, preferredKeys) {
  for (const key of preferredKeys || []) {
    const rawValue = firstPresentValue(row, [key]);
    const parsed = toNumber(rawValue);
    if (parsed !== null) {
      return { key, value: parsed };
    }
  }

  for (const [key, rawValue] of Object.entries(row || {})) {
    if (normalizeText(key).includes("year")) {
      continue;
    }
    const parsed = toNumber(rawValue);
    if (parsed !== null) {
      return { key, value: parsed };
    }
  }

  return null;
}

function inferUnit(key) {
  const normalized = normalizeText(key);
  if (!normalized) {
    return null;
  }
  if (normalized.includes("rate")) {
    return "rate";
  }
  if (normalized.includes("percent") || normalized.includes("%")) {
    return "percent";
  }
  if (normalized.includes("birth") || normalized.includes("death") || normalized.includes("count")) {
    return "count";
  }
  return null;
}

function summarizeRow(row) {
  const entries = Object.entries(row || {});
  const trimmed = entries.slice(0, 8).map(([key, value]) => `${key}=${String(value).slice(0, 80)}`);
  return trimmed.join("; ");
}

function firstPresentValue(row, keys) {
  for (const key of keys) {
    const direct = row?.[key];
    if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
      return String(direct).trim();
    }
  }

  for (const [key, value] of Object.entries(row || {})) {
    if (value === undefined || value === null || String(value).trim() === "") {
      continue;
    }
    const normalizedKey = normalizeText(key);
    const matched = keys.some((candidate) => normalizeText(candidate) === normalizedKey);
    if (matched) {
      return String(value).trim();
    }
  }

  return null;
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function createExtractorError(message, statusCode = 500, details = null) {
  const error = new Error(message);
  error.name = "ExtractorError";
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
