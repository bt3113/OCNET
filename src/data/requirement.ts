import { z } from "zod";
import type {
  RequirementField,
  RequirementProfile,
  RequirementStrength,
} from "./intelligence-model";
import type { Product } from "./model";
import { resolveBusinessType, sizeBands } from "./taxonomy";

/**
 * RequirementProfile normalization. Free text is OPTIONAL input convenience: a
 * deterministic rule parser proposes values, every proposed value is tagged as
 * INFERRED, and the user confirms or corrects it before compilation. No model call
 * is involved, and nothing here decides feasibility.
 */

export const requirementProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(160),
  ownerId: z.string(),
  objective: z.string().min(3).max(2000),
  useCaseId: z.string().optional(),
  industry: z.string().max(120),
  businessType: z.string().max(120),
  organizationSizeBand: z.string().max(60),
  region: z.string().max(80),
  locations: z.number().int().min(1).max(100000).nullable(),
  monthlyVolume: z.number().int().min(0).max(100000000).nullable(),
  currentSystems: z.array(z.string().max(80)).max(40),
  budgetMin: z.number().min(0).nullable(),
  budgetMax: z.number().min(0).nullable(),
  ongoingBudgetMax: z.number().min(0).nullable().optional(),
  currency: z.string().length(3),
  timeline: z.string().max(80),
  technicalCapability: z.enum(["none", "basic", "intermediate", "advanced"]),
  mustKeepSystems: z.array(z.string().max(80)).max(40),
  requiredIntegrations: z.array(z.string().max(80)).max(40),
  dataSensitivity: z.enum(["low", "medium", "high"]),
  complianceRequirements: z.array(z.string().max(120)).max(20),
  deploymentPreference: z.string().max(40),
  automationLevel: z.string().max(80),
  humanApprovalRequired: z.boolean(),
  maintenanceTolerance: z.enum(["low", "medium", "high"]),
  dataResidency: z.string().max(40).optional(),
  commercialReuseRequired: z.boolean().optional(),
  strengths: z.record(z.string(), z.enum(["hard", "soft", "informational"])).optional(),
  inferredFields: z.array(z.string()).optional(),
  constraints: z.array(z.any()),
  provenance: z.string(),
}).refine((value) => value.budgetMin == null || value.budgetMax == null || value.budgetMin <= value.budgetMax, {
  message: "Minimum budget cannot exceed maximum budget.",
  path: ["budgetMin"],
});

export function validateProfile(profile: RequirementProfile) {
  const result = requirementProfileSchema.safeParse(profile);
  return result.success
    ? { ok: true as const, errors: [] as string[] }
    : { ok: false as const, errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
}

export const fieldLabels: Record<RequirementField, string> = {
  useCaseId: "Objective",
  industry: "Industry",
  businessType: "Business",
  organizationSizeBand: "Size",
  region: "Region",
  locations: "Locations",
  monthlyVolume: "Monthly volume",
  currentSystems: "Current systems",
  budgetMax: "Setup budget",
  ongoingBudgetMax: "Monthly budget",
  timeline: "Timeline",
  technicalCapability: "Technical team",
  mustKeepSystems: "Must keep",
  requiredIntegrations: "Must integrate with",
  dataSensitivity: "Data sensitivity",
  complianceRequirements: "Compliance",
  deploymentPreference: "Deployment",
  automationLevel: "Automation level",
  humanApprovalRequired: "Human approval",
  maintenanceTolerance: "Maintenance tolerance",
  dataResidency: "Data residency",
  commercialReuseRequired: "Commercial reuse",
};

/** Default strength per field; users can change every one before compiling. */
export const defaultStrengths: Partial<Record<RequirementField, RequirementStrength>> = {
  useCaseId: "hard",
  mustKeepSystems: "hard",
  requiredIntegrations: "hard",
  humanApprovalRequired: "hard",
  dataResidency: "hard",
  commercialReuseRequired: "hard",
  budgetMax: "soft",
  ongoingBudgetMax: "soft",
  maintenanceTolerance: "soft",
  technicalCapability: "soft",
  region: "soft",
  deploymentPreference: "soft",
};

export function strengthOf(profile: RequirementProfile, field: RequirementField): RequirementStrength {
  return profile.strengths?.[field] ?? defaultStrengths[field] ?? "informational";
}

const numberWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, twenty: 20,
};

