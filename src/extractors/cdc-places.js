import { normalizeText, resolveHost, hostMatches } from "./helpers.js";
import { resolveStateAbbr } from "./state-fips.js";

const CDC_PLACES_TERMS_URL = "https://dev.socrata.com/foundry/data.cdc.gov/fu4u-a9bh";
const DEFAULT_DATASET_ID = "fu4u-a9bh";

export const cdcPlacesExtractor = Object.freeze({
  id: "cdc_places",
  label: "CDC PLACES (Socrata)",
  method: "api",
  description: "County-level PLACES indicators via CDC Socrata API.",
  supportedDomains: Object.freeze(["cdc.gov", "data.cdc.gov"]),
  supportedOutputFormats: Object.freeze(["csv"]),
  defaultParameters: Object.freeze({
    datasetId: DEFAULT_DATASET_ID,
    geographyType: "county"
  }),
  eligibility(result) {
    const host = resolveHost(result?.url);
    const title = normalizeText(result?.title);
    const snippet = normalizeText(result?.snippet);
    const url = normalizeText(result?.url);

    if (!host) {
      return null;
    }

    const isCdc = hostMatches(host, "cdc.gov") || hostMatches(host, "data.cdc.gov");
    if (!isCdc) {
      return null;
    }

    const looksLikePlaces = title.includes("places") || snippet.includes("places") || url.includes("/fu4u-a9bh");
    if (!looksLikePlaces && !hostMatches(host, "data.cdc.gov")) {
      return null;
    }

    return {
      sourceId: this.id,
      label: this.label,
      method: this.method,
      supportedOutputFormats: [...this.supportedOutputFormats],
      defaults: this.defaultParameters
    };
  },
  async extract({ url, parameters, fetchImpl, env }) {
    const datasetId = String(parameters?.datasetId || DEFAULT_DATASET_ID).trim();
    const year = normalizeYear(parameters?.year);
    const stateAbbr = resolveStateAbbr(parameters?.state || parameters?.stateAbbr || "");
    const measureId = String(parameters?.measureId || "").trim().toUpperCase();
    const measureText = String(parameters?.measure || "").trim();
    const limit = normalizeLimit(parameters?.limit);
    const geographyType = "county";

    const endpoint = new URL(`https://data.cdc.gov/resource/${datasetId}.json`);
    endpoint.searchParams.set("$limit", String(limit));

    const filters = [];
    if (year) {
      filters.push(`year=${year}`);
    }
    if (stateAbbr) {
      filters.push(`stateabbr='${escapeSocrataValue(stateAbbr)}'`);
    }
    if (measureId) {
      filters.push(`measureid='${escapeSocrataValue(measureId)}'`);
    }
    if (measureText) {
      filters.push(`upper(measure) like upper('%${escapeSocrataLike(measureText)}%')`);
    }
    if (filters.length > 0) {
      endpoint.searchParams.set("$where", filters.join(" AND "));
    }

    const appToken = String(env?.CDC_SOCRATA_APP_TOKEN || "").trim();
    const headers = { Accept: "application/json" };
    if (appToken) {
      headers["X-App-Token"] = appToken;
    }

    const response = await fetchImpl(endpoint, { headers });
    if (!response.ok) {
      const body = (await response.text()).slice(0, 300);
      throw createExtractorError(
        `CDC PLACES API returned HTTP ${response.status}. ${body || "Request rejected."}`,
        502
      );
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      throw createExtractorError("CDC PLACES API returned no rows for the requested parameters.", 404);
    }

    const standardizedRows = payload.map((row) => normalizePlacesRow({
      row,
      sourceId: this.id,
      geographyType
    }));

    return {
      source: this.id,
      sourceUrl: url,
      method: this.method,
      parameters: {
        datasetId,
        year: year || null,
        stateAbbr: stateAbbr || null,
        geographyType,
        measureId: measureId || null,
        measure: measureText || null,
        limit
      },
      requestDetails: {
        endpoint: endpoint.origin + endpoint.pathname,
        queryString: endpoint.searchParams.toString()
      },
      licenseOrTermsUrl: CDC_PLACES_TERMS_URL,
      rows: standardizedRows
    };
  }
});

function normalizePlacesRow({ row, sourceId, geographyType }) {
  const rawYear = firstValue(row, ["year", "data_value_footnote_symbol"]);
  const value = toNumber(firstValue(row, ["data_value", "value"]));
  return {
    source: sourceId,
    vintage_year: toYearOrNull(rawYear),
    data_year: toYearOrNull(rawYear),
    geography_type: geographyType,
    geography_name: firstValue(row, ["locationname", "countyname", "county_name", "location_name"]),
    state_fips: firstValue(row, ["statefips", "state_fips"]),
    county_fips: firstValue(row, ["countyfips", "county_fips"]),
    measure_name: firstValue(row, ["measure", "short_question_text", "question"]),
    measure_id: firstValue(row, ["measureid", "measure_id"]),
    value,
    unit: firstValue(row, ["data_value_unit", "unit"]),
    lower_ci: toNumber(firstValue(row, ["low_confidence_limit", "lower_ci"])),
    upper_ci: toNumber(firstValue(row, ["high_confidence_limit", "upper_ci"])),
    notes: firstValue(row, ["data_value_footnote"])
  };
}

function firstValue(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

function normalizeYear(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const year = Math.floor(parsed);
  if (year < 2000 || year > 2100) {
    return null;
  }
  return year;
}

function toYearOrNull(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const year = Math.floor(parsed);
  if (year < 1900 || year > 2100) {
    return null;
  }
  return year;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50000;
  }
  return Math.min(Math.floor(parsed), 50000);
}

function escapeSocrataValue(value) {
  return String(value).replace(/'/g, "''");
}

function escapeSocrataLike(value) {
  return String(value).replace(/'/g, "''").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function createExtractorError(message, statusCode = 500) {
  const error = new Error(message);
  error.name = "ExtractorError";
  error.statusCode = statusCode;
  return error;
}
