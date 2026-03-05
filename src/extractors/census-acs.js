import { resolveHost, hostMatches, normalizeText } from "./helpers.js";
import { resolveStateFips } from "./state-fips.js";

const CENSUS_TERMS_URL = "https://www.census.gov/data/developers/about/terms-of-service.html";
const DEFAULT_VINTAGE = 2023;
const DEFAULT_DATASET = "acs5";

const CENSUS_MEASURE_MAP = Object.freeze({
  median_household_income: Object.freeze({
    variable: "B19013_001E",
    measureName: "Median Household Income",
    unit: "USD",
    keywords: ["median household income", "household income", "income"]
  }),
  total_population: Object.freeze({
    variable: "B01003_001E",
    measureName: "Total Population",
    unit: "people",
    keywords: ["population", "total population"]
  }),
  households: Object.freeze({
    variable: "B11001_001E",
    measureName: "Households",
    unit: "households",
    keywords: ["households", "household count"]
  }),
  poverty_population: Object.freeze({
    variable: "B17001_002E",
    measureName: "Population Below Poverty Level",
    unit: "people",
    keywords: ["poverty", "below poverty"]
  }),
  employed_population: Object.freeze({
    variable: "B23025_004E",
    measureName: "Employed Population",
    unit: "people",
    keywords: ["employed", "employment"]
  }),
  unemployed_population: Object.freeze({
    variable: "B23025_005E",
    measureName: "Unemployed Population",
    unit: "people",
    keywords: ["unemployed", "unemployment"]
  })
});