function parseAmount(raw: string) {
  const value = Number(raw.replace(/[,£$€\s]/g, "").replace(/k$/i, ""));
  return /k$/i.test(raw.trim()) ? value * 1000 : value;
}

export interface ParsedIntent {
  values: Partial<RequirementProfile>;
  inferredFields: RequirementField[];
}

/**
 * Deterministic rule-based extraction. Returns only what the text states or
 * strongly implies; everything returned is marked inferred.
 */
export function parseIntent(intent: string, products: Pick<Product, "id" | "name">[] = []): ParsedIntent {
  const text = ` ${intent.toLowerCase()} `;
  const values: Partial<RequirementProfile> = {};
  const inferred = new Set<RequirementField>();
  const set = <K extends RequirementField>(field: K, value: RequirementProfile[K]) => {
    (values as Record<string, unknown>)[field] = value;
    inferred.add(field);
  };
  const setBudgetMin = (value: number) => {
    values.budgetMin = value;
    inferred.add("budgetMax");
  };

  if (/(missed call|enquir|inquir|lead|booked|booking|appointment|callback|call back)/.test(text))
    set("useCaseId", /(qualif|lead)/.test(text) && !/(book|appointment)/.test(text) ? "lead-qualification-routing" : "enquiry-to-booking");
  if (/(reservation|table booking|after-hours reservation)/.test(text)) set("useCaseId", "after-hours-reservations");

  const business = resolveBusinessType(text);
  if (business) {
    set("businessType", business.label);
    set("industry", business.code.startsWith("hospitality") ? "Hospitality" : "Business services");
  }

  const locationMatch = text.match(/\b(\d{1,4}|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty)\s+(branches|locations|sites|offices|stores|salons|studios|venues|restaurants|depots)\b/);
  if (locationMatch) set("locations", numberWords[locationMatch[1]] ?? Number(locationMatch[1]));
  else if (/\b(single|one) (site|location|branch)\b/.test(text)) set("locations", 1);

  const volumeMatch = text.match(/([\d,]{2,7})\s*(?:\+\s*)?(?:inbound\s+)?(enquiries|inquiries|leads|calls|bookings|requests)\s*(?:a|per|\/)\s*month/);
  if (volumeMatch) set("monthlyVolume", Number(volumeMatch[1].replace(/,/g, "")));

  const aliases = (product: Pick<Product, "id" | "name">) =>
    [...new Set([product.name, product.id.replace(/-/g, " "), product.name.replace(/\s+(crm|api|sites|hosting)$/i, "")])]
      .map((alias) => alias.toLowerCase())
      .filter((alias) => alias.length > 2);
  const known = products
    .filter((product) => aliases(product).some((alias) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text)))
    .map((product) => product.name);
  const generic = [
    ...(/\b(phone|calls?)\b/.test(text) ? ["Phone"] : []),
    ...(/\b(website|web form|web enquir)/.test(text) ? ["Website form"] : []),
    ...(/\bemail\b/.test(text) ? ["Email"] : []),
    ...(/\bwhatsapp\b/.test(text) ? ["WhatsApp"] : []),
  ];
  if (known.length || generic.length) set("currentSystems", [...new Set([...known, ...generic])]);
  if (known.length && /(we use|using|keep|stay on|already have|our crm)/.test(text)) set("mustKeepSystems", known);

  if (/(nobody (on the team )?codes|no one codes|non-?technical|no (internal )?(developers?|tech(nical)? team|it team))/.test(text))
    set("technicalCapability", "none");
  else if (/(in-house developer|our developer|engineering team)/.test(text)) set("technicalCapability", "intermediate");

  if (/(human approval|human review|approve exceptions|for exceptions|staff approve|sign[- ]off)/.test(text)) set("humanApprovalRequired", true);
  else if (/(fully automat|no human)/.test(text)) set("humanApprovalRequired", false);

  const budgetRange = text.match(/£\s?([\d,.]+k?)\s*(?:–|-|to)\s*£?\s?([\d,.]+k?)/);
  const budgetCeiling = text.match(/(?:under|below|up to|max(?:imum)?|budget of)\s*£\s?([\d,.]+k?)/);
  if (budgetRange) {
    setBudgetMin(parseAmount(budgetRange[1]));
    set("budgetMax", parseAmount(budgetRange[2]));
  } else if (budgetCeiling) set("budgetMax", parseAmount(budgetCeiling[1]));

  if (/\b(uk|united kingdom|london|manchester|birmingham|leeds|glasgow|bristol|england|scotland|wales)\b/.test(text)) set("region", "United Kingdom");
  else if (/\b(eu|europe|germany|france|ireland|spain|netherlands)\b/.test(text)) set("region", "Europe");
  else if (/\b(usa|u\.s\.|united states|canada|north america)\b/.test(text)) set("region", "North America");

  if (/(gdpr|data protection)/.test(text)) set("complianceRequirements", ["Data protection (GDPR/UK GDPR)"]);
  if (/(data must stay in the uk|uk data residency|uk-hosted)/.test(text)) set("dataResidency", "UK");
  else if (/(eu data residency|data must stay in the eu|eu-hosted)/.test(text)) set("dataResidency", "EU");

  if (/(self-hosted|on-prem)/.test(text)) set("deploymentPreference", "Self-hosted");

  const employees = text.match(/(\d{1,5})\s+(staff|employees|people)/);
  if (employees) {
    const count = Number(employees[1]);
    set("organizationSizeBand", count <= 10 ? sizeBands[0] : count <= 50 ? sizeBands[1] : count <= 200 ? sizeBands[2] : sizeBands[3]);
  }

  return { values, inferredFields: [...inferred] };
}

