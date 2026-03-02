import { createHash } from "crypto";

export function rowsToCsvBuffer(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const columns = collectColumns(safeRows);
  const lines = [columns.map(escapeCsvCell).join(",")];

  for (const row of safeRows) {
    lines.push(columns.map((column) => escapeCsvCell(row?.[column])).join(","));
  }

  return Buffer.from(lines.join("\n"), "utf8");
}

export function collectColumns(rows) {
  const columns = [];
  const seen = new Set();

  for (const row of rows) {
    const entries = Object.keys(row || {});
    for (const key of entries) {
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      columns.push(key);
    }
  }

  return columns;
}

export function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function parseYear(value) {
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

export function normalizeOutputFormat(value) {
  const normalized = normalizeText(value);
  if (normalized === "xlsx") {
    return "xlsx";
  }
  return "csv";
}

export function toRecordKey(value) {
  const normalized = normalizeText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "unknown";
}

export function buildQueryString(params) {
  const urlParams = new URLSearchParams();
  const entries = Object.entries(params || {});
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    urlParams.set(key, String(value));
  }
  return urlParams.toString();
}

export function resolveHost(candidateUrl) {
  try {
    return new URL(candidateUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function hostMatches(hostname, expectedHost) {
  return hostname === expectedHost || hostname.endsWith(`.${expectedHost}`);
}

export function asAbsoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}

function escapeCsvCell(value) {
  if (value === undefined || value === null) {
    return "";
  }

  const text = String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, "\"\"")}"`;
}
