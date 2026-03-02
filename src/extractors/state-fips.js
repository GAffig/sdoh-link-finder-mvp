export const STATE_FIPS_BY_ABBR = Object.freeze({
  AL: "01",
  AK: "02",
  AZ: "04",
  AR: "05",
  CA: "06",
  CO: "08",
  CT: "09",
  DE: "10",
  DC: "11",
  FL: "12",
  GA: "13",
  HI: "15",
  ID: "16",
  IL: "17",
  IN: "18",
  IA: "19",
  KS: "20",
  KY: "21",
  LA: "22",
  ME: "23",
  MD: "24",
  MA: "25",
  MI: "26",
  MN: "27",
  MS: "28",
  MO: "29",
  MT: "30",
  NE: "31",
  NV: "32",
  NH: "33",
  NJ: "34",
  NM: "35",
  NY: "36",
  NC: "37",
  ND: "38",
  OH: "39",
  OK: "40",
  OR: "41",
  PA: "42",
  RI: "44",
  SC: "45",
  SD: "46",
  TN: "47",
  TX: "48",
  UT: "49",
  VT: "50",
  VA: "51",
  WA: "53",
  WV: "54",
  WI: "55",
  WY: "56",
  PR: "72"
});

const STATE_NAME_TO_ABBR = Object.freeze({
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "puerto rico": "PR"
});

export function resolveStateFips(candidate) {
  const normalized = String(candidate || "").trim();
  if (!normalized) {
    return "";
  }

  if (/^\d{2}$/.test(normalized)) {
    return normalized;
  }

  const upper = normalized.toUpperCase();
  if (upper in STATE_FIPS_BY_ABBR) {
    return STATE_FIPS_BY_ABBR[upper];
  }

  const lower = normalized.toLowerCase();
  if (lower in STATE_NAME_TO_ABBR) {
    const abbr = STATE_NAME_TO_ABBR[lower];
    return STATE_FIPS_BY_ABBR[abbr] || "";
  }

  return "";
}

export function resolveStateAbbr(candidate) {
  const normalized = String(candidate || "").trim();
  if (!normalized) {
    return "";
  }

  const upper = normalized.toUpperCase();
  if (upper in STATE_FIPS_BY_ABBR) {
    return upper;
  }

  const lower = normalized.toLowerCase();
  if (lower in STATE_NAME_TO_ABBR) {
    return STATE_NAME_TO_ABBR[lower];
  }

  return "";
}
