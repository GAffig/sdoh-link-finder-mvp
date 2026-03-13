import { PRIORITY_DOMAINS } from "./providers.js";

const DEFAULT_SEARCH_COST_MODE = "economy";
const SEARCH_COST_MODES = {
  economy: {
    mode: "economy",
    maxProviderCalls: 4,
    maxTopicSeedCalls: 2,
    maxTopicSeedDomainsPerRule: 2,
    topicSeedResultCount: 10,
    maxDataCensusSeedCalls: 1,
    dataCensusSeedResultCount: 8,
    stageADomainBatchSize: 6,
    stageABatchLimit: 2,
    stageABatchResultCount: 12,
    stageADomainResultCount: 8,
    allowStageADomainFallbackOn422: false,
    stageABufferLimit: 16,
    stageAMaxResultsPerDomain: 2,
    maxPriorityResults: 8,
    minStageADiverseDomains: 3,
    minGoodResults: 8,
    fallbackResultCount: 20,
    targetResultCount: 10,
    absoluteMaxResults: 12,
    maxResultsPerDomain: 2
  },
  standard: {
    mode: "standard",
    maxProviderCalls: 8,
    maxTopicSeedCalls: 6,
    maxTopicSeedDomainsPerRule: 3,
    topicSeedResultCount: 12,
    maxDataCensusSeedCalls: 2,
    dataCensusSeedResultCount: 12,
    stageADomainBatchSize: 4,
    stageABatchLimit: 6,
    stageABatchResultCount: 20,
    stageADomainResultCount: 10,
    allowStageADomainFallbackOn422: true,
    stageABufferLimit: 24,
    stageAMaxResultsPerDomain: 3,
    maxPriorityResults: 10,
    minStageADiverseDomains: 4,
    minGoodResults: 8,
    fallbackResultCount: 50,
    targetResultCount: 12,
    absoluteMaxResults: 15,
    maxResultsPerDomain: 3
  }
};

const DATA_CENSUS_HOST = "data.census.gov";
const CENSUS_HOST = "census.gov";
const DATA_CENSUS_BONUS = 160;
const DATA_CENSUS_INTENT_BONUS = 220;
const BROAD_CENSUS_DATA_INTENT_PENALTY = 130;
const DATA_ASSET_HINT_BONUS = 90;
const DATA_FILE_EXTENSION_BONUS = 140;
const DATA_MAP_HINT_BONUS = 45;
const NON_DATA_HINT_PENALTY = 45;
const PRIORITY_ASSET_QUERY_SUFFIX = "dataset table download csv xlsx";

const LOCATION_SIGNAL_BONUS = 70;
const MISSING_LOCATION_SIGNAL_PENALTY = 90;
const COUNTY_SIGNAL_BONUS = 55;
const MISSING_COUNTY_SIGNAL_PENALTY = 120;
const CENSUS_WHEN_TOPIC_PENALTY = 190;
const TOPIC_PHRASE_TITLE_BONUS = 72;
const TOPIC_PHRASE_SNIPPET_BONUS = 36;
const TOPIC_PHRASE_URL_BONUS = 24;

const DATA_ASSET_HINTS = [
  "table",
  "tables",
  "dataset",
  "datasets",
  "data",
  "download",
  "indicator",
  "csv",
  "xls",
  "xlsx",
  "api",
  "open data",
  "microdata",
  "shapefile",
  "geojson",
  "map",
  "gis"
];

const DATA_FILE_EXTENSIONS = [
  ".csv",
  ".xls",
  ".xlsx",
  ".zip",
  ".json",
  ".geojson",
  ".shp",
  ".gpkg",
  ".kml",
  ".kmz"
];

const DATA_MAP_HINTS = [
  "map",
  "arcgis",
  "geoplatform",
  "atlas",
  "hifld",
  "gis"
];

const NON_DATA_HINTS = [
  "news",
  "press release",
  "blog",
  "about",
  "careers",
  "privacy",
  "terms",
  "contact us",
  "rehab",
  "rehabs",
  "detox",
  "treatment center",
  "recovery center",
  "addiction treatment"
];

const LOW_SIGNAL_TERMS = new Set([
  "for",
  "both",
  "and",
  "or",
  "the",
  "to",
  "of",
  "in",
  "by",
  "with",
  "rate",
  "rates",
  "county",
  "counties",
  "data",
  "map",
  "maps",
  "table",
  "tables"
]);

