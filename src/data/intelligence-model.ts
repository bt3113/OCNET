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
  maintenanceHoursPerMonth: number | null;
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
  existingSystems: string[];
  technicalCapability: "none" | "basic" | "intermediate" | "advanced";
  regulatoryConstraints: string[];
  processMaturity: string;
  workflowCharacteristics: string[];
}

export interface ContextSimilarity {
  score: number;
  level: "high" | "medium" | "low";
  reasons: string[];
  differences: string[];
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

export interface Claim extends IntelligenceRecord {
  subjectType: "implementation" | "metric" | "blueprint" | "technology-relationship";
  subjectId: string;
  predicate: string;
  value: string;
  unit?: string;
  period?: string;
  claimant: string;
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
  tokenHash: string;
  expiresAt: string;
  status: "pending" | "submitted" | "expired" | "revoked";
  customerIdentityVisibility: CustomerIdentityVisibility;
  attestorLabel: string;
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
  demo: boolean;
}

export interface BlueprintVersion extends IntelligenceRecord {
  blueprintId: string;
  version: string;
  changeNotes: string;
  lastValidatedAt: string;
  compatibilityState: StalenessState;
  completeness: number;
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

export interface TechnologyRelationship extends IntelligenceRecord {
  sourceProductId: string;
  targetProductId: string;
  relationshipType: TechnologyRelationshipType;
  sourceLabel: string;
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
  industry: string;
  businessType: string;
  organizationSizeBand: string;
  region: string;
  locations: number | null;
  monthlyVolume: number | null;
  currentSystems: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  timeline: string;
  technicalCapability: "none" | "basic" | "intermediate" | "advanced";
  mustKeepSystems: string[];
  requiredIntegrations: string[];
  dataSensitivity: "low" | "medium" | "high";
  complianceRequirements: string[];
  deploymentPreference: string;
  automationLevel: string;
  humanApprovalRequired: boolean;
  maintenanceTolerance: "low" | "medium" | "high";
  constraints: RequirementConstraint[];
}

export interface SolutionRun extends IntelligenceRecord {
  ownerId: string;
  requirementProfileId: string;
  engineVersion: string;
  rulesetVersion: string;
  candidatePoolIds: string[];
  excluded: { id: string; reason: string }[];
  createdAt: string;
}

export interface SolutionCandidate extends IntelligenceRecord {
  solutionRunId: string;
  sourceBlueprintId?: string;
  sourceImplementationIds: string[];
  label: string;
  summary: string;
  setupCost: number | null;
  monthlyCost: number | null;
  complexity: number;
  evidenceStrength: number;
  maintenanceBurden: number;
  flexibility: number;
  satisfiedHardConstraints: string[];
  softPreferenceMatches: string[];
  risks: string[];
  unknowns: string[];
  dominated: boolean;
}

export interface SolutionCandidateItem extends IntelligenceRecord {
  candidateId: string;
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
}
