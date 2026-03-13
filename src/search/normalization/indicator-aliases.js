export const INDICATOR_ALIAS_RULES = Object.freeze([
  Object.freeze({
    id: "chronic_absenteeism",
    triggerPhrases: Object.freeze([
      "chronic absent",
      "chronic absence",
      "absent rate",
      "school absence"
    ]),
    expansionPhrases: Object.freeze([
      "chronic absenteeism",
      "school attendance"
    ])
  }),
  Object.freeze({
    id: "uninsured",
    triggerPhrases: Object.freeze([
      "uninsured",
      "uninsured rate",
      "no health insurance"
    ]),
    expansionPhrases: Object.freeze([
      "health insurance coverage"
    ])
  }),
  Object.freeze({
    id: "incarceration",
    triggerPhrases: Object.freeze([
      "incarceration",
      "incarcerated",
      "jail",
      "prison"
    ]),
    expansionPhrases: Object.freeze([
      "corrections",
      "justice system"
    ])
  }),
  Object.freeze({
    id: "food_insecurity",
    triggerPhrases: Object.freeze([
      "food insecurity",
      "food insecure",
      "food desert",
      "low food access",
      "food access"
    ]),
    expansionPhrases: Object.freeze([
      "nutrition access",
      "limited access to healthy foods",
      "food environment index"
    ])
  }),
  Object.freeze({
    id: "housing_affordability",
    triggerPhrases: Object.freeze([
      "affordable housing",
      "housing cost burden",
      "severe housing cost burden",
      "rent burden",
      "housing affordability"
    ]),
    expansionPhrases: Object.freeze([
      "severe housing cost burden",
      "severe housing problems"
    ])
  }),
  Object.freeze({
    id: "broadband_access",
    triggerPhrases: Object.freeze([
      "broadband access",
      "internet access",
      "internet subscription",
      "digital divide"
    ]),
    expansionPhrases: Object.freeze([
      "broadband",
      "internet subscription"
    ])
  }),
  Object.freeze({
    id: "substance_use",
    triggerPhrases: Object.freeze([
      "substance abuse",
      "substance misuse",
      "drug abuse",
      "addiction",
      "opioid overdose",
      "drug overdose",
      "excessive drinking"
    ]),
    expansionPhrases: Object.freeze([
      "drug overdose deaths",
      "alcohol and drug use",
      "behavioral health"
    ])
  }),
  Object.freeze({
    id: "behavioral_health",
    triggerPhrases: Object.freeze([
      "behavioral health",
      "mental health",
      "behavioral health providers",
      "mental health providers"
    ]),
    expansionPhrases: Object.freeze([
      "mental health providers",
      "behavioral health providers"
    ])
  }),
  Object.freeze({
    id: "adult_smoking",
    triggerPhrases: Object.freeze([
      "adult smoking",
      "current smokers",
      "smoking",
      "tobacco use"
    ]),
    expansionPhrases: Object.freeze([
      "adult smoking",
      "tobacco"
    ])
  }),
  Object.freeze({
    id: "air_quality",
    triggerPhrases: Object.freeze([
      "air quality",
      "air pollution",
      "pm2.5",
      "particulate matter"
    ]),
    expansionPhrases: Object.freeze([
      "air pollution particulate matter",
      "environmental public health tracking"
    ])
  }),
  Object.freeze({
    id: "child_care",
    triggerPhrases: Object.freeze([
      "child care",
      "child care centers",
      "day care",
      "daycare",
      "head start"
    ]),
    expansionPhrases: Object.freeze([
      "child care centers",
      "early care and education"
    ])
  }),
  Object.freeze({
    id: "life_expectancy",
    triggerPhrases: Object.freeze([
      "life expectancy"
    ]),
    expansionPhrases: Object.freeze([
      "mortality"
    ])
  }),
  Object.freeze({
    id: "opportunity_atlas",
    triggerPhrases: Object.freeze([
      "opportunity atlas",
      "income mobility",
      "social mobility"
    ]),
    expansionPhrases: Object.freeze([
      "opportunity insights"
    ])
  })
]);