const LOCATION_SIGNAL_GROUPS = [
  { id: "tn", aliases: ["tn", "tennessee"] },
  { id: "va", aliases: ["va", "virginia"] }
];

const TOPIC_DOMAIN_BOOST_RULES = [
  {
    triggerTerms: ["absent", "absence", "attendance", "chronic"],
    domains: ["nces.ed.gov", "tn.gov", "vdh.virginia.gov"],
    bonus: 420
  },
  {
    triggerTerms: ["incarceration", "incarcerated", "jail", "prison", "offender"],
    domains: ["ucr.fbi.gov", "urban.org", "tn.gov"],
    bonus: 430
  },
  {
    triggerTerms: ["drought", "dry", "water"],
    domains: ["droughtmonitor.unl.edu", "epa.gov", "tn.gov"],
    bonus: 460
  },
  {
    triggerTerms: ["opportunity", "mobility", "atlas"],
    domains: ["opportunityinsights.org"],
    bonus: 560
  },
  {
    triggerTerms: ["medicaid", "medicare", "chip"],
    domains: ["cms.gov", "tn.gov", "hhs.gov", "acf.hhs.gov"],
    bonus: 430
  },
  {
    triggerTerms: ["food", "desert", "insecurity"],
    triggerPhrases: ["low food access", "food access", "food environment"],
    seedPhrases: ["limited access to healthy foods", "food environment index"],
    domainSeedPhrases: {
      "ers.usda.gov": ["food access research atlas"]
    },
    domains: ["countyhealthrankings.org", "ers.usda.gov", "feedingamerica.org"],
    bonus: 430
  },
  {
    triggerPhrases: ["affordable housing", "housing cost burden", "severe housing cost burden", "rent burden"],
    seedPhrases: ["severe housing cost burden", "severe housing problems"],
    domains: [DATA_CENSUS_HOST, "countyhealthrankings.org", "hud.gov", "cnt.org"],
    bonus: 450
  },
  {
    triggerPhrases: ["broadband access", "internet access", "internet subscription", "digital divide"],
    seedPhrases: ["broadband access", "internet subscription"],
    domainSeedPhrases: {
      "broadbandmap.fcc.gov": ["fcc national broadband map"]
    },
    domains: ["countyhealthrankings.org", DATA_CENSUS_HOST, "broadbandmap.fcc.gov", "ers.usda.gov"],
    bonus: 430
  },
  {
    triggerTerms: ["transit", "transportation", "commute", "mobility"],
    domains: ["transportation.gov", "cnt.org", "tn.gov"],
    bonus: 390
  },
  {
    triggerTerms: ["homeless", "homelessness", "shelter", "unsheltered"],
    domains: ["hud.gov", "tn.gov", "countyhealthrankings.org", "hhs.gov", "acf.hhs.gov"],
    bonus: 430
  },
  {
    triggerTerms: ["childcare", "daycare", "headstart", "prekindergarten"],
    triggerPhrases: ["child care", "child care centers"],
    seedPhrases: ["child care centers", "early care and education"],
    domains: ["acf.hhs.gov", "hhs.gov", "tn.gov", "countyhealthrankings.org"],
    bonus: 430
  },
  {
    triggerPhrases: ["primary care providers", "primary care physicians", "primary care"],
    seedPhrases: ["primary care physicians", "other primary care providers"],
    domains: ["countyhealthrankings.org", "cdc.gov", "healthdata.tn.gov", "cms.gov", "hhs.gov", "tn.gov"],
    bonus: 440
  },
  {
    triggerPhrases: ["behavioral health", "mental health", "behavioral health providers", "mental health providers"],
    seedPhrases: ["behavioral health providers", "mental health providers"],
    domains: ["countyhealthrankings.org", "cdc.gov", "hhs.gov", "samhsa.gov", "healthdata.tn.gov", "tn.gov"],
    bonus: 440
  },
  {
    triggerPhrases: ["substance abuse", "substance misuse", "drug abuse", "drug overdose", "opioid overdose", "excessive drinking", "alcohol and drug use"],
    seedPhrases: ["drug overdose deaths", "excessive drinking"],
    domains: ["countyhealthrankings.org", "cdc.gov", "samhsa.gov", "healthdata.tn.gov", "tn.gov", "hhs.gov"],
    bonus: 460
  },
  {
    triggerPhrases: ["substance abuse providers", "substance use providers", "addiction providers"],
    seedPhrases: ["mental health providers", "substance use treatment"],
    domains: ["countyhealthrankings.org", "samhsa.gov", "healthdata.tn.gov", "hhs.gov"],
    bonus: 430
  },
  {
    triggerPhrases: ["adult smoking", "current smokers", "smoking", "tobacco use"],
    seedPhrases: ["adult smoking", "tobacco use"],
    domains: ["countyhealthrankings.org", "healthdata.tn.gov", "cdc.gov", "hhs.gov"],
    bonus: 430
  },
  {
    triggerPhrases: ["air quality", "air pollution", "pm2.5", "particulate matter"],
    seedPhrases: ["air pollution particulate matter", "air quality"],
    domainSeedPhrases: {
      "ephtracking.cdc.gov": ["air quality"]
    },
    domains: ["countyhealthrankings.org", "ephtracking.cdc.gov", "epa.gov", "healthdata.tn.gov", "vdh.virginia.gov"],
    bonus: 440
  }
];

