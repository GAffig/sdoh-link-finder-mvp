import assert from "assert/strict";

import {
  attachExtractorEligibility,
  buildExtractionCacheKey,
  getEligibleExtractors,
  listExtractorCatalog
} from "../src/extractors/registry.js";

run();

function run() {
  testCatalogIncludesExpectedSources();
  testEligibilityByDomain();
  testEligibilityAttachment();
  testCacheKeyDeterministic();
  console.log("extractors-registry tests passed");
}

function testCatalogIncludesExpectedSources() {
  const catalog = listExtractorCatalog();
  const ids = catalog.map((item) => item.id);

  assert.ok(ids.includes("cdc_places"));
  assert.ok(ids.includes("census_acs"));
  assert.ok(ids.includes("cdc_wonder"));
  assert.ok(ids.includes("tdh_death_stats"));
}

function testEligibilityByDomain() {
  const census = getEligibleExtractors({ url: "https://data.census.gov/table/..." });
  assert.ok(census.some((item) => item.sourceId === "census_acs"));

  const places = getEligibleExtractors({ url: "https://data.cdc.gov/resource/fu4u-a9bh" });
  assert.ok(places.some((item) => item.sourceId === "cdc_places"));

  const wonder = getEligibleExtractors({ url: "https://wonder.cdc.gov/" });
  assert.ok(wonder.some((item) => item.sourceId === "cdc_wonder"));

  const tdh = getEligibleExtractors({
    url: "https://www.tn.gov/health/health-program-areas/statistics/health-data/death-statistics.html",
    title: "Tennessee Death Statistics"
  });
  assert.ok(tdh.some((item) => item.sourceId === "tdh_death_stats"));
}

function testEligibilityAttachment() {
  const rows = attachExtractorEligibility([
    { title: "Census", url: "https://data.census.gov/table/abc", snippet: "income" },
    { title: "Unknown", url: "https://example.com", snippet: "misc" }
  ]);

  assert.equal(rows.length, 2);
  assert.ok(Array.isArray(rows[0].extractors));
  assert.ok(rows[0].extractors.length >= 1);
  assert.equal(rows[1].extractors.length, 0);
}

function testCacheKeyDeterministic() {
  const left = buildExtractionCacheKey({
    sourceId: "census_acs",
    url: "https://data.census.gov/table/abc",
    outputFormat: "csv",
    parameters: { state: "47", year: 2023, measureId: "median_household_income" }
  });
  const right = buildExtractionCacheKey({
    sourceId: "census_acs",
    url: "https://data.census.gov/table/abc",
    outputFormat: "csv",
    parameters: { measureId: "median_household_income", year: 2023, state: "47" }
  });

  assert.equal(left, right);
}
