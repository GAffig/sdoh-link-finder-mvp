import { resolveHost, hostMatches } from "./helpers.js";

const WONDER_TEMPLATES = Object.freeze({
  mortality_county_v1: Object.freeze({
    id: "mortality_county_v1",
    label: "Mortality by County",
    module: "Underlying Cause of Death",
    requestEndpoint: "https://wonder.cdc.gov/controller/datarequest"
  })
});

export const cdcWonderExtractor = Object.freeze({
  id: "cdc_wonder",
  label: "CDC WONDER (Template)",
  method: "api_template",
  description: "Template-driven CDC WONDER extraction with reproducible query definitions.",
  supportedDomains: Object.freeze(["wonder.cdc.gov", "cdc.gov"]),
  supportedOutputFormats: Object.freeze(["csv"]),
  defaultParameters: Object.freeze({
    templateId: "mortality_county_v1"
  }),
  eligibility(result) {
    const host = resolveHost(result?.url);
    if (!host) {
      return null;
    }

    if (!hostMatches(host, "wonder.cdc.gov") && !hostMatches(host, "cdc.gov")) {
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
  async extract({ url, parameters }) {
    const templateId = String(parameters?.templateId || "mortality_county_v1").trim();
    const template = WONDER_TEMPLATES[templateId];
    if (!template) {
      throw createExtractorError(
        `Unknown CDC WONDER template "${templateId}". Supported templates: ${Object.keys(WONDER_TEMPLATES).join(", ")}.`,
        400
      );
    }

    // WONDER templates are intentionally explicit. User must supply complete request parameters.
    throw createExtractorError(
      `CDC WONDER template "${templateId}" is configured for reproducible requests, but requires a module-specific request body. Add requestBody fields to run this extractor.`,
      501,
      {
        templateId,
        module: template.module,
        requestEndpoint: template.requestEndpoint,
        sourceUrl: url
      }
    );
  }
});

function createExtractorError(message, statusCode = 500, details = null) {
  const error = new Error(message);
  error.name = "ExtractorError";
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