const CENSUS_SEED_TERMS = new Set([
  "income",
  "household",
  "poverty",
  "housing",
  "rent",
  "commute",
  "population",
  "demographic",
  "median",
  "uninsured",
  "insurance",
  "acs",
  "census"
]);

export function resolveSearchCostMode(candidate) {
  const normalized = String(candidate || "").trim().toLowerCase();
  if (normalized in SEARCH_COST_MODES) {
    return normalized;
  }
  return DEFAULT_SEARCH_COST_MODE;
}

export function getSearchCostConfig({ mode, maxProviderCalls } = {}) {
  const profile = resolveSearchCostProfile(mode);
  const limit = normalizeMaxProviderCalls(maxProviderCalls, profile.maxProviderCalls);

  return {
    mode: profile.mode,
    defaultMode: DEFAULT_SEARCH_COST_MODE,
    modeOptions: Object.keys(SEARCH_COST_MODES),
    providerRequestLimit: limit
  };
}

export async function runSearchPipeline({ query, provider, options = {} }) {
  const queryContext = buildQueryContext(query);
  const costProfile = resolveSearchCostProfile(options.costMode);
  const requestBudget = createRequestBudget(costProfile, options.maxProviderCalls);

  const seenUrls = new Set();
  const stageAPriorityResults = [];
  const stageADomainCounts = new Map();

  let topicSeedCalls = 0;
  for (const activeRule of queryContext.activeTopicRules) {
    const limitedDomains = activeRule.domains.slice(0, costProfile.maxTopicSeedDomainsPerRule);
    const domainSeedPlans = limitedDomains.map((domain) => ({
      domain,
      queries: buildTopicSeedQueries(queryContext, activeRule, domain, query)
    }));

    let seedDepth = 0;
    while (topicSeedCalls < costProfile.maxTopicSeedCalls && requestBudget.remaining > 1) {
      let executedAtDepth = false;

      for (const plan of domainSeedPlans) {
        const seedQuery = plan.queries[seedDepth];
        if (!seedQuery) {
          continue;
        }

        const domainSeedRows = await searchQueryAllow422({
          provider,
          query: seedQuery,
          count: costProfile.topicSeedResultCount,
          requestBudget
        });

        topicSeedCalls += 1;
        executedAtDepth = true;
        appendUniquePriorityRows({
          rows: domainSeedRows,
          queryContext,
          seenUrls,
          target: stageAPriorityResults,
          domainCounts: stageADomainCounts,
          maxPerDomain: 2,
          bufferLimit: costProfile.stageABufferLimit
        });

        if (topicSeedCalls >= costProfile.maxTopicSeedCalls || requestBudget.remaining <= 1) {
          break;
        }
      }

      if (!executedAtDepth) {
        break;
      }

      seedDepth += 1;
    }

    if (topicSeedCalls >= costProfile.maxTopicSeedCalls || requestBudget.remaining <= 1) {
      break;
    }
  }

  if (shouldSeedDataCensus(queryContext)) {
    let dataSeedCalls = 0;
    for (const seedQuery of buildDataCensusSeedQueries(query)) {
      if (dataSeedCalls >= costProfile.maxDataCensusSeedCalls || requestBudget.remaining <= 1) {
        break;
      }

      const seedRows = await searchQueryAllow422({
        provider,
        query: seedQuery,
        count: costProfile.dataCensusSeedResultCount,
        requestBudget
      });

      dataSeedCalls += 1;
      appendUniquePriorityRows({
        rows: seedRows,
        queryContext,
        seenUrls,
        target: stageAPriorityResults,
        domainCounts: stageADomainCounts,
        maxPerDomain: 2,
        bufferLimit: costProfile.stageABufferLimit
      });

      if (hasEnoughStageAResults(stageAPriorityResults, costProfile)) {
        break;
      }
    }
  }

  const stageABatches = chunkArray(
    PRIORITY_DOMAINS.filter((domain) => domain !== DATA_CENSUS_HOST),
    costProfile.stageADomainBatchSize
  );

  for (let index = 0; index < stageABatches.length && index < costProfile.stageABatchLimit; index += 1) {
    if (requestBudget.remaining <= 1) {
      break;
    }

    const domainBatch = stageABatches[index];
    const stageARaw = await searchPriorityBatch({
      query,
      domainBatch,
      provider,
      requestBudget,
      costProfile
    });

    appendUniquePriorityRows({
      rows: stageARaw,
      queryContext,
      seenUrls,
      target: stageAPriorityResults,
      domainCounts: stageADomainCounts,
      maxPerDomain: costProfile.stageAMaxResultsPerDomain,
      bufferLimit: costProfile.stageABufferLimit
    });

    if (hasEnoughStageAResults(stageAPriorityResults, costProfile)) {
      break;
    }
  }

  const combined = [...stageAPriorityResults];
  const shouldRunFallback = stageAPriorityResults.length < costProfile.minGoodResults;

  if (shouldRunFallback && requestBudget.remaining > 0) {
    const stageBRaw = await searchWithBudget({
      provider,
      query,
      count: costProfile.fallbackResultCount,
      requestBudget
    });

    for (const row of stageBRaw) {
      const normalized = normalizeRow(row, queryContext);
      if (!normalized) {
        continue;
      }

      if (seenUrls.has(normalized.urlKey)) {
        continue;
      }

      seenUrls.add(normalized.urlKey);
      combined.push(normalized);

      if (combined.length >= costProfile.targetResultCount * 2) {
        break;
      }
    }
  }

  const sorted = combined.sort(compareByScore);
  const balanced = limitResultsPerDomain(
    sorted,
    costProfile.maxResultsPerDomain,
    costProfile.absoluteMaxResults
  );

  return {
    results: balanced.map((item) => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      domain: item.domain,
      isPriority: item.isPriority
    })),
    metadata: {
      fallbackUsed: shouldRunFallback,
      priorityResultCount: stageAPriorityResults.length,
      totalResultCount: balanced.length,
      costMode: costProfile.mode,
      providerRequestCount: requestBudget.used,
      providerRequestLimit: requestBudget.limit,
      providerBudgetExhausted: requestBudget.exhausted
    }
  };
}