export const censusAcsExtractor = Object.freeze({
  id: "census_acs",
  label: "Census ACS API",
  method: "api",
  description: "County/state extracts via U.S. Census Data API (ACS).",
  supportedDomains: Object.freeze(["census.gov", "data.census.gov"]),
  supportedOutputFormats: Object.freeze(["csv", "xlsx"]),
  defaultParameters: Object.freeze({
    dataset: DEFAULT_DATASET,
    vintage: DEFAULT_VINTAGE,
    geographyType: "county",
    state: "47"
  }),
  eligibility(result) {
    const host = resolveHost(result?.url);
    if (!host) {
      return null;
    }

    if (!hostMatches(host, "census.gov") && !hostMatches(host, "data.census.gov")) {
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
  async extract({ url, parameters, query, env, fetchImpl }) {
    const dataset = String(parameters?.dataset || DEFAULT_DATASET).trim();
    const vintage = toSafeYear(parameters?.vintage, DEFAULT_VINTAGE);
    const geographyType = normalizeGeography(parameters?.geographyType);
    const stateFips = resolveStateFips(parameters?.state || inferStateFromQuery(query) || "47");
    const countyFips = normalizeCountyFips(parameters?.countyFips);
    const measureId = resolveCensusMeasureId({
      requested: parameters?.measureId,
      query
    });

    if (!stateFips) {
      throw createExtractorError(
        "Census extractor requires a valid state input (abbr, name, or 2-digit FIPS).",
        400
      );
    }
    if (!measureId) {
      throw createExtractorError(
        `Census extractor requires measureId. Supported: ${Object.keys(CENSUS_MEASURE_MAP).join(", ")}.`,
        400
      );
    }

    const measure = CENSUS_MEASURE_MAP[measureId];
    if (!measure) {
      throw createExtractorError(
        `Unsupported census measureId "${measureId}". Supported: ${Object.keys(CENSUS_MEASURE_MAP).join(", ")}.`,
        400
      );
    }

    const endpoint = new URL(`https://api.census.gov/data/${vintage}/acs/${dataset}`);
    endpoint.searchParams.set("get", `NAME,${measure.variable}`);

    if (geographyType === "state") {
      endpoint.searchParams.set("for", `state:${stateFips}`);
    } else if (countyFips) {
      endpoint.searchParams.set("for", `county:${countyFips}`);
      endpoint.searchParams.set("in", `state:${stateFips}`);
    } else {
      endpoint.searchParams.set("for", "county:*");
      endpoint.searchParams.set("in", `state:${stateFips}`);
    }

    const censusApiKey = String(env?.CENSUS_API_KEY || "").trim();
    if (censusApiKey) {
      endpoint.searchParams.set("key", censusApiKey);
    }

    const response = await fetchImpl(endpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      const body = (await response.text()).slice(0, 300);
      throw createExtractorError(
        `Census API returned HTTP ${response.status}. ${body || "Request rejected."}`,
        502
      );
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length < 2) {
      throw createExtractorError("Census API returned no rows for the requested parameters.", 404);
    }

    const header = payload[0];
    const rows = payload.slice(1).map((entry) => toObjectRow(header, entry));
    const standardizedRows = rows.map((row) => normalizeCensusRow({
      row,
      sourceId: this.id,
      vintage,
      geographyType,
      stateFips,
      measureId,
      measureName: measure.measureName,
      unit: measure.unit
    }));

    return {
      source: this.id,
      sourceUrl: url,
      method: this.method,
      parameters: {
        dataset,
        vintage,
        geographyType,
        state: stateFips,
        countyFips: countyFips || null,
        measureId
      },
      requestDetails: {
        endpoint: endpoint.origin + endpoint.pathname,
        queryString: endpoint.searchParams.toString()
      },
      licenseOrTermsUrl: CENSUS_TERMS_URL,
      rows: standardizedRows
    };
  }
});

function normalizeCensusRow({
  row,
  sourceId,
  vintage,
  geographyType,
  stateFips,
  measureId,
  measureName,
  unit
}) {
  const countyCode = String(row.county || "").trim();
  const stateCode = String(row.state || stateFips || "").trim();
  const rawValue = Number(row?.[CENSUS_MEASURE_MAP[measureId].variable]);
  return {
    source: sourceId,
    vintage_year: vintage,
    data_year: vintage,
    geography_type: geographyType,
    geography_name: String(row.NAME || "").trim(),
    state_fips: stateCode || stateFips,
    county_fips: countyCode || null,
    measure_name: measureName,
    measure_id: measureId,
    value: Number.isFinite(rawValue) ? rawValue : null,
    unit,
    lower_ci: null,
    upper_ci: null,
    notes: null
  };
}

function toObjectRow(header, values) {
  const row = {};
  for (let index = 0; index < header.length; index += 1) {
    row[header[index]] = values[index];
  }
  return row;
}

function normalizeCountyFips(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) {
    return "";
  }
  if (/^\d{3}$/.test(cleaned)) {
    return cleaned;
  }
  return "";
}

function normalizeGeography(value) {
  const normalized = normalizeText(value);
  if (normalized === "state") {
    return "state";
  }
  return "county";
}

function toSafeYear(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const year = Math.floor(parsed);
  if (year < 2005 || year > 2100) {
    return fallback;
  }
  return year;
}

function inferStateFromQuery(query) {
  const normalized = normalizeText(query);
  if (normalized.includes("tennessee") || /\btn\b/.test(normalized)) {
    return "47";
  }
  if (normalized.includes("virginia") || /\bva\b/.test(normalized)) {
    return "51";
  }
  return "";
}

function resolveCensusMeasureId({ requested, query }) {
  const requestedValue = normalizeText(requested);
  if (requestedValue && requestedValue in CENSUS_MEASURE_MAP) {
    return requestedValue;
  }

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return "";
  }

  for (const [measureId, measure] of Object.entries(CENSUS_MEASURE_MAP)) {
    if (measure.keywords.some((keyword) => normalizedQuery.includes(keyword))) {
      return measureId;
    }
  }

  return "";
}

function createExtractorError(message, statusCode = 500) {
  const error = new Error(message);
  error.name = "ExtractorError";
  error.statusCode = statusCode;
  return error;
}
