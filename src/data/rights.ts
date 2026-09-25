import type { Blueprint, ReuseRights } from "./intelligence-model";

/**
 * Reuse rights. Public visibility never implies permission to reuse: every
 * permission here comes from the declared rights state and license flags.
 * These are product rules, not legal advice.
 */
export type ReusePurpose = "view" | "reference" | "personal" | "commercial" | "redistribute";

export const rightsCatalogue: Record<ReuseRights, { label: string; description: string; permits: ReusePurpose[] }> = {
  "showcase-only": {
    label: "Showcase only",
    description: "Visible for learning and evaluation. No reuse of the architecture or materials is granted.",
    permits: ["view"],
  },
  "reference-architecture": {
    label: "Reference architecture",
    description: "The pattern may inform your own design. Materials, prompts and configuration are not licensed.",
    permits: ["view", "reference"],
  },
  "personal-use": {
    label: "Personal use",
    description: "Materials may be used for non-commercial, personal projects under the stated terms.",
    permits: ["view", "reference", "personal"],
  },
  "commercial-license": {
    label: "Commercial license",
    description: "Commercial use is permitted under the license terms attached to this Blueprint.",
    permits: ["view", "reference", "personal", "commercial"],
  },
  "open-source": {
    label: "Open source",
    description: "Released under the stated open-source license; obligations of that license apply.",
    permits: ["view", "reference", "personal", "commercial", "redistribute"],
  },
  "custom-license": {
    label: "Custom license",
    description: "Permissions depend on custom terms. Read them before any reuse.",
    permits: ["view", "reference"],
  },
};

export function canReuse(
  blueprint: Pick<Blueprint, "reuseRights" | "commercialUseAllowed">,
  purpose: ReusePurpose,
): { allowed: boolean | "conditional"; reason: string } {
  const rights = rightsCatalogue[blueprint.reuseRights];
  if (purpose === "commercial" && blueprint.reuseRights !== "custom-license" && !blueprint.commercialUseAllowed)
    return { allowed: false, reason: `${rights.label}: commercial use is not granted.` };
  if (blueprint.reuseRights === "custom-license" && purpose !== "view")
    return { allowed: "conditional", reason: "Custom license: permission depends on the attached terms." };
  return rights.permits.includes(purpose)
    ? { allowed: true, reason: `${rights.label} permits ${purpose} use.` }
    : { allowed: false, reason: `${rights.label} does not permit ${purpose} use.` };
}

export interface PublicationGate {
  ready: boolean;
  missing: string[];
}

/** Blueprint publication requires sanitization confirmation, a rights declaration and moderation. */
export function blueprintPublicationGate(blueprint: Blueprint): PublicationGate {
  const missing = [
    ...(!blueprint.sanitizationConfirmedAt ? ["Publisher has not confirmed the sanitization checklist."] : []),
    ...(!blueprint.rightsDeclaredAt ? ["Rights and license have not been declared."] : []),
    ...(blueprint.moderationState !== "approved" ? [`Moderation state is ${blueprint.moderationState}.`] : []),
  ];
  return { ready: missing.length === 0, missing };
}
