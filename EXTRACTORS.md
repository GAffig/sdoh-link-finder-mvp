# Extractor Registry Spec

## Purpose

Convert a user query + chosen source into a reproducible, downloadable dataset (CSV/XLSX when supported) using official APIs or published downloads whenever available. Web scraping is last-resort only.

## Non-goals

- No scrape-anything behavior across arbitrary websites.
- No AI interpretation requirements in this phase.
- No silent/background crawling.

## Core Concepts

### 1) Source Extractor

A source-specific adapter that knows how to retrieve structured data from one platform.

Current v1 targets:

- Census (`census_acs`) via Census Data API.
- CDC PLACES (`cdc_places`) via Socrata SODA API.
- CDC WONDER (`cdc_wonder`) via template-driven requests (explicit template contract).
- TN Death Statistics (`tdh_death_stats`) via download-index extraction.

### 2) Extractor Eligibility

Each search result is checked against deterministic rules:

- match by domain and/or URL pattern
- if match -> show `Download data`
- else -> no download control

### 3) Extraction Job

A single run produces:

- output data file (CSV default; source-dependent format support)
- metadata manifest JSON (required)

## User Flow

1. User searches and gets ranked links.
2. User selects a link.
3. If an extractor supports the link, show `Download data`.
4. User picks parameters (year, geography, measure, output format where supported).
5. App runs extractor and returns:
   - downloadable data file
   - downloadable manifest JSON

## Output Standards

### Data Fields

Extractor outputs should include these columns when applicable:

- `source`
- `vintage_year`
- `data_year`
- `geography_type`
- `state_fips`
- `county_fips`
- `measure_name`
- `measure_id`
- `value`
- `unit`
- `lower_ci`
- `upper_ci`
- `notes`

### Manifest JSON (Required)

Required fields:

- `run_id`
- `run_timestamp`
- `source`
- `source_url`
- `method`
- `parameters`
- `request_details`
- `license_or_terms_url`
- `hashes` (at least `sha256` for output file)

## Source-Specific Method Notes

### A) CDC PLACES (Socrata)

- Method: API (`data.cdc.gov` SODA dataset query).
- Typical parameters: year, state, geography, measure ID/text.

### B) Census

- Method: Census Data API.
- Typical parameters: dataset (`acs5`), vintage, variables, geography filters.
- Indicator mapping should use a curated table first and expand incrementally.

### C) CDC WONDER

- Method: template-driven API requests.
- Must preserve full request template/definition for reproducibility.

### D) TN Death Statistics (TDH)

- Method: download-index extraction (catalog extraction of XLSX/PDF/CSV links).
- Not table scraping from rendered HTML.

## Caching Strategy

- Cache extraction results by `(source, parameters, output_format)` with 7-30 day TTL.
- Cache TDH-style link catalogs separately with shorter TTL (around 24h).

## Governance and Compliance

- Prefer official APIs and official bulk downloads.
- Respect provider terms and robots policies.
- Always surface provenance through a manifest.

## Extensibility Contract

New extractor additions must follow this contract:

1. Add a new module under `src/extractors/`.
2. Implement deterministic methods:
   - `eligibility(result)`
   - `extract({ url, query, parameters, outputFormat, env, fetchImpl, caches })`
3. Register it in `src/extractors/registry.js`.
4. Return standardized rows + manifest metadata fields.
5. Add at least one focused test in `tests/` for eligibility or normalization logic.

If unsure, prefer a constrained extractor that only supports explicit URLs/domains and explicit parameters.
