import { cdcPlacesExtractor } from "./cdc-places.js";
import { censusAcsExtractor } from "./census-acs.js";
import { cdcWonderExtractor } from "./cdc-wonder.js";
import { tnDeathStatsExtractor } from "./tn-death-stats.js";
import { normalizeOutputFormat, normalizeText, resolveHost } from "./helpers.js";

const EXTRACTORS = Object.freeze([
  cdcPlacesExtractor,
  censusAcsExtractor,
  cdcWonderExtractor,
  tnDeathStatsExtractor
]);

export class ExtractorError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "ExtractorError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function listExtractorCatalog() {
  return EXTRACTORS.map((extractor) => ({
    id: extractor.id,
    label: extractor.label,
    method: extractor.method,
    description: extractor.description,
    supportedDomains: [...extractor.supportedDomains],
    supportedOutputFormats: [...extractor.supportedOutputFormats],
    defaultParameters: { ...extractor.defaultParameters }
  }));
}

export function getEligibleExtractors(result) {
  const eligible = [];
  for (const extractor of EXTRACTORS) {
    const match = extractor.eligibility(result);
    if (!match) {
      continue;
    }
    eligible.push(match);
  }
  return eligible;
}

export function attachExtractorEligibility(results) {
  const safeResults = Array.isArray(results) ? results : [];
  return safeResults.map((result) => ({
    ...result,
    extractors: getEligibleExtractors(result)
  }));
}

export function buildExtractionCacheKey({ sourceId, url, outputFormat, parameters }) {
  const normalizedUrl = normalizeText(url).replace(/\s+/g, " ");
  const normalizedFormat = normalizeOutputFormat(outputFormat);
  const normalizedParams = stableStringify(parameters || {});
  return `${sourceId}|${normalizedFormat}|${normalizedUrl}|${normalizedParams}`;
}

export async function runExtractor({
  sourceId,
  url,
  query,
  outputFormat,
  parameters,
  env,
  fetchImpl,
  caches
}) {
  const extractor = EXTRACTORS.find((item) => item.id === sourceId);
  if (!extractor) {
    throw new ExtractorError(`Unknown extractor source "${sourceId}".`, 400);
  }

  const normalizedFormat = normalizeOutputFormat(outputFormat);
  if (!extractor.supportedOutputFormats.includes(normalizedFormat)) {
    throw new ExtractorError(
      `Extractor "${sourceId}" does not support format "${normalizedFormat}". Supported formats: ${extractor.supportedOutputFormats.join(", ")}.`,
      400
    );
  }

  try {
    const output = await extractor.extract({
      url,
      query,
      outputFormat: normalizedFormat,
      parameters: parameters || {},
      env,
      fetchImpl,
      caches
    });

    const host = resolveHost(url);
    return {
      source: output?.source || sourceId,
      sourceUrl: output?.sourceUrl || url,
      method: output?.method || extractor.method,
      parameters: output?.parameters || {},
      requestDetails: output?.requestDetails || {},
      licenseOrTermsUrl: output?.licenseOrTermsUrl || sourceId,
      rows: Array.isArray(output?.rows) ? output.rows : [],
      host,
      outputFormat: normalizedFormat
    };
  } catch (error) {
    if (error instanceof ExtractorError) {
      throw error;
    }

    const statusCode = Number(error?.statusCode || 500);
    const details = error?.details || null;
    throw new ExtractorError(error?.message || "Extractor execution failed.", statusCode, details);
  }
}

function stableStringify(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}
