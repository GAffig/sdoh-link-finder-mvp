import assert from "assert/strict";

import { runSearchPipeline } from "../src/search/ranker.js";

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function run() {
  await testSubstanceUseSeedsCountyHealthRankings();
  await testFoodAccessSeedsTrustedDataPages();
  await testAirQualityBoostsTrackingPages();
  await testCountyDataPrefersDataCensusOverBroadCensus();
  console.log("ranker-substance-use tests passed");
}

async function testSubstanceUseSeedsCountyHealthRankings() {
  const observedQueries = [];
  const provider = {
    async searchWeb(query) {
      observedQueries.push(query);

      if (query.includes("site:countyhealthrankings.org") && query.includes("drug overdose deaths")) {
        return [
          {
            title: "Drug Overdose Deaths",
            url: "https://www.countyhealthrankings.org/health-data/community-conditions/health-infrastructure/health-promotion-and-harm-reduction/drug-overdose-deaths",
            snippet: "Drug overdose deaths by county in Tennessee."
          }
        ];
      }

      if (query.includes("site:countyhealthrankings.org")) {
        return [
          {
            title: "Tennessee",
            url: "https://www.countyhealthrankings.org/health-data/tennessee",
            snippet: "Tennessee county health data, including excessive drinking and drug overdose deaths."
          }
        ];
      }

      if (query.includes("site:tn.gov")) {
        return [
          {
            title: "Data Resources",
            url: "https://www.tn.gov/behavioral-health/research/data--research--and-planning/data-resources-.html",
            snippet: "Mental health and substance abuse services data resources for Tennessee."
          }
        ];
      }

      if (query.includes("site:cdc.gov")) {
        return [
          {
            title: "Provisional County Drug Overdose Deaths",
            url: "https://www.cdc.gov/nchs/nvss/vsrr/prov-county-drug-overdose.htm",
            snippet: "County drug overdose deaths for Tennessee."
          }
        ];
      }

      return [
        {
          title: "Data Resources",
          url: "https://www.tn.gov/behavioral-health/research/data--research--and-planning/data-resources-.html",
          snippet: "Mental health and substance abuse services data resources for Tennessee counties."
        },
        {
          title: "Tennessee Substance Abuse Statistics",
          url: "https://www.lakeviewhealth.com/addiction-resources/out-of-state-rehab/tennessee-substance-abuse-statistics/",
          snippet: "Addiction treatment and rehab statistics."
        },
        {
          title: "SO2 Designations TSD",
          url: "https://www.epa.gov/so2-pollution/so2-designations-tsd",
          snippet: "Tennessee counties data."
        }
      ];
    }
  };

  const output = await runSearchPipeline({
    query: "Substance abuse data for TN counties",
    provider,
    options: {
      costMode: "economy",
      maxProviderCalls: 4
    }
  });

  const domains = output.results.map((item) => item.domain);
  const countyHealthRankingsIndex = domains.findIndex((domain) => domain.includes("countyhealthrankings.org"));

  assert.ok(
    observedQueries.some((query) =>
      query.includes("drug overdose deaths") && query.includes("site:countyhealthrankings.org")
    ),
    "expected a targeted County Health Rankings seed query"
  );
  assert.ok(countyHealthRankingsIndex >= 0, "expected County Health Rankings result to be present");
  assert.ok(countyHealthRankingsIndex < 3, "expected County Health Rankings to rank in the top 3");
}

async function testCountyDataPrefersDataCensusOverBroadCensus() {
  const provider = {
    async searchWeb() {
      return [
        {
          title: "U.S. Census Bureau QuickFacts: Tennessee",
          url: "https://www.census.gov/quickfacts/TN",
          snippet: "QuickFacts for Tennessee."
        },
        {
          title: "Tennessee Income - Census Data",
          url: "https://data.census.gov/table/ACSST5Y2023.S1901?g=040XX00US47",
          snippet: "Income table for Tennessee counties."
        }
      ];
    }
  };

  const output = await runSearchPipeline({
    query: "Median household income by county Tennessee",
    provider,
    options: {
      costMode: "economy",
      maxProviderCalls: 4
    }
  });

  assert.equal(output.results[0]?.domain, "data.census.gov");
  assert.equal(output.results[1]?.domain, "census.gov");
}