function resolveSearchCostProfile(mode) {
  return SEARCH_COST_MODES[resolveSearchCostMode(mode)];
}

function createRequestBudget(costProfile, maxProviderCalls) {
  const limit = normalizeMaxProviderCalls(maxProviderCalls, costProfile.maxProviderCalls);
  const budget = {
    limit,
    used: 0,
    exhausted: false
  };

  Object.defineProperty(budget, "remaining", {
    enumerable: true,
    configurable: false,
    get() {
      return Math.max(limit - budget.used, 0);
    }
  });

  return budget;
}

function normalizeMaxProviderCalls(candidate, fallback) {
  const parsed = Number(candidate);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

async function searchPriorityBatch({ query, domainBatch, provider, requestBudget, costProfile }) {
  const batchQuery = buildDomainBatchQuery(query, domainBatch);

  try {
    return await searchWithBudget({
      provider,
      query: batchQuery,
      count: costProfile.stageABatchResultCount,
      requestBudget
    });
  } catch (error) {
    // Some providers reject long/complex OR site filters with 422.
    if (Number(error?.statusCode) !== 422) {
      throw error;
    }
  }

  if (!costProfile.allowStageADomainFallbackOn422) {
    return [];
  }

  const merged = [];
  for (const domain of domainBatch) {
    try {
      if (requestBudget.remaining <= 1) {
        break;
      }

      const domainQuery = `${query} site:${domain}`;
      const rows = await searchWithBudget({
        provider,
        query: domainQuery,
        count: costProfile.stageADomainResultCount,
        requestBudget
      });
      merged.push(...rows);
    } catch (error) {
      if (Number(error?.statusCode) !== 422) {
        throw error;
      }
    }
  }

  return merged;
}

async function searchQueryAllow422({ provider, query, count, requestBudget }) {
  try {
    return await searchWithBudget({ provider, query, count, requestBudget });
  } catch (error) {
    if (Number(error?.statusCode) === 422) {
      return [];
    }
    throw error;
  }
}

async function searchWithBudget({ provider, query, count, requestBudget }) {
  if (requestBudget.remaining <= 0) {
    requestBudget.exhausted = true;
    return [];
  }

  requestBudget.used += 1;
  return provider.searchWeb(query, { count });
}

function normalizeRow(row, queryContext) {
  const title = String(row?.title || "").trim();
  const url = String(row?.url || "").trim();
  const snippet = String(row?.snippet || "").trim();
  const domain = extractDomain(url);

  if (!title || !url || !domain) {
    return null;
  }

  const lowerTitle = title.toLowerCase();
  const lowerSnippet = snippet.toLowerCase();
  const lowerUrl = url.toLowerCase();

  const coreCoverage = computeTermCoverage(queryContext.coreTerms, lowerTitle, lowerSnippet, lowerUrl);
  const topicCoverage = computeTermCoverage(queryContext.topicTerms, lowerTitle, lowerSnippet, lowerUrl);
  if (
    queryContext.coreTerms.length > 0 &&
    coreCoverage.uniqueMatches === 0 &&
    topicCoverage.uniqueMatches === 0
  ) {
    return null;
  }

  const isPriority = isPriorityDomain(domain);
  const score = scoreResult(
    {
      title,
      snippet,
      url,
      domain,
      isPriority,
      lowerTitle,
      lowerSnippet,
      lowerUrl
    },
    queryContext,
    coreCoverage,
    topicCoverage
  );

  return {
    title,
    url,
    snippet,
    domain,
    isPriority,
    score,
    urlKey: canonicalUrl(url)
  };
}

function appendUniquePriorityRows({
  rows,
  queryContext,
  seenUrls,
  target,
  domainCounts,
  maxPerDomain,
  bufferLimit
}) {
  for (const row of rows) {
    if (target.length >= bufferLimit) {
      break;
    }

    const normalized = normalizeRow(row, queryContext);
    if (!normalized || !normalized.isPriority) {
      continue;
    }

    if (seenUrls.has(normalized.urlKey)) {
      continue;
    }

    const currentDomainCount = domainCounts.get(normalized.domain) || 0;
    if (currentDomainCount >= maxPerDomain) {
      continue;
    }

    seenUrls.add(normalized.urlKey);
    target.push(normalized);
    domainCounts.set(normalized.domain, currentDomainCount + 1);
  }
}

function scoreResult(result, queryContext, coreCoverage, topicCoverage) {
  let score = 0;

  if (result.isPriority) {
    score += 1000;
  }

  if (matchesHost(result.domain.toLowerCase(), DATA_CENSUS_HOST)) {
    score += DATA_CENSUS_BONUS;
    if (queryContext.prefersDataCensus) {
      score += DATA_CENSUS_INTENT_BONUS;
    }
  } else if (queryContext.prefersDataCensus && matchesHost(result.domain.toLowerCase(), CENSUS_HOST)) {
    score -= BROAD_CENSUS_DATA_INTENT_PENALTY;
  }

  if (containsAnyHint(DATA_ASSET_HINTS, result.lowerUrl, result.lowerTitle, result.lowerSnippet)) {
    score += DATA_ASSET_HINT_BONUS;
  }

  if (containsAnyHint(DATA_MAP_HINTS, result.lowerUrl, result.lowerTitle, result.lowerSnippet)) {
    score += DATA_MAP_HINT_BONUS;
  }

  if (hasDataFileExtension(result.lowerUrl)) {
    score += DATA_FILE_EXTENSION_BONUS;
  }

  if (containsAnyHint(NON_DATA_HINTS, result.lowerUrl, result.lowerTitle, result.lowerSnippet)) {
    score -= NON_DATA_HINT_PENALTY;
  }

  score += coreCoverage.titleMatches * 24;
  score += coreCoverage.snippetMatches * 12;
  score += coreCoverage.urlMatches * 8;
  score += coreCoverage.uniqueMatches * 18;
  score += topicCoverage.titleMatches * 18;
  score += topicCoverage.snippetMatches * 9;
  score += topicCoverage.urlMatches * 6;
  score += topicCoverage.uniqueMatches * 14;
  score += countPhraseMatches(queryContext.topicPhrases, result.lowerTitle) * TOPIC_PHRASE_TITLE_BONUS;
  score += countPhraseMatches(queryContext.topicPhrases, result.lowerSnippet) * TOPIC_PHRASE_SNIPPET_BONUS;
  score += countPhraseMatches(queryContext.topicPhrases, result.lowerUrl) * TOPIC_PHRASE_URL_BONUS;

  for (const term of queryContext.queryTerms) {
    if (containsToken(result.lowerTitle, term)) {
      score += 8;
    }
    if (containsToken(result.lowerSnippet, term)) {
      score += 4;
    }
    if (containsToken(result.lowerUrl, term)) {
      score += 3;
    }
  }

  const locationMatches = countLocationSignalMatches(queryContext.locationSignals, result);
  if (queryContext.locationSignals.length > 0) {
    if (locationMatches === 0) {
      score -= MISSING_LOCATION_SIGNAL_PENALTY;
    } else {
      score += locationMatches * LOCATION_SIGNAL_BONUS;
    }
  }

  if (queryContext.countyRequested) {
    const countyMatches = countCountySignalMatches(result);
    if (countyMatches === 0) {
      score -= MISSING_COUNTY_SIGNAL_PENALTY;
    } else {
      score += countyMatches * COUNTY_SIGNAL_BONUS;
    }
  }

  score += getTopicDomainBoost(queryContext.activeTopicRules, result.domain);
  score += getTopicMismatchPenalty(queryContext.activeTopicRules, queryContext.queryTerms, result.domain);

  return score;
}

function compareByScore(a, b) {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  if (a.isPriority !== b.isPriority) {
    return a.isPriority ? -1 : 1;
  }

  if (a.domain !== b.domain) {
    return a.domain.localeCompare(b.domain);
  }

  return a.title.localeCompare(b.title);
}

function buildQueryContext(query) {
  const queryText = String(query || "").toLowerCase().replace(/\s+/g, " ").trim();
  const queryTerms = tokenize(query);
  const activeTopicRules = TOPIC_DOMAIN_BOOST_RULES.filter((rule) =>
    isTopicRuleActive(rule, queryText, queryTerms)
  );
  const coreTerms = queryTerms.filter((term) => !LOW_SIGNAL_TERMS.has(term));
  const locationTerms = extractLocationTerms(queryTerms);

  return {
    queryText,
    queryTerms,
    coreTerms: coreTerms.length > 0 ? coreTerms : queryTerms,
    topicTerms: extractTopicTerms(activeTopicRules),
    topicPhrases: extractTopicPhrases(activeTopicRules),
    countyRequested: queryTerms.includes("county") || queryTerms.includes("counties"),
    prefersDataCensus: shouldPreferDataCensus(queryTerms),
    locationTerms,
    locationSignals: extractLocationSignals(queryTerms),
    activeTopicRules
  };
}

function shouldSeedDataCensus(queryContext) {
  if (queryContext.activeTopicRules.length > 0 && !queryContext.queryTerms.includes("census")) {
    return false;
  }

  return queryContext.queryTerms.some((term) => CENSUS_SEED_TERMS.has(term));
}

function tokenize(value) {
  const lowerValue = value.toLowerCase();
  const tokens = lowerValue.match(/[a-z0-9]+/g) || [];
  const filtered = tokens.filter((token) => token.length > 1);
  const tokenSet = new Set(filtered);

  if (/\bchild\s+care\b/.test(lowerValue)) {
    tokenSet.add("childcare");
  }
  if (/\bhead\s+start\b/.test(lowerValue)) {
    tokenSet.add("headstart");
  }
  if (/\bpm\s*2\.?5\b/.test(lowerValue)) {
    tokenSet.add("pm2");
    tokenSet.add("pm25");
  }

  return [...tokenSet];
}

function computeTermCoverage(terms, lowerTitle, lowerSnippet, lowerUrl) {
  let titleMatches = 0;
  let snippetMatches = 0;
  let urlMatches = 0;
  let uniqueMatches = 0;

  for (const term of terms) {
    const inTitle = containsToken(lowerTitle, term);
    const inSnippet = containsToken(lowerSnippet, term);
    const inUrl = containsToken(lowerUrl, term);

    if (inTitle) {
      titleMatches += 1;
    }
    if (inSnippet) {
      snippetMatches += 1;
    }
    if (inUrl) {
      urlMatches += 1;
    }

    if (inTitle || inSnippet || inUrl) {
      uniqueMatches += 1;
    }
  }

  return { titleMatches, snippetMatches, urlMatches, uniqueMatches };
}

function extractLocationSignals(queryTerms) {
  const presentTerms = new Set(queryTerms);

  return LOCATION_SIGNAL_GROUPS.filter((group) =>
    group.aliases.some((alias) => presentTerms.has(alias))
  );
}

function extractLocationTerms(queryTerms) {
  const found = [];
  const present = new Set(queryTerms);

  for (const group of LOCATION_SIGNAL_GROUPS) {
    for (const alias of group.aliases) {
      if (present.has(alias)) {
        found.push(alias);
      }
    }
  }

  return [...new Set(found)];
}

function countLocationSignalMatches(locationSignals, result) {
  let matches = 0;

  for (const signal of locationSignals) {
    const matched = signal.aliases.some((alias) => {
      return (
        containsToken(result.lowerTitle, alias) ||
        containsToken(result.lowerSnippet, alias) ||
        containsToken(result.lowerUrl, alias) ||
        containsToken(result.domain.toLowerCase(), alias)
      );
    });

    if (matched) {
      matches += 1;
    }
  }

  return matches;
}

function countCountySignalMatches(result) {
  let matches = 0;

  if (containsToken(result.lowerTitle, "county") || containsToken(result.lowerTitle, "counties")) {
    matches += 1;
  }
  if (containsToken(result.lowerSnippet, "county") || containsToken(result.lowerSnippet, "counties")) {
    matches += 1;
  }
  if (containsToken(result.lowerUrl, "county") || containsToken(result.lowerUrl, "counties")) {
    matches += 1;
  }

  return matches;
}

function getTopicDomainBoost(activeTopicRules, domain) {
  let bonus = 0;

  for (const rule of activeTopicRules) {
    if (rule.domains.some((targetDomain) => matchesHost(domain.toLowerCase(), targetDomain))) {
      bonus += rule.bonus;
    }
  }

  return bonus;
}

function getTopicMismatchPenalty(activeTopicRules, queryTerms, domain) {
  if (activeTopicRules.length === 0) {
    return 0;
  }

  if (queryTerms.includes("census")) {
    return 0;
  }

  const lowerDomain = domain.toLowerCase();
  if (matchesHost(lowerDomain, "census.gov") || matchesHost(lowerDomain, DATA_CENSUS_HOST)) {
    return -CENSUS_WHEN_TOPIC_PENALTY;
  }

  return 0;
}

function extractDomain(candidateUrl) {
  try {
    return new URL(candidateUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function canonicalUrl(candidateUrl) {
  try {
    const parsed = new URL(candidateUrl);
    parsed.hash = "";
    if (parsed.pathname !== "/") {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    return candidateUrl;
  }
}

function isPriorityDomain(hostname) {
  return PRIORITY_DOMAINS.some((priority) => {
    const normalizedPriority = priority.toLowerCase();
    return matchesHost(hostname, normalizedPriority);
  });
}

function buildDomainBatchQuery(query, domains) {
  return `${query} ${domains.map((domain) => `site:${domain}`).join(" OR ")}`;
}

function chunkArray(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function buildDataCensusSeedQueries(query) {
  return [
    `${query} site:${DATA_CENSUS_HOST} ${PRIORITY_ASSET_QUERY_SUFFIX}`,
    `${query} site:${DATA_CENSUS_HOST}`
  ];
}

function buildTopicSeedQueries(queryContext, rule, domain, originalQuery) {
  const queries = [];
  const countyHint = queryContext.queryTerms.some((term) => term === "county" || term === "counties")
    ? "county"
    : "";
  const dataHint = queryContext.queryTerms.includes("data") ? "data" : "";
  const domainSpecificPhrases = Array.isArray(rule.domainSeedPhrases?.[domain])
    ? rule.domainSeedPhrases[domain]
    : [];

  for (const phrase of [...domainSpecificPhrases, ...(rule.seedPhrases || [])]) {
    const seedQuery = [phrase, ...queryContext.locationTerms.slice(0, 2), countyHint, dataHint, `site:${domain}`]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (seedQuery) {
      queries.push(seedQuery);
    }
  }

  const baseTerms = (rule.triggerTerms || []).slice(0, 2);
  const locationTerms = queryContext.locationTerms.slice(0, 2);
  const focusedTerms = [...baseTerms, ...locationTerms].filter(Boolean).join(" ").trim();

  if (focusedTerms) {
    queries.push(`${focusedTerms} site:${domain}`);
  }

  queries.push(`${originalQuery} site:${domain}`);

  return [...new Set(queries)];
}

function hasEnoughStageAResults(stageAPriorityResults, costProfile) {
  return (
    stageAPriorityResults.length >= costProfile.maxPriorityResults &&
    countDistinctDomains(stageAPriorityResults) >= costProfile.minStageADiverseDomains
  );
}

function countDistinctDomains(results) {
  return new Set(results.map((item) => item.domain)).size;
}

function shouldPreferDataCensus(queryTerms) {
  const dataIntentTerms = [
    "data",
    "table",
    "tables",
    "dataset",
    "datasets",
    "download",
    "income",
    "poverty",
    "housing",
    "rent",
    "commute",
    "population",
    "demographic",
    "uninsured",
    "insurance",
    "acs",
    "county",
    "counties"
  ];

  return dataIntentTerms.some((term) => queryTerms.includes(term));
}

function isTopicRuleActive(rule, queryText, queryTerms) {
  const termMatch = Array.isArray(rule.triggerTerms) &&
    rule.triggerTerms.some((term) => queryTerms.includes(term));
  const phraseMatch = Array.isArray(rule.triggerPhrases) &&
    rule.triggerPhrases.some((phrase) => containsToken(queryText, phrase));

  return termMatch || phraseMatch;
}

function extractTopicTerms(activeTopicRules) {
  const topicTerms = [];
  const seen = new Set();

  for (const rule of activeTopicRules) {
    for (const phrase of rule.seedPhrases || []) {
      for (const term of tokenize(phrase)) {
        if (LOW_SIGNAL_TERMS.has(term) || seen.has(term)) {
          continue;
        }

        seen.add(term);
        topicTerms.push(term);
      }
    }
  }

  return topicTerms;
}

function extractTopicPhrases(activeTopicRules) {
  const phrases = [];
  const seen = new Set();

  for (const rule of activeTopicRules) {
    for (const phrase of rule.seedPhrases || []) {
      const normalized = String(phrase || "").trim().toLowerCase();
      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      phrases.push(normalized);
    }
  }

  return phrases;
}

function limitResultsPerDomain(sortedResults, maxPerDomain, maxTotal) {
  const selected = [];
  const overflow = [];
  const domainCounts = new Map();

  for (const item of sortedResults) {
    const currentCount = domainCounts.get(item.domain) || 0;

    if (currentCount < maxPerDomain) {
      selected.push(item);
      domainCounts.set(item.domain, currentCount + 1);
    } else {
      overflow.push(item);
    }

    if (selected.length >= maxTotal) {
      return selected;
    }
  }

  for (const item of overflow) {
    selected.push(item);
    if (selected.length >= maxTotal) {
      break;
    }
  }

  return selected;
}

function matchesHost(hostname, priorityHost) {
  return hostname === priorityHost || hostname.endsWith(`.${priorityHost}`);
}

function containsAnyHint(hints, lowerUrl, lowerTitle, lowerSnippet) {
  for (const hint of hints) {
    if (
      containsToken(lowerUrl, hint) ||
      containsToken(lowerTitle, hint) ||
      containsToken(lowerSnippet, hint)
    ) {
      return true;
    }
  }

  return false;
}

function hasDataFileExtension(lowerUrl) {
  const cleanUrl = lowerUrl.split("?")[0].split("#")[0];
  return DATA_FILE_EXTENSIONS.some((extension) => cleanUrl.endsWith(extension));
}

function containsToken(haystack, term) {
  if (!term) {
    return false;
  }

  if (term.includes(" ")) {
    return haystack.includes(term);
  }

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`);
  return pattern.test(haystack);
}

function countPhraseMatches(phrases, haystack) {
  let matches = 0;

  for (const phrase of phrases) {
    if (phrase && containsToken(haystack, phrase)) {
      matches += 1;
    }
  }

  return matches;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