export function emptyProfile(ownerId: string, id: string): RequirementProfile {
  return {
    id,
    name: "Business outcome requirement",
    ownerId,
    objective: "",
    useCaseId: undefined,
    industry: "",
    businessType: "",
    organizationSizeBand: "",
    region: "",
    locations: null,
    monthlyVolume: null,
    currentSystems: [],
    budgetMin: null,
    budgetMax: null,
    ongoingBudgetMax: null,
    currency: "GBP",
    timeline: "",
    technicalCapability: "basic",
    mustKeepSystems: [],
    requiredIntegrations: [],
    dataSensitivity: "medium",
    complianceRequirements: [],
    deploymentPreference: "Cloud",
    automationLevel: "Assisted automation",
    humanApprovalRequired: false,
    maintenanceTolerance: "medium",
    constraints: [],
    strengths: {},
    inferredFields: [],
    provenance: "community supplied",
  };
}

/** Build an editable profile from free text. Unstated fields keep neutral defaults and are NOT marked inferred. */
export function profileFromIntent(
  intent: string,
  ownerId: string,
  id: string,
  products: Pick<Product, "id" | "name">[] = [],
): RequirementProfile {
  const parsed = parseIntent(intent, products);
  const base = emptyProfile(ownerId, id);
  const name = intent.trim().replace(/\s+/g, " ").slice(0, 80) || base.name;
  return {
    ...base,
    ...parsed.values,
    name,
    objective: intent.trim(),
    inferredFields: parsed.inferredFields,
    strengths: {},
  };
}

export function confirmField(profile: RequirementProfile, field: RequirementField): RequirementProfile {
  return { ...profile, inferredFields: (profile.inferredFields ?? []).filter((value) => value !== field) };
}