async function testFoodAccessSeedsTrustedDataPages() {
  const observedQueries = [];
  const provider = {
    async searchWeb(query) {
      observedQueries.push(query);

      if (query.includes("site:countyhealthrankings.org") && query.includes("limited access to healthy foods")) {
        return [
          {
            title: "Limited Access to Healthy Foods",
            url: "https://www.countyhealthrankings.org/health-data/physical-environment/access-to-food/limited-access-to-healthy-foods",
            snippet: "County data for limited access to healthy foods."
          }
        ];
      }

      if (query.includes("site:ers.usda.gov") && query.includes("food access research atlas")) {
        return [
          {
            title: "Food Access Research Atlas",
            url: "https://www.ers.usda.gov/data-products/food-access-research-atlas/",
            snippet: "Low income and low access county data."
          }
        ];
      }

      return [
        {
          title: "Food and Nutrition",
          url: "https://www.tn.gov/humanservices/for-families/supplemental-nutrition-assistance-program-snap.html",
          snippet: "Nutrition assistance and food programs."
        },
        {
          title: "Emergency Food Assistance Program",
          url: "https://www.tn.gov/agriculture/consumers/food-assistance.html",
          snippet: "Food assistance in Tennessee."
        }
      ];
    }
  };

  const output = await runSearchPipeline({
    query: "Low food access by county Tennessee Virginia",
    provider,
    options: {
      costMode: "economy",
      maxProviderCalls: 5
    }
  });

  const topDomains = output.results.slice(0, 3).map((item) => item.domain);
  assert.ok(
    observedQueries.some((query) =>
      query.includes("limited access to healthy foods") && query.includes("site:countyhealthrankings.org")
    ),
    "expected a targeted County Health Rankings food access seed query"
  );
  assert.ok(
    observedQueries.some((query) =>
      query.includes("food access research atlas") && query.includes("site:ers.usda.gov")
    ),
    "expected a targeted ERS food access seed query"
  );
  assert.ok(
    topDomains.some((domain) => domain.includes("countyhealthrankings.org") || domain.includes("ers.usda.gov")),
    "expected a trusted food access data domain in the top 3"
  );
}

async function testAirQualityBoostsTrackingPages() {
  const observedQueries = [];
  const provider = {
    async searchWeb(query) {
      observedQueries.push(query);

      if (query.includes("site:ephtracking.cdc.gov") && query.includes("air quality")) {
        return [
          {
            title: "Environments Tracking Air Quality",
            url: "https://ephtracking.cdc.gov/DataExplorer/",
            snippet: "Air quality tracking data for counties."
          }
        ];
      }

      if (query.includes("site:countyhealthrankings.org") && query.includes("air pollution particulate matter")) {
        return [
          {
            title: "Air Pollution: Particulate Matter",
            url: "https://www.countyhealthrankings.org/health-data/physical-environment/air-and-water-quality/air-pollution-particulate-matter",
            snippet: "County particulate matter indicator."
          }
        ];
      }

      return [
        {
          title: "Air Quality",
          url: "https://www.tn.gov/environment/program-areas/apc-air-pollution-control-home.html",
          snippet: "Air quality program page."
        },
        {
          title: "Outdoor Air",
          url: "https://www.epa.gov/outdoor-air-quality-data",
          snippet: "Outdoor air quality data."
        }
      ];
    }
  };

  const output = await runSearchPipeline({
    query: "Air quality pm2.5 by county Tennessee Virginia",
    provider,
    options: {
      costMode: "economy",
      maxProviderCalls: 5
    }
  });

  assert.ok(
    observedQueries.some((query) =>
      query.includes("site:ephtracking.cdc.gov") && query.includes("air quality")
    ),
    "expected a targeted CDC tracking seed query"
  );
  assert.ok(
    output.results
      .slice(0, 2)
      .some((item) => item.domain === "ephtracking.cdc.gov" || item.domain === "countyhealthrankings.org"),
    "expected air quality data sources to rank in the top 2"
  );
}
