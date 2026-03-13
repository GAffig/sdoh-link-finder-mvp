import assert from "assert/strict";

import {
  normalizeSearchQuery,
  resolveQueryNormalizationDefault,
  resolveQueryNormalizationPreference
} from "../src/search/query-normalizer.js";

run();

function run() {
  testDisabledByDefault();
  testTypoAndStateNormalization();
  testIndicatorExpansion();
  testSubstanceUseExpansion();
  testAppendixIndicatorExpansion();
  testDeterministicOutput();
  testPreferenceParsing();
  console.log("query-normalizer tests passed");
}

function testDisabledByDefault() {
  const output = normalizeSearchQuery("Uninsured rate TN", { enabled: false });
  assert.equal(output.enabled, false);
  assert.equal(output.changed, false);
  assert.equal(output.normalizedQuery, "Uninsured rate TN");
  assert.equal(output.appliedRuleCount, 0);
}

function testTypoAndStateNormalization() {
  const output = normalizeSearchQuery("Chronic absent rate for both TN and VA counties", { enabled: true });
  const normalized = output.normalizedQuery;

  assert.equal(output.enabled, true);
  assert.equal(output.changed, true);
  assert.match(normalized, /\babsenteeism\b/);
  assert.match(normalized, /\btennessee\b/);
  assert.match(normalized, /\bvirginia\b/);
  assert.ok(output.appliedRuleCount >= 2);
}

function testIndicatorExpansion() {
  const output = normalizeSearchQuery("Uninsured rate by county", { enabled: true });
  const normalized = output.normalizedQuery;

  assert.match(normalized, /\buninsured\b/);
  assert.match(normalized, /\bhealth\b/);
  assert.match(normalized, /\binsurance\b/);
  assert.match(normalized, /\bcoverage\b/);
  assert.ok(output.appliedRuleTypes.includes("indicator_alias"));
}

function testSubstanceUseExpansion() {
  const output = normalizeSearchQuery("Substance abuse data for TN counties", { enabled: true });
  const normalized = output.normalizedQuery;

  assert.match(normalized, /\bsubstance\b/);
  assert.match(normalized, /\babuse\b/);
  assert.match(normalized, /\btennessee\b/);
  assert.match(normalized, /\bdrug\b/);
  assert.match(normalized, /\boverdose\b/);
  assert.match(normalized, /\bdeaths\b/);
  assert.match(normalized, /\bbehavioral\b/);
  assert.match(normalized, /\bhealth\b/);
  assert.ok(output.appliedRuleTypes.includes("indicator_alias"));
}

function testAppendixIndicatorExpansion() {
  const housing = normalizeSearchQuery("Affordable housing by county Tennessee Virginia", { enabled: true });
  assert.match(housing.normalizedQuery, /\bsevere\b/);
  assert.match(housing.normalizedQuery, /\bhousing\b/);
  assert.match(housing.normalizedQuery, /\bcost\b/);
  assert.match(housing.normalizedQuery, /\bburden\b/);

  const food = normalizeSearchQuery("Low food access by county Tennessee Virginia", { enabled: true });
  assert.match(food.normalizedQuery, /\blimited\b/);
  assert.match(food.normalizedQuery, /\bhealthy\b/);
  assert.match(food.normalizedQuery, /\bfoods\b/);

  const air = normalizeSearchQuery("Air quality pm2.5 by county Tennessee Virginia", { enabled: true });
  assert.match(air.normalizedQuery, /\bparticulate\b/);
  assert.match(air.normalizedQuery, /\bmatter\b/);
  assert.match(air.normalizedQuery, /\btracking\b/);
}

function testDeterministicOutput() {
  const first = normalizeSearchQuery("Food insecurity in TN", { enabled: true });
  const second = normalizeSearchQuery("Food insecurity in TN", { enabled: true });

  assert.equal(first.normalizedQuery, second.normalizedQuery);
  assert.deepEqual(first.appliedRuleTypes, second.appliedRuleTypes);
  assert.equal(first.appliedRuleCount, second.appliedRuleCount);
}

function testPreferenceParsing() {
  assert.equal(resolveQueryNormalizationPreference(true, false), true);
  assert.equal(resolveQueryNormalizationPreference("true", false), true);
  assert.equal(resolveQueryNormalizationPreference("false", true), false);
  assert.equal(resolveQueryNormalizationDefault({}), true);
  assert.equal(resolveQueryNormalizationDefault({ NORMALIZE_QUERY: "1" }), true);
  assert.equal(resolveQueryNormalizationDefault({ NORMALIZE_QUERY: "off" }), false);
}
