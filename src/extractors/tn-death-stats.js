import { asAbsoluteUrl, normalizeText, resolveHost, hostMatches, toRecordKey } from "./helpers.js";

const DEFAULT_TDH_INDEX_URL =
  "https://www.tn.gov/health/health-program-areas/statistics/health-data/death-statistics.html";

export const tnDeathStatsExtractor = Object.freeze({
  id: "tdh_death_stats",
  label: "TN Death Statistics (TDH Index)",
  method: "download_index",
  description: "Extracts year-section download catalogs from TDH Death Statistics pages.",
  supportedDomains: Object.freeze(["tn.gov"]),
  supportedOutputFormats: Object.freeze(["csv"]),
  defaultParameters: Object.freeze({
    mode: "catalog",
    includePdf: true
  }),
  eligibility(result) {
    const host = resolveHost(result?.url);
    if (!host || !hostMatches(host, "tn.gov")) {
      return null;
    }

    const combined = `${normalizeText(result?.title)} ${normalizeText(result?.snippet)} ${normalizeText(result?.url)}`;
    if (!combined.includes("death") && !combined.includes("mortality") && !combined.includes("statistics")) {
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
  async extract({ url, parameters, fetchImpl, caches }) {
    const indexUrl = String(parameters?.indexUrl || url || DEFAULT_TDH_INDEX_URL).trim() || DEFAULT_TDH_INDEX_URL;
    const includePdf = parseBoolean(parameters?.includePdf, true);
    const includeExcel = parseBoolean(parameters?.includeExcel, true);
    const yearFilter = parseYearFilter(parameters?.year);

    const cacheKey = buildCatalogCacheKey({ indexUrl, includePdf, includeExcel });
    const cached = getCachedCatalog(caches, cacheKey);
    let links = cached;

    if (!links) {
      const response = await fetchImpl(indexUrl, { headers: { Accept: "text/html" } });
      if (!response.ok) {
        const body = (await response.text()).slice(0, 250);
        throw createExtractorError(
          `TDH download index returned HTTP ${response.status}. ${body || "Request rejected."}`,
          502
        );
      }

      const html = await response.text();
      links = extractDownloadLinks(html, indexUrl, { includePdf, includeExcel });
      if (links.length === 0) {
        throw createExtractorError("No downloadable files were found on the TDH index page.", 404);
      }
      setCachedCatalog(caches, cacheKey, links);
    }

    const filtered = yearFilter ? links.filter((item) => item.year === yearFilter) : links;
    if (filtered.length === 0) {
      throw createExtractorError(`No TDH files found for year ${yearFilter}.`, 404);
    }

    const rows = filtered.map((item) => ({
      source: this.id,
      vintage_year: item.year || null,
      data_year: item.year || null,
      geography_type: item.geographyType || null,
      geography_name: null,
      state_fips: "47",
      county_fips: null,
      measure_name: item.section || item.label || "TDH Death Statistics File",
      measure_id: toRecordKey(item.section || item.label || "tdh_file"),
      value: null,
      unit: null,
      lower_ci: null,
      upper_ci: null,
      notes: `download_url=${item.downloadUrl}; file_type=${item.fileType}; label=${item.label || ""}`
    }));

    return {
      source: this.id,
      sourceUrl: indexUrl,
      method: this.method,
      parameters: {
        indexUrl,
        includePdf,
        includeExcel,
        year: yearFilter || null
      },
      requestDetails: {
        endpoint: indexUrl,
        queryString: ""
      },
      licenseOrTermsUrl: indexUrl,
      rows
    };
  }
});

function extractDownloadLinks(html, baseUrl, options) {
  const links = [];
  const anchorPattern = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = anchorPattern.exec(html);

  while (match) {
    const href = String(match[1] || "").trim();
    const label = stripHtml(match[2] || "").trim();
    const absoluteUrl = asAbsoluteUrl(href, baseUrl);
    const fileType = fileTypeFromUrl(absoluteUrl);
    if (!absoluteUrl || !fileType) {
      match = anchorPattern.exec(html);
      continue;
    }

    if (fileType === "pdf" && !options.includePdf) {
      match = anchorPattern.exec(html);
      continue;
    }

    if ((fileType === "xlsx" || fileType === "xls" || fileType === "csv") && !options.includeExcel) {
      match = anchorPattern.exec(html);
      continue;
    }

    const year = extractYear(label) || extractYear(absoluteUrl);
    links.push({
      label,
      section: label,
      year,
      geographyType: inferGeographyType(label),
      fileType,
      downloadUrl: absoluteUrl
    });

    match = anchorPattern.exec(html);
  }

  const unique = [];
  const seen = new Set();
  for (const item of links) {
    if (seen.has(item.downloadUrl)) {
      continue;
    }
    seen.add(item.downloadUrl);
    unique.push(item);
  }
  return unique;
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function fileTypeFromUrl(value) {
  const clean = String(value || "").split("?")[0].split("#")[0].toLowerCase();
  if (clean.endsWith(".xlsx")) {
    return "xlsx";
  }
  if (clean.endsWith(".xls")) {
    return "xls";
  }
  if (clean.endsWith(".csv")) {
    return "csv";
  }
  if (clean.endsWith(".pdf")) {
    return "pdf";
  }
  return "";
}

function extractYear(value) {
  const match = String(value || "").match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function parseYearFilter(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
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

function parseBoolean(value, fallback) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return fallback;
  }
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function inferGeographyType(label) {
  const normalized = normalizeText(label);
  if (normalized.includes("county")) {
    return "county";
  }
  if (normalized.includes("state")) {
    return "state";
  }
  return null;
}

function buildCatalogCacheKey({ indexUrl, includePdf, includeExcel }) {
  return `tdh|${indexUrl}|pdf:${includePdf ? "1" : "0"}|excel:${includeExcel ? "1" : "0"}`;
}

function getCachedCatalog(caches, key) {
  const store = caches?.linkCatalogStore;
  if (!store) {
    return null;
  }

  const cached = store.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.savedAt > Number(caches.linkCatalogTtlMs || 0)) {
    store.delete(key);
    return null;
  }

  return cached.value;
}

function setCachedCatalog(caches, key, value) {
  const store = caches?.linkCatalogStore;
  if (!store) {
    return;
  }

  store.set(key, {
    savedAt: Date.now(),
    value
  });
}

function createExtractorError(message, statusCode = 500) {
  const error = new Error(message);
  error.name = "ExtractorError";
  error.statusCode = statusCode;
  return error;
}
