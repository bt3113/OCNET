export type EvidenceLevel =
  | "creator-reported"
  | "customer-attested"
  | "evidence-reviewed"
  | "platform-observed"
  | "independently-audited"
  | "demo"
  | "unverified";

export type StalenessState =
  | "current"
  | "review-due"
  | "stale"
  | "archived"
  | "unknown";

export type CustomerIdentityVisibility = "public" | "anonymous" | "private";
export type TechnicalCapability = "none" | "basic" | "intermediate" | "advanced";
export type Level3 = "low" | "medium" | "high";
export type PublicationState = "draft" | "published";
export type IntelligenceModeration = "pending" | "approved" | "flagged" | "rejected";
export type ReuseRights =
  | "showcase-only"
  | "reference-architecture"
  | "personal-use"
  | "commercial-license"
  | "open-source"
  | "custom-license";

export interface IntelligenceRecord {
  id: string;
  name: string;
  provenance: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ImplementationRecord extends IntelligenceRecord {
  slug: string;
  summary: string;
  ownerId: string;
  customerDisplayName: string;
  customerIdentityVisibility: CustomerIdentityVisibility;
  industry: string;
  businessType: string;
  organizationSizeBand: string;
  employeeCountRange?: string;
  region: string;
  contextSummary: string;
  baselinePeriodStart?: string;
  baselinePeriodEnd?: string;
  measurementPeriodStart?: string;
  measurementPeriodEnd?: string;
  implementationStartDate?: string;
  goLiveDate?: string;
  implementationDuration: string;
  implementationCost: number | null;
  implementationCostCurrency: string;
  costDisclosureType: "exact" | "range" | "not-disclosed";
  ongoingMonthlyCost: number | null;
  ongoingCostDisclosureType: "exact" | "range" | "not-disclosed";
  /** Lower/upper bound when costDisclosureType is "range". */
  implementationCostLow?: number | null;
  implementationCostHigh?: number | null;
  ongoingMonthlyCostLow?: number | null;
  ongoingMonthlyCostHigh?: number | null;
  maintenanceHoursPerMonth: number | null;
  /** Operator-facing burden as recorded by the contributor. */
  maintenanceBurden?: Level3 | "unknown";
  /** What the business was trying to fix, in plain language. */
  problemStatement?: string;
  knownLimitations?: string;
  /** Category template (metric/context extension set) the record follows. */
  categoryTemplateId?: string;
  verificationState: EvidenceLevel;
  publicationState: PublicationState;
  moderationState: IntelligenceModeration;
  visibility: "public" | "unlisted" | "private" | "archived";
  rightsState: ReuseRights;
  customerPermissionState: "pending" | "granted" | "restricted" | "not-required";
  implementerIds: string[];
  creatorIds: string[];
  providerIds: string[];
  derivedBlueprintIds: string[];
  sourceBuildId?: string;
  lastEvidenceReviewAt: string;
  nextEvidenceReviewAt?: string;
  stalenessState: StalenessState;
  demo: boolean;
}

export interface ImplementationContext extends IntelligenceRecord {
  implementationId: string;
  locations: number | null;
  volumeLabel: string;
  monthlyVolume: number | null;
  /** Normalized range; a single disclosed value sets both bounds. */
  monthlyVolumeMin?: number | null;
  monthlyVolumeMax?: number | null;
  existingSystems: string[];
  /** Existing systems resolved to catalogue products where known. */
  existingSystemProductIds?: string[];
  technicalCapability: TechnicalCapability;
  regulatoryConstraints: string[];
  processMaturity: string;
  workflowCharacteristics: string[];
  dataSensitivity?: Level3;
  humanApprovalRequired?: boolean;
  maintenanceTolerance?: Level3;
  /** Category-specific extension values keyed by the category template. */
  extensions?: Record<string, string | number | boolean>;
}

export interface SimilarityFactor {
  factor: string;
  /** 0..1 contribution of this factor, before weighting. */
  match: number;
  weight: number;
  compared: boolean;
}

export interface ContextSimilarity {
  /** Weighted agreement over the factors that could be compared (0..100). */
  score: number;
  level: "high" | "medium" | "low";
  reasons: string[];
  differences: string[];
  /** Factors that could not be compared because data is missing. */
  unknowns?: string[];
  factors?: SimilarityFactor[];
}

export interface ImplementationUseCase extends IntelligenceRecord {
  implementationId: string;
  useCaseId: string;
}

export interface ImplementationCapability extends IntelligenceRecord {
  implementationId: string;
  capabilityId: string;
}

export interface ImplementationProcessStep extends IntelligenceRecord {
  implementationId: string;
  phase: "before" | "change" | "after";
  position: number;
  description: string;
  humanRole: string;
}

export interface ImplementationStackItem extends IntelligenceRecord {
  implementationId: string;
  productId: string;
  capabilityId: string;
  role: string;
  version?: string;
  evidenceLevel: EvidenceLevel;
  notes: string;
  x: number;
  y: number;
}

export interface ImplementationConnection extends IntelligenceRecord {
  implementationId: string;
  fromItemId: string;
  toItemId: string;
  label: string;
  dataFlow: string;
  trustBoundary: boolean;
  evidenceLevel: EvidenceLevel;
}

export interface MetricDefinition extends IntelligenceRecord {
  slug: string;
  description: string;
  unit: string;
  direction: "higher-better" | "lower-better" | "neutral";
  category: string;
  calculationMethod: string;
  comparisonRules: string;
}

export interface MeasurementPeriod extends IntelligenceRecord {
  implementationId: string;
  kind: "baseline" | "observed";
  startDate?: string;
  endDate?: string;
  notes: string;
}

export interface ImplementationMetric extends IntelligenceRecord {
  implementationId: string;
  metricDefinitionId: string;
  baselineValue: number | null;
  observedValue: number | null;
  unit: string;
  measurementPeriodId?: string;
  absoluteChange: number | null;
  percentageChange: number | null;
  evidenceLevel: EvidenceLevel;
  sourceLabel: string;
  notes: string;
}

export type ClaimantType =
  | "creator"
  | "implementer"
  | "customer"
  | "provider"
  | "platform"
  | "reviewer"
  | "auditor"
  | "demo-dataset";

export interface Claim extends IntelligenceRecord {
  subjectType: "implementation" | "metric" | "blueprint" | "technology-relationship";
  subjectId: string;
  predicate: string;
  value: string;
  unit?: string;
  period?: string;
  claimant: string;
  claimantType?: ClaimantType;
  /** How the claimant supports the claim (e.g. "CRM export", "customer confirmation"). */
  evidenceMethod?: string;
  measurementPeriodId?: string;
  limitations?: string;
  status: "pending" | "accepted" | "rejected" | "revoked";
  evidenceLevel: EvidenceLevel;
  reviewedAt?: string;
  public: boolean;
}

export interface EvidenceArtifact extends IntelligenceRecord {
  ownerId: string;
  kind:
    | "customer-attestation"
    | "invoice"
    | "analytics-export"
    | "screenshot"
    | "system-log"
    | "contract-excerpt"
    | "deployment-documentation"
    | "repository"
    | "vendor-documentation"
    | "independent-audit"
    | "public-case-study"
    | "other";
  publicMetadata: string;
  storagePath: string;
  mimeType: string;
  private: boolean;
  retainedUntil?: string;
}

export interface ClaimEvidence extends IntelligenceRecord {
  claimId: string;
  evidenceArtifactId: string;
  relationship: "supports" | "contradicts" | "context";
}

export interface Attestation extends IntelligenceRecord {
  implementationId: string;
  ownerId: string;
  /** SHA-256 (hex) of the invitation token. The token itself is never stored. */
  tokenHash: string;
  expiresAt: string;
  status: "pending" | "submitted" | "expired" | "revoked";
  customerIdentityVisibility: CustomerIdentityVisibility;
  attestorLabel: string;
  /** Claims the invitation is scoped to. Nothing else is visible to the attestor. */
  claimIds?: string[];
  purpose?: "claim-attestation";
  createdAt?: string;
  submittedAt?: string;
  revokedAt?: string;
  /** Decisions recorded by the attestor, keyed by claim id. */
  decisions?: Record<string, "confirm" | "reject">;
}

export interface EvidenceReview extends IntelligenceRecord {
  claimId: string;
  reviewerId: string;
  result: "sufficient" | "insufficient" | "needs-more-evidence";
  notes: string;
  reviewedAt: string;
}

export interface VerificationEvent extends IntelligenceRecord {
  subjectType: string;
  subjectId: string;
  action: string;
  actorId: string;
  at: string;
  previousLevel?: EvidenceLevel;
  nextLevel?: EvidenceLevel;
}

export interface Blueprint extends IntelligenceRecord {
  slug: string;
  ownerId: string;
  description: string;
  derivedFromImplementationId?: string;
  useCaseIds: string[];
  capabilityIds: string[];
  currentVersionId: string;
  estimatedComplexity: "low" | "medium" | "high";
  requiredSkills: string[];
  license: string;
  reuseRights: ReuseRights;
  sourceAvailable: boolean;
  commercialUseAllowed: boolean;
  maintainerId: string;
  lastValidatedAt: string;
  compatibilityState: StalenessState;
  knownLimitations: string;
  publicationState: PublicationState;
  moderationState: IntelligenceModeration;
  /** Human publisher confirmation of the sanitization checklist. */
  sanitizationConfirmedAt?: string;
  sanitizationChecklist?: string[];
  rightsDeclaredAt?: string;
  setupNotes?: string;
  demo: boolean;
}

export interface BlueprintVersion extends IntelligenceRecord {
  blueprintId: string;
  version: string;
  changeNotes: string;
  lastValidatedAt: string;
  compatibilityState: StalenessState;
  completeness: number;
  compatibilityNotes?: string;
  /** Illustrative/recorded estimate ranges. Null means not estimated. */
  setupCostLow?: number | null;
  setupCostHigh?: number | null;
  monthlyCostLow?: number | null;
  monthlyCostHigh?: number | null;
  maintenanceHoursLow?: number | null;
  maintenanceHoursHigh?: number | null;
  costCurrency?: string;
  costBasis?: string;
  externalReferences?: { type: string; url: string; label: string }[];
}

export interface BlueprintStackItem extends IntelligenceRecord {
  blueprintVersionId: string;
  capabilityId: string;
  productId?: string;
  role: string;
  required: boolean;
  alternativeProductIds: string[];
  configurationRequirements: string;
  version?: string;
  x: number;
  y: number;
}

export interface BlueprintConnection extends IntelligenceRecord {
  blueprintVersionId: string;
  fromItemId: string;
  toItemId: string;
  label: string;
  dataFlow: string;
  trustBoundary: boolean;
}

export interface BlueprintRequirement extends IntelligenceRecord {
  blueprintId: string;
  type: "system" | "skill" | "security" | "data" | "operational";
  description: string;
  required: boolean;
}

export interface BlueprintLicense extends IntelligenceRecord {
  blueprintId: string;
  rights: ReuseRights;
  licenseText: string;
  attributionRequired: boolean;
  commercialUseAllowed: boolean;
}

export type TechnologyRelationshipType =
  | "native-integration"
  | "api-compatible"
  | "webhook-compatible"
  | "connector-available"
  | "requires-middleware"
  | "custom-integration-required"
  | "observed-together"
  | "incompatible"
  | "unknown";

export type RelationshipSourceType =
  | "vendor-documentation"
  | "platform-observed"
  | "implementation-record"
  | "community-report"
  | "reviewer-test"
  | "demo";

export interface TechnologyRelationship extends IntelligenceRecord {
  sourceProductId: string;
  targetProductId: string;
  relationshipType: TechnologyRelationshipType;
  sourceLabel: string;
  sourceType?: RelationshipSourceType;
  /** Required middleware product when relationshipType is requires-middleware. */
  middlewareProductId?: string;
  conditions?: string[];
  lastCheckedAt: string;
  evidenceLevel: EvidenceLevel;
  notes: string;
}

export interface RelationshipEvidence extends IntelligenceRecord {
  relationshipId: string;
  sourceUrl: string;
  evidenceLevel: EvidenceLevel;
  notes: string;
}

export interface CompatibilityCheck extends IntelligenceRecord {
  relationshipId: string;
  checkedAt: string;
  result: "confirmed" | "conditional" | "failed" | "unknown";
  conditions: string[];
  evidenceLevel: EvidenceLevel;
}

export type ConstraintKind = "hard" | "soft";
export type RequirementStrength = "hard" | "soft" | "informational";
export interface RequirementConstraint {
  id: string;
  kind: ConstraintKind;
  field: string;
  operator: "equals" | "includes" | "max" | "min" | "one-of" | "required";
  value: string | number | boolean | string[];
  label: string;
}

export interface RequirementProfile extends IntelligenceRecord {
  ownerId: string;
  objective: string;
  useCaseId?: string;
  industry: string;
  businessType: string;
  organizationSizeBand: string;
  region: string;
  locations: number | null;
  monthlyVolume: number | null;
  currentSystems: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  /** Maximum acceptable ongoing monthly cost. */
  ongoingBudgetMax?: number | null;
  currency: string;
  timeline: string;
  technicalCapability: TechnicalCapability;
  mustKeepSystems: string[];
  requiredIntegrations: string[];
  dataSensitivity: "low" | "medium" | "high";
  complianceRequirements: string[];
  deploymentPreference: string;
  automationLevel: string;
  humanApprovalRequired: boolean;
  maintenanceTolerance: Level3;
  dataResidency?: string;
  /** Buyer needs rights to reuse the Blueprint commercially (e.g. an implementer reselling it). */
  commercialReuseRequired?: boolean;
  /** Per-field HARD / SOFT / INFORMATIONAL strength. Missing = informational. */
  strengths?: Partial<Record<RequirementField, RequirementStrength>>;
  /** Fields whose value was inferred from free text and not yet confirmed. */
  inferredFields?: RequirementField[];
  constraints: RequirementConstraint[];
}

export type RequirementField =
  | "useCaseId"
  | "industry"
  | "businessType"
  | "organizationSizeBand"
  | "region"
  | "locations"
  | "monthlyVolume"
  | "currentSystems"
  | "budgetMax"
  | "ongoingBudgetMax"
  | "timeline"
  | "technicalCapability"
  | "mustKeepSystems"
  | "requiredIntegrations"
  | "dataSensitivity"
  | "complianceRequirements"
  | "deploymentPreference"
  | "automationLevel"
  | "humanApprovalRequired"
  | "maintenanceTolerance"
  | "dataResidency"
  | "commercialReuseRequired";

export interface SolutionRun extends IntelligenceRecord {
  ownerId: string;
  requirementProfileId: string;
  engineVersion: string;
  rulesetVersion: string;
  fingerprintSchemaVersion?: string;
  candidatePoolIds: string[];
  excluded: { id: string; reason: string }[];
  createdAt: string;
  /** Immutable snapshot of the requirement at compile time. */
  profileSnapshot?: RequirementProfile;
  /** Digest of the catalogue slice the engine read. */
  catalogueDigest?: string;
  /** Digest of the deterministic result (excludes timestamps). */
  resultDigest?: string;
  /** Full decision trace (see solution-compiler DecisionTrace). */
  trace?: unknown;
}

export interface ObjectiveRange {
  low: number | null;
  high: number | null;
}

/** Raw objective values. Never collapsed into one score. */
export interface CandidateObjectives {
  setupCost: ObjectiveRange;
  monthlyCost: ObjectiveRange;
  maintenanceHours: ObjectiveRange;
  /** Components + integrations that need middleware/custom work. Lower is simpler. */
  complexity: number;
  /** Share (0..1) of architecture handoffs backed by a typed, non-observational relationship. */
  compatibilityCoverage: number;
  /** Comparable published implementation records using the same capability pattern. */
  implementationEvidence: number;
  /** Slots with at least one recorded alternative. */
  flexibility: number;
  /** Distinct providers / components. Lower = more concentrated. */
  vendorDiversity: number;
}

export type ConstraintOutcome = "satisfied" | "violated" | "unknown";
export interface ConstraintResult {
  id: string;
  label: string;
  strength: RequirementStrength;
  outcome: ConstraintOutcome;
  reason: string;
  evidenceIds: string[];
}

export interface SolutionCandidate extends IntelligenceRecord {
  solutionRunId: string;
  sourceBlueprintId?: string;
  sourceBlueprintVersionId?: string;
  sourceImplementationIds: string[];
  /** Supported trade-off labels only; empty when data does not support one. */
  tradeoffLabels: string[];
  label: string;
  summary: string;
  objectives: CandidateObjectives;
  constraintResults: ConstraintResult[];
  satisfiedHardConstraints: string[];
  unknownHardConstraints: string[];
  softPreferenceMatches: string[];
  softPreferenceMisses: string[];
  risks: string[];
  unknowns: string[];
  dominated: boolean;
  dominatedBy: string[];
  /** Product ids by slot id (blueprint stack item id). */
  assignment: Record<string, string>;
  /** True when a user substituted at least one component. */
  substituted?: boolean;
  /** Other combinations of the same Blueprint with identical trade-offs. */
  equivalentVariants?: number;
  feasible: boolean;
  explanation?: CandidateExplanation;
}

export interface RelationshipUse {
  fromProductId: string;
  toProductId: string;
  relationshipId?: string;
  relationshipType: TechnologyRelationshipType;
  evidenceLevel?: EvidenceLevel;
  outcome: ConstraintOutcome;
  note: string;
}

/** Structured explanation; wording is derived from these fields, never the reverse. */
export interface CandidateExplanation {
  whyItFits: string[];
  whyItMayNotFit: string[];
  comparableImplementations: { implementationId: string; level: ContextSimilarity["level"]; summary: string }[];
  blueprintSource?: { blueprintId: string; versionId: string; version: string; rights: ReuseRights; freshness: StalenessState };
  relationships: RelationshipUse[];
  evidenceCoverage: string;
  unverifiedAreas: string[];
  costBasis: string;
}

export interface SolutionCandidateItem extends IntelligenceRecord {
  candidateId: string;
  slotId?: string;
  capabilityId: string;
  productId: string;
  role: string;
  alternativeProductIds: string[];
}

export interface SolutionExplanation extends IntelligenceRecord {
  candidateId: string;
  kind: "fit" | "risk" | "constraint" | "evidence" | "unknown";
  text: string;
  sourceEntityIds: string[];
}

export interface StalenessReview extends IntelligenceRecord {
  entityType: "implementation" | "blueprint" | "technology-relationship";
  entityId: string;
  reviewedAt: string;
  nextReviewAt?: string;
  state: StalenessState;
  reason: string;
}

/** Versioned normalized representation of an implementation (see fingerprint.ts). */
export interface ImplementationFingerprint extends IntelligenceRecord {
  implementationId: string;
  fingerprintVersion: string;
  digest: string;
  tokens: string[];
  canonical: unknown;
  inputLineage: string[];
  computedAt: string;
}

export interface IntelligenceTables {
  implementation_records: ImplementationRecord;
  implementation_contexts: ImplementationContext;
  implementation_process_steps: ImplementationProcessStep;
  implementation_stack_items: ImplementationStackItem;
  implementation_connections: ImplementationConnection;
  implementation_use_cases: ImplementationUseCase;
  implementation_capabilities: ImplementationCapability;
  metric_definitions: MetricDefinition;
  implementation_metrics: ImplementationMetric;
  measurement_periods: MeasurementPeriod;
  claims: Claim;
  claim_evidence: ClaimEvidence;
  evidence_artifacts: EvidenceArtifact;
  attestations: Attestation;
  evidence_reviews: EvidenceReview;
  verification_events: VerificationEvent;
  blueprints: Blueprint;
  blueprint_versions: BlueprintVersion;
  blueprint_stack_items: BlueprintStackItem;
  blueprint_connections: BlueprintConnection;
  blueprint_requirements: BlueprintRequirement;
  blueprint_licenses: BlueprintLicense;
  technology_relationships: TechnologyRelationship;
  relationship_evidence: RelationshipEvidence;
  compatibility_checks: CompatibilityCheck;
  requirement_profiles: RequirementProfile;
  solution_runs: SolutionRun;
  solution_candidates: SolutionCandidate;
  solution_candidate_items: SolutionCandidateItem;
  solution_explanations: SolutionExplanation;
  staleness_reviews: StalenessReview;
  implementation_fingerprints: ImplementationFingerprint;
}
