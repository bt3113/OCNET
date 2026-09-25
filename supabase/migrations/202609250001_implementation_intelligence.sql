-- Vendor-neutral implementation intelligence graph.
-- Implementation evidence, reusable Blueprints, procurement Projects and creator Builds remain separate objects.

create table public.implementation_records(
  id text primary key,
  slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
  name text not null check(length(name) between 5 and 180),
  summary text not null default '' check(length(summary)<=4000),
  "ownerId" uuid not null references auth.users(id) on delete cascade,
  "customerDisplayName" text not null default '',
  "customerIdentityVisibility" text not null default 'anonymous' check("customerIdentityVisibility" in ('public','anonymous','private')),
  industry text not null default '',
  "businessType" text not null default '',
  "organizationSizeBand" text not null default '',
  "employeeCountRange" text,
  region text not null default '',
  "contextSummary" text not null default '' check(length("contextSummary")<=12000),
  "baselinePeriodStart" date,
  "baselinePeriodEnd" date,
  "measurementPeriodStart" date,
  "measurementPeriodEnd" date,
  "implementationStartDate" date,
  "goLiveDate" date,
  "implementationDuration" text not null default '',
  "implementationCost" numeric check("implementationCost" is null or "implementationCost">=0),
  "implementationCostCurrency" text not null default 'GBP' check("implementationCostCurrency" ~ '^[A-Z]{3}$'),
  "costDisclosureType" text not null default 'not-disclosed' check("costDisclosureType" in ('exact','range','not-disclosed')),
  "ongoingMonthlyCost" numeric check("ongoingMonthlyCost" is null or "ongoingMonthlyCost">=0),
  "ongoingCostDisclosureType" text not null default 'not-disclosed' check("ongoingCostDisclosureType" in ('exact','range','not-disclosed')),
  "maintenanceHoursPerMonth" numeric check("maintenanceHoursPerMonth" is null or "maintenanceHoursPerMonth">=0),
  "verificationState" text not null default 'unverified' check("verificationState" in ('creator-reported','customer-attested','evidence-reviewed','platform-observed','independently-audited','demo','unverified')),
  "publicationState" text not null default 'draft' check("publicationState" in ('draft','published')),
  "moderationState" text not null default 'pending' check("moderationState" in ('pending','approved','flagged','rejected')),
  visibility text not null default 'private' check(visibility in ('public','unlisted','private','archived')),
  "rightsState" text not null default 'showcase-only' check("rightsState" in ('showcase-only','reference-architecture','personal-use','commercial-license','open-source','custom-license')),
  "customerPermissionState" text not null default 'pending' check("customerPermissionState" in ('pending','granted','restricted','not-required')),
  "implementerIds" text[] not null default '{}',
  "creatorIds" text[] not null default '{}',
  "providerIds" text[] not null default '{}',
  "derivedBlueprintIds" text[] not null default '{}',
  "sourceBuildId" text references public.builds(id) on delete set null,
  "lastEvidenceReviewAt" date not null default current_date,
  "nextEvidenceReviewAt" date,
  "stalenessState" text not null default 'unknown' check("stalenessState" in ('current','review-due','stale','archived','unknown')),
  demo boolean not null default false,
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  check("publicationState"<>'published' or length(summary)>=20),
  check(visibility<>'public' or "publicationState"='published')
);

create table public.implementation_contexts(
  id text primary key,
  name text not null,
  "implementationId" text not null unique references public.implementation_records(id) on delete cascade,
  locations integer check(locations is null or locations>=1),
  "volumeLabel" text not null default '',
  "monthlyVolume" numeric check("monthlyVolume" is null or "monthlyVolume">=0),
  "existingSystems" text[] not null default '{}',
  "technicalCapability" text not null default 'none' check("technicalCapability" in ('none','basic','intermediate','advanced')),
  "regulatoryConstraints" text[] not null default '{}',
  "processMaturity" text not null default '',
  "workflowCharacteristics" text[] not null default '{}',
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.implementation_process_steps(
  id text primary key,
  name text not null,
  "implementationId" text not null references public.implementation_records(id) on delete cascade,
  phase text not null check(phase in ('before','change','after')),
  position integer not null default 0 check(position>=0),
  description text not null check(length(description)<=3000),
  "humanRole" text not null default '',
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  unique("implementationId",phase,position)
);

create table public.implementation_stack_items(
  id text primary key,
  name text not null,
  "implementationId" text not null references public.implementation_records(id) on delete cascade,
  "productId" text not null references public.products(id),
  "capabilityId" text not null references public.capabilities(id),
  role text not null,
  version text,
  "evidenceLevel" text not null default 'creator-reported' check("evidenceLevel" in ('creator-reported','customer-attested','evidence-reviewed','platform-observed','independently-audited','demo','unverified')),
  notes text not null default '',
  x integer not null default 0 check(x between 0 and 4000),
  y integer not null default 0 check(y between 0 and 4000),
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  unique("implementationId",id)
);

create table public.implementation_connections(
  id text primary key,
  name text not null,
  "implementationId" text not null references public.implementation_records(id) on delete cascade,
  "fromItemId" text not null,
  "toItemId" text not null,
  label text not null default '',
  "dataFlow" text not null default '',
  "trustBoundary" boolean not null default false,
  "evidenceLevel" text not null default 'creator-reported' check("evidenceLevel" in ('creator-reported','customer-attested','evidence-reviewed','platform-observed','independently-audited','demo','unverified')),
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  foreign key("implementationId","fromItemId") references public.implementation_stack_items("implementationId",id) on delete cascade,
  foreign key("implementationId","toItemId") references public.implementation_stack_items("implementationId",id) on delete cascade,
  check("fromItemId"<>"toItemId")
);

create table public.implementation_use_cases(
  id text primary key,
  name text not null,
  "implementationId" text not null references public.implementation_records(id) on delete cascade,
  "useCaseId" text not null references public.use_cases(id),
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  unique("implementationId","useCaseId")
);

create table public.implementation_capabilities(
  id text primary key,
  name text not null,
  "implementationId" text not null references public.implementation_records(id) on delete cascade,
  "capabilityId" text not null references public.capabilities(id),
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  unique("implementationId","capabilityId")
);

create table public.metric_definitions(
  id text primary key,
  slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null default '',
  unit text not null,
  direction text not null check(direction in ('higher-better','lower-better','neutral')),
  category text not null,
  "calculationMethod" text not null default '',
  "comparisonRules" text not null default '',
  provenance text not null default 'verified',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.measurement_periods(
  id text primary key,
  name text not null,
  "implementationId" text not null references public.implementation_records(id) on delete cascade,
  kind text not null check(kind in ('baseline','observed')),
  "startDate" date,
  "endDate" date,
  notes text not null default '',
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now()
);

create table public.implementation_metrics(
  id text primary key,
  name text not null,
  "implementationId" text not null references public.implementation_records(id) on delete cascade,
  "metricDefinitionId" text not null references public.metric_definitions(id),
  "baselineValue" numeric,
  "observedValue" numeric,
  unit text not null,
  "measurementPeriodId" text references public.measurement_periods(id) on delete set null,
  "absoluteChange" numeric,
  "percentageChange" numeric,
  "evidenceLevel" text not null default 'creator-reported' check("evidenceLevel" in ('creator-reported','customer-attested','evidence-reviewed','platform-observed','independently-audited','demo','unverified')),
  "sourceLabel" text not null default '',
  notes text not null default '',
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique("implementationId","metricDefinitionId")
);

create table public.claims(
  id text primary key,
  name text not null,
  "subjectType" text not null check("subjectType" in ('implementation','metric','blueprint','technology-relationship')),
  "subjectId" text not null,
  predicate text not null,
  value text not null,
  unit text,
  period text,
  claimant text not null,
  status text not null default 'pending' check(status in ('pending','accepted','rejected','revoked')),
  "evidenceLevel" text not null default 'unverified' check("evidenceLevel" in ('creator-reported','customer-attested','evidence-reviewed','platform-observed','independently-audited','demo','unverified')),
  "reviewedAt" timestamptz,
  public boolean not null default false,
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.evidence_artifacts(
  id text primary key,
  name text not null,
  "ownerId" uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('customer-attestation','invoice','analytics-export','screenshot','system-log','contract-excerpt','deployment-documentation','repository','vendor-documentation','independent-audit','public-case-study','other')),
  "publicMetadata" text not null default '',
  "storagePath" text not null default '',
  "mimeType" text not null default '',
  private boolean not null default true,
  "retainedUntil" timestamptz,
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  check("storagePath"='' or "storagePath" ~ '^implementation-evidence/')
);

create table public.claim_evidence(
  id text primary key,
  name text not null,
  "claimId" text not null references public.claims(id) on delete cascade,
  "evidenceArtifactId" text not null references public.evidence_artifacts(id) on delete cascade,
  relationship text not null check(relationship in ('supports','contradicts','context')),
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  unique("claimId","evidenceArtifactId",relationship)
);

create table public.attestations(
  id text primary key,
  name text not null,
  "implementationId" text not null references public.implementation_records(id) on delete cascade,
  "ownerId" uuid not null references auth.users(id) on delete cascade,
  "tokenHash" text not null unique check(length("tokenHash")>=32),
  "expiresAt" timestamptz not null,
  status text not null default 'pending' check(status in ('pending','submitted','expired','revoked')),
  "customerIdentityVisibility" text not null default 'anonymous' check("customerIdentityVisibility" in ('public','anonymous','private')),
  "attestorLabel" text not null default '',
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.evidence_reviews(
  id text primary key,
  name text not null,
  "claimId" text not null references public.claims(id) on delete cascade,
  "reviewerId" uuid not null references auth.users(id),
  result text not null check(result in ('sufficient','insufficient','needs-more-evidence')),
  notes text not null default '',
  "reviewedAt" timestamptz not null default now(),
  provenance text not null default 'verified',
  "createdAt" timestamptz not null default now()
);

create table public.verification_events(
  id text primary key,
  name text not null,
  "subjectType" text not null,
  "subjectId" text not null,
  action text not null,
  "actorId" text not null,
  at timestamptz not null default now(),
  "previousLevel" text,
  "nextLevel" text,
  provenance text not null default 'verified',
  "createdAt" timestamptz not null default now()
);

create table public.blueprints(
  id text primary key,
  slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
  name text not null,
  "ownerId" uuid not null references auth.users(id) on delete cascade,
  description text not null default '' check(length(description)<=12000),
  "derivedFromImplementationId" text references public.implementation_records(id) on delete set null,
  "useCaseIds" text[] not null default '{}',
  "capabilityIds" text[] not null default '{}',
  "currentVersionId" text not null,
  "estimatedComplexity" text not null default 'medium' check("estimatedComplexity" in ('low','medium','high')),
  "requiredSkills" text[] not null default '{}',
  license text not null default '',
  "reuseRights" text not null default 'showcase-only' check("reuseRights" in ('showcase-only','reference-architecture','personal-use','commercial-license','open-source','custom-license')),
  "sourceAvailable" boolean not null default false,
  "commercialUseAllowed" boolean not null default false,
  "maintainerId" text not null,
  "lastValidatedAt" date not null default current_date,
  "compatibilityState" text not null default 'unknown' check("compatibilityState" in ('current','review-due','stale','archived','unknown')),
  "knownLimitations" text not null default '',
  "publicationState" text not null default 'draft' check("publicationState" in ('draft','published')),
  "moderationState" text not null default 'pending' check("moderationState" in ('pending','approved','flagged','rejected')),
  demo boolean not null default false,
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  check(not "commercialUseAllowed" or "reuseRights" in ('commercial-license','open-source','custom-license'))
);

create table public.blueprint_versions(
  id text primary key,
  name text not null,
  "blueprintId" text not null references public.blueprints(id) on delete cascade,
  version text not null,
  "changeNotes" text not null default '',
  "lastValidatedAt" date not null default current_date,
  "compatibilityState" text not null default 'unknown' check("compatibilityState" in ('current','review-due','stale','archived','unknown')),
  completeness integer not null default 0 check(completeness between 0 and 100),
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  unique("blueprintId",version)
);

alter table public.blueprints
  add constraint blueprint_current_version_fk foreign key("currentVersionId") references public.blueprint_versions(id) deferrable initially deferred;

create table public.blueprint_stack_items(
  id text primary key,
  name text not null,
  "blueprintVersionId" text not null references public.blueprint_versions(id) on delete cascade,
  "capabilityId" text not null references public.capabilities(id),
  "productId" text references public.products(id) on delete set null,
  role text not null,
  required boolean not null default true,
  "alternativeProductIds" text[] not null default '{}',
  "configurationRequirements" text not null default '',
  version text,
  x integer not null default 0 check(x between 0 and 4000),
  y integer not null default 0 check(y between 0 and 4000),
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  unique("blueprintVersionId",id)
);

create table public.blueprint_connections(
  id text primary key,
  name text not null,
  "blueprintVersionId" text not null references public.blueprint_versions(id) on delete cascade,
  "fromItemId" text not null,
  "toItemId" text not null,
  label text not null default '',
  "dataFlow" text not null default '',
  "trustBoundary" boolean not null default false,
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now(),
  foreign key("blueprintVersionId","fromItemId") references public.blueprint_stack_items("blueprintVersionId",id) on delete cascade,
  foreign key("blueprintVersionId","toItemId") references public.blueprint_stack_items("blueprintVersionId",id) on delete cascade,
  check("fromItemId"<>"toItemId")
);

create table public.blueprint_requirements(
  id text primary key,
  name text not null,
  "blueprintId" text not null references public.blueprints(id) on delete cascade,
  type text not null check(type in ('system','skill','security','data','operational')),
  description text not null,
  required boolean not null default true,
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now()
);

create table public.blueprint_licenses(
  id text primary key,
  name text not null,
  "blueprintId" text not null unique references public.blueprints(id) on delete cascade,
  rights text not null check(rights in ('showcase-only','reference-architecture','personal-use','commercial-license','open-source','custom-license')),
  "licenseText" text not null,
  "attributionRequired" boolean not null default true,
  "commercialUseAllowed" boolean not null default false,
  provenance text not null default 'creator supplied',
  "createdAt" timestamptz not null default now()
);

create table public.technology_relationships(
  id text primary key,
  name text not null,
  "sourceProductId" text not null references public.products(id) on delete cascade,
  "targetProductId" text not null references public.products(id) on delete cascade,
  "relationshipType" text not null check("relationshipType" in ('native-integration','api-compatible','webhook-compatible','connector-available','requires-middleware','custom-integration-required','observed-together','incompatible','unknown')),
  "sourceLabel" text not null,
  "lastCheckedAt" date not null default current_date,
  "evidenceLevel" text not null default 'unverified' check("evidenceLevel" in ('creator-reported','customer-attested','evidence-reviewed','platform-observed','independently-audited','demo','unverified')),
  notes text not null default '',
  provenance text not null default 'third-party sourced',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  check("sourceProductId"<>"targetProductId"),
  unique("sourceProductId","targetProductId","relationshipType")
);

create table public.relationship_evidence(
  id text primary key,
  name text not null,
  "relationshipId" text not null references public.technology_relationships(id) on delete cascade,
  "sourceUrl" text not null check("sourceUrl" ~ '^https?://'),
  "evidenceLevel" text not null default 'unverified' check("evidenceLevel" in ('creator-reported','customer-attested','evidence-reviewed','platform-observed','independently-audited','demo','unverified')),
  notes text not null default '',
  provenance text not null default 'third-party sourced',
  "createdAt" timestamptz not null default now()
);

create table public.compatibility_checks(
  id text primary key,
  name text not null,
  "relationshipId" text not null references public.technology_relationships(id) on delete cascade,
  "checkedAt" timestamptz not null default now(),
  result text not null check(result in ('confirmed','conditional','failed','unknown')),
  conditions text[] not null default '{}',
  "evidenceLevel" text not null default 'unverified' check("evidenceLevel" in ('creator-reported','customer-attested','evidence-reviewed','platform-observed','independently-audited','demo','unverified')),
  provenance text not null default 'third-party sourced',
  "createdAt" timestamptz not null default now()
);

create table public.requirement_profiles(
  id text primary key,
  name text not null,
  "ownerId" uuid not null references auth.users(id) on delete cascade,
  objective text not null,
  industry text not null default '',
  "businessType" text not null default '',
  "organizationSizeBand" text not null default '',
  region text not null default '',
  locations integer check(locations is null or locations>=1),
  "monthlyVolume" numeric check("monthlyVolume" is null or "monthlyVolume">=0),
  "currentSystems" text[] not null default '{}',
  "budgetMin" numeric,
  "budgetMax" numeric,
  currency text not null default 'GBP' check(currency ~ '^[A-Z]{3}$'),
  timeline text not null default '',
  "technicalCapability" text not null default 'none' check("technicalCapability" in ('none','basic','intermediate','advanced')),
  "mustKeepSystems" text[] not null default '{}',
  "requiredIntegrations" text[] not null default '{}',
  "dataSensitivity" text not null default 'medium' check("dataSensitivity" in ('low','medium','high')),
  "complianceRequirements" text[] not null default '{}',
  "deploymentPreference" text not null default '',
  "automationLevel" text not null default '',
  "humanApprovalRequired" boolean not null default true,
  "maintenanceTolerance" text not null default 'low' check("maintenanceTolerance" in ('low','medium','high')),
  constraints jsonb not null default '[]'::jsonb,
  provenance text not null default 'inferred',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.solution_runs(
  id text primary key,
  name text not null,
  "ownerId" uuid not null references auth.users(id) on delete cascade,
  "requirementProfileId" text not null references public.requirement_profiles(id) on delete cascade,
  "engineVersion" text not null,
  "rulesetVersion" text not null,
  "candidatePoolIds" text[] not null default '{}',
  excluded jsonb not null default '[]'::jsonb,
  provenance text not null default 'inferred',
  "createdAt" timestamptz not null default now()
);

create table public.solution_candidates(
  id text primary key,
  name text not null,
  "solutionRunId" text not null references public.solution_runs(id) on delete cascade,
  "sourceBlueprintId" text references public.blueprints(id) on delete set null,
  "sourceImplementationIds" text[] not null default '{}',
  label text not null,
  summary text not null,
  "setupCost" numeric,
  "monthlyCost" numeric,
  complexity numeric not null check(complexity between 0 and 100),
  "evidenceStrength" numeric not null check("evidenceStrength" between 0 and 100),
  "maintenanceBurden" numeric not null check("maintenanceBurden" between 0 and 100),
  flexibility numeric not null check(flexibility between 0 and 100),
  "satisfiedHardConstraints" text[] not null default '{}',
  "softPreferenceMatches" text[] not null default '{}',
  risks text[] not null default '{}',
  unknowns text[] not null default '{}',
  dominated boolean not null default false,
  provenance text not null default 'inferred',
  "createdAt" timestamptz not null default now()
);

create table public.solution_candidate_items(
  id text primary key,
  name text not null,
  "candidateId" text not null references public.solution_candidates(id) on delete cascade,
  "capabilityId" text not null references public.capabilities(id),
  "productId" text not null references public.products(id),
  role text not null,
  "alternativeProductIds" text[] not null default '{}',
  provenance text not null default 'inferred',
  "createdAt" timestamptz not null default now()
);

create table public.solution_explanations(
  id text primary key,
  name text not null,
  "candidateId" text not null references public.solution_candidates(id) on delete cascade,
  kind text not null check(kind in ('fit','risk','constraint','evidence','unknown')),
  text text not null,
  "sourceEntityIds" text[] not null default '{}',
  provenance text not null default 'inferred',
  "createdAt" timestamptz not null default now()
);

create table public.staleness_reviews(
  id text primary key,
  name text not null,
  "entityType" text not null check("entityType" in ('implementation','blueprint','technology-relationship')),
  "entityId" text not null,
  "reviewedAt" date not null default current_date,
  "nextReviewAt" date,
  state text not null check(state in ('current','review-due','stale','archived','unknown')),
  reason text not null default '',
  provenance text not null default 'verified',
  "createdAt" timestamptz not null default now()
);

create index implementation_records_discovery on public.implementation_records("publicationState","moderationState",visibility,"stalenessState");
create index implementation_records_context on public.implementation_records(industry,"businessType","organizationSizeBand",region);
create index implementation_stack_product on public.implementation_stack_items("productId","implementationId");
create index implementation_metric_lookup on public.implementation_metrics("implementationId","metricDefinitionId");
create index blueprint_discovery on public.blueprints("publicationState","moderationState","compatibilityState");
create index technology_relationship_lookup on public.technology_relationships("sourceProductId","targetProductId","relationshipType");
create index solution_run_owner on public.solution_runs("ownerId","createdAt");

create or replace function public.can_edit_implementation(target text)
returns boolean language sql stable security definer set search_path=''
as $$
  select public.is_admin() or exists(
    select 1 from public.implementation_records i
    where i.id=target and i."ownerId"=auth.uid()
  )
$$;

create or replace function public.implementation_is_public(target text)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.implementation_records i
    where i.id=target and i.visibility='public' and i."publicationState"='published' and i."moderationState"='approved'
  )
$$;

create or replace function public.can_edit_blueprint(target text)
returns boolean language sql stable security definer set search_path=''
as $$
  select public.is_admin() or exists(
    select 1 from public.blueprints b where b.id=target and b."ownerId"=auth.uid()
  )
$$;

create or replace function public.blueprint_is_public(target text)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.blueprints b
    where b.id=target and b."publicationState"='published' and b."moderationState"='approved'
  )
$$;

create or replace function public.claim_is_public(target text)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.claims c
    where c.id=target and c.public=true and (
      (c."subjectType"='implementation' and public.implementation_is_public(c."subjectId"))
      or (c."subjectType"='metric' and exists(
        select 1 from public.implementation_metrics m where m.id=c."subjectId" and public.implementation_is_public(m."implementationId")
      ))
      or (c."subjectType"='blueprint' and public.blueprint_is_public(c."subjectId"))
      or c."subjectType"='technology-relationship'
    )
  )
$$;

create or replace function public.can_edit_claim(target text)
returns boolean language sql stable security definer set search_path=''
as $$
  select public.is_admin() or exists(
    select 1 from public.claims c where c.id=target and (
      (c."subjectType"='implementation' and public.can_edit_implementation(c."subjectId"))
      or (c."subjectType"='metric' and exists(
        select 1 from public.implementation_metrics m where m.id=c."subjectId" and public.can_edit_implementation(m."implementationId")
      ))
      or (c."subjectType"='blueprint' and public.can_edit_blueprint(c."subjectId"))
    )
  )
$$;

create or replace function public.protect_implementation_review_fields()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if not public.is_admin() then
    new."verificationState" := old."verificationState";
    new."moderationState" := case when row(new.name,new.summary,new."contextSummary",new."rightsState",new."customerPermissionState") is distinct from row(old.name,old.summary,old."contextSummary",old."rightsState",old."customerPermissionState") then 'pending' else old."moderationState" end;
    new.demo := old.demo;
  end if;
  new."updatedAt" := now();
  return new;
end $$;
create trigger protect_implementation_review before update on public.implementation_records for each row execute function public.protect_implementation_review_fields();

create or replace function public.protect_claim_review_fields()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if not public.is_admin() then
    new."evidenceLevel" := old."evidenceLevel";
    new.status := case when new.value is distinct from old.value then 'pending' else old.status end;
    new."reviewedAt" := old."reviewedAt";
  end if;
  new."updatedAt" := now();
  return new;
end $$;
create trigger protect_claim_review before update on public.claims for each row execute function public.protect_claim_review_fields();

create or replace function public.protect_blueprint_review_fields()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if not public.is_admin() then
    new."moderationState" := case when row(new.name,new.description,new.license,new."reuseRights",new."commercialUseAllowed") is distinct from row(old.name,old.description,old.license,old."reuseRights",old."commercialUseAllowed") then 'pending' else old."moderationState" end;
    new.demo := old.demo;
  end if;
  new."updatedAt" := now();
  return new;
end $$;
create trigger protect_blueprint_review before update on public.blueprints for each row execute function public.protect_blueprint_review_fields();

create or replace function public.record_intelligence_audit()
returns trigger language plpgsql security definer set search_path=''
as $$
declare entity text; actor uuid;
begin
  entity := coalesce(new.id,old.id);
  actor := auth.uid();
  insert into public.audit_events(id,name,provenance,"actorId","entityId","entityType",action,at)
  values(gen_random_uuid()::text,'Implementation intelligence audit','verified',actor,entity,tg_table_name,lower(tg_op),now());
  return coalesce(new,old);
end $$;
create trigger implementation_audit after insert or update or delete on public.implementation_records for each row execute function public.record_intelligence_audit();
create trigger claim_audit after insert or update or delete on public.claims for each row execute function public.record_intelligence_audit();
create trigger blueprint_audit after insert or update or delete on public.blueprints for each row execute function public.record_intelligence_audit();
create trigger relationship_audit after insert or update or delete on public.technology_relationships for each row execute function public.record_intelligence_audit();

-- RLS: public discovery only for approved publication; owner/admin edit paths are explicit.
alter table public.implementation_records enable row level security;
create policy implementation_public_read on public.implementation_records for select to anon,authenticated using(public.implementation_is_public(id));
create policy implementation_owner_read on public.implementation_records for select to authenticated using("ownerId"=auth.uid() or public.is_admin());
create policy implementation_owner_insert on public.implementation_records for insert to authenticated with check("ownerId"=auth.uid() and "verificationState" in ('creator-reported','unverified') and "moderationState"='pending' and demo=false);
create policy implementation_owner_update on public.implementation_records for update to authenticated using("ownerId"=auth.uid() or public.is_admin()) with check("ownerId"=auth.uid() or public.is_admin());
create policy implementation_admin_delete on public.implementation_records for delete to authenticated using(public.is_admin());

alter table public.implementation_contexts enable row level security;
create policy implementation_context_read on public.implementation_contexts for select to anon,authenticated using(public.implementation_is_public("implementationId") or public.can_edit_implementation("implementationId"));
create policy implementation_context_write on public.implementation_contexts for all to authenticated using(public.can_edit_implementation("implementationId")) with check(public.can_edit_implementation("implementationId"));

alter table public.implementation_process_steps enable row level security;
create policy implementation_steps_read on public.implementation_process_steps for select to anon,authenticated using(public.implementation_is_public("implementationId") or public.can_edit_implementation("implementationId"));
create policy implementation_steps_write on public.implementation_process_steps for all to authenticated using(public.can_edit_implementation("implementationId")) with check(public.can_edit_implementation("implementationId"));

alter table public.implementation_stack_items enable row level security;
create policy implementation_stack_read on public.implementation_stack_items for select to anon,authenticated using(public.implementation_is_public("implementationId") or public.can_edit_implementation("implementationId"));
create policy implementation_stack_write on public.implementation_stack_items for all to authenticated using(public.can_edit_implementation("implementationId")) with check(public.can_edit_implementation("implementationId"));

alter table public.implementation_connections enable row level security;
create policy implementation_connections_read on public.implementation_connections for select to anon,authenticated using(public.implementation_is_public("implementationId") or public.can_edit_implementation("implementationId"));
create policy implementation_connections_write on public.implementation_connections for all to authenticated using(public.can_edit_implementation("implementationId")) with check(public.can_edit_implementation("implementationId"));

alter table public.implementation_use_cases enable row level security;
create policy implementation_use_cases_read on public.implementation_use_cases for select to anon,authenticated using(public.implementation_is_public("implementationId") or public.can_edit_implementation("implementationId"));
create policy implementation_use_cases_write on public.implementation_use_cases for all to authenticated using(public.can_edit_implementation("implementationId")) with check(public.can_edit_implementation("implementationId"));

alter table public.implementation_capabilities enable row level security;
create policy implementation_capabilities_read on public.implementation_capabilities for select to anon,authenticated using(public.implementation_is_public("implementationId") or public.can_edit_implementation("implementationId"));
create policy implementation_capabilities_write on public.implementation_capabilities for all to authenticated using(public.can_edit_implementation("implementationId")) with check(public.can_edit_implementation("implementationId"));

alter table public.metric_definitions enable row level security;
create policy metric_definitions_read on public.metric_definitions for select to anon,authenticated using(true);
create policy metric_definitions_admin on public.metric_definitions for all to authenticated using(public.is_admin()) with check(public.is_admin());

alter table public.measurement_periods enable row level security;
create policy measurement_periods_read on public.measurement_periods for select to anon,authenticated using(public.implementation_is_public("implementationId") or public.can_edit_implementation("implementationId"));
create policy measurement_periods_write on public.measurement_periods for all to authenticated using(public.can_edit_implementation("implementationId")) with check(public.can_edit_implementation("implementationId"));

alter table public.implementation_metrics enable row level security;
create policy implementation_metrics_read on public.implementation_metrics for select to anon,authenticated using(public.implementation_is_public("implementationId") or public.can_edit_implementation("implementationId"));
create policy implementation_metrics_write on public.implementation_metrics for all to authenticated using(public.can_edit_implementation("implementationId")) with check(public.can_edit_implementation("implementationId"));

alter table public.claims enable row level security;
create policy claims_public_read on public.claims for select to anon,authenticated using(public.claim_is_public(id));
create policy claims_owner_read on public.claims for select to authenticated using(public.can_edit_claim(id) or public.is_admin());
create policy claims_owner_insert on public.claims for insert to authenticated with check(public.is_admin() or (
  "evidenceLevel" in ('creator-reported','unverified') and status='pending'
));
create policy claims_owner_update on public.claims for update to authenticated using(public.can_edit_claim(id) or public.is_admin()) with check(public.can_edit_claim(id) or public.is_admin());
create policy claims_admin_delete on public.claims for delete to authenticated using(public.is_admin());

alter table public.evidence_artifacts enable row level security;
create policy evidence_owner on public.evidence_artifacts for all to authenticated using("ownerId"=auth.uid() or public.is_admin()) with check("ownerId"=auth.uid() or public.is_admin());

alter table public.claim_evidence enable row level security;
create policy claim_evidence_private on public.claim_evidence for select to authenticated using(public.is_admin() or exists(select 1 from public.evidence_artifacts e where e.id="evidenceArtifactId" and e."ownerId"=auth.uid()));
create policy claim_evidence_write on public.claim_evidence for all to authenticated using(public.is_admin() or exists(select 1 from public.evidence_artifacts e where e.id="evidenceArtifactId" and e."ownerId"=auth.uid())) with check(public.is_admin() or exists(select 1 from public.evidence_artifacts e where e.id="evidenceArtifactId" and e."ownerId"=auth.uid()));

alter table public.attestations enable row level security;
create policy attestation_owner on public.attestations for select to authenticated using("ownerId"=auth.uid() or public.is_admin());
create policy attestation_owner_insert on public.attestations for insert to authenticated with check("ownerId"=auth.uid() and public.can_edit_implementation("implementationId"));
create policy attestation_admin_update on public.attestations for update to authenticated using(public.is_admin()) with check(public.is_admin());

alter table public.evidence_reviews enable row level security;
create policy evidence_reviews_admin on public.evidence_reviews for all to authenticated using(public.is_admin()) with check(public.is_admin() and "reviewerId"=auth.uid());

alter table public.verification_events enable row level security;
create policy verification_events_admin on public.verification_events for all to authenticated using(public.is_admin()) with check(public.is_admin());

alter table public.blueprints enable row level security;
create policy blueprint_public_read on public.blueprints for select to anon,authenticated using(public.blueprint_is_public(id));
create policy blueprint_owner_read on public.blueprints for select to authenticated using("ownerId"=auth.uid() or public.is_admin());
create policy blueprint_owner_insert on public.blueprints for insert to authenticated with check("ownerId"=auth.uid() and "moderationState"='pending' and demo=false);
create policy blueprint_owner_update on public.blueprints for update to authenticated using("ownerId"=auth.uid() or public.is_admin()) with check("ownerId"=auth.uid() or public.is_admin());
create policy blueprint_admin_delete on public.blueprints for delete to authenticated using(public.is_admin());

alter table public.blueprint_versions enable row level security;
create policy blueprint_versions_read on public.blueprint_versions for select to anon,authenticated using(public.blueprint_is_public("blueprintId") or public.can_edit_blueprint("blueprintId"));
create policy blueprint_versions_write on public.blueprint_versions for all to authenticated using(public.can_edit_blueprint("blueprintId")) with check(public.can_edit_blueprint("blueprintId"));

alter table public.blueprint_stack_items enable row level security;
create policy blueprint_stack_read on public.blueprint_stack_items for select to anon,authenticated using(exists(select 1 from public.blueprint_versions v where v.id="blueprintVersionId" and (public.blueprint_is_public(v."blueprintId") or public.can_edit_blueprint(v."blueprintId"))));
create policy blueprint_stack_write on public.blueprint_stack_items for all to authenticated using(exists(select 1 from public.blueprint_versions v where v.id="blueprintVersionId" and public.can_edit_blueprint(v."blueprintId"))) with check(exists(select 1 from public.blueprint_versions v where v.id="blueprintVersionId" and public.can_edit_blueprint(v."blueprintId")));

alter table public.blueprint_connections enable row level security;
create policy blueprint_connections_read on public.blueprint_connections for select to anon,authenticated using(exists(select 1 from public.blueprint_versions v where v.id="blueprintVersionId" and (public.blueprint_is_public(v."blueprintId") or public.can_edit_blueprint(v."blueprintId"))));
create policy blueprint_connections_write on public.blueprint_connections for all to authenticated using(exists(select 1 from public.blueprint_versions v where v.id="blueprintVersionId" and public.can_edit_blueprint(v."blueprintId"))) with check(exists(select 1 from public.blueprint_versions v where v.id="blueprintVersionId" and public.can_edit_blueprint(v."blueprintId")));

alter table public.blueprint_requirements enable row level security;
create policy blueprint_requirements_read on public.blueprint_requirements for select to anon,authenticated using(public.blueprint_is_public("blueprintId") or public.can_edit_blueprint("blueprintId"));
create policy blueprint_requirements_write on public.blueprint_requirements for all to authenticated using(public.can_edit_blueprint("blueprintId")) with check(public.can_edit_blueprint("blueprintId"));

alter table public.blueprint_licenses enable row level security;
create policy blueprint_licenses_read on public.blueprint_licenses for select to anon,authenticated using(public.blueprint_is_public("blueprintId") or public.can_edit_blueprint("blueprintId"));
create policy blueprint_licenses_write on public.blueprint_licenses for all to authenticated using(public.can_edit_blueprint("blueprintId")) with check(public.can_edit_blueprint("blueprintId"));

alter table public.technology_relationships enable row level security;
create policy technology_relationships_read on public.technology_relationships for select to anon,authenticated using(true);
create policy technology_relationships_admin on public.technology_relationships for all to authenticated using(public.is_admin()) with check(public.is_admin());

alter table public.relationship_evidence enable row level security;
create policy relationship_evidence_read on public.relationship_evidence for select to anon,authenticated using(true);
create policy relationship_evidence_admin on public.relationship_evidence for all to authenticated using(public.is_admin()) with check(public.is_admin());

alter table public.compatibility_checks enable row level security;
create policy compatibility_checks_read on public.compatibility_checks for select to anon,authenticated using(true);
create policy compatibility_checks_admin on public.compatibility_checks for all to authenticated using(public.is_admin()) with check(public.is_admin());

alter table public.requirement_profiles enable row level security;
create policy requirement_owner on public.requirement_profiles for all to authenticated using("ownerId"=auth.uid() or public.is_admin()) with check("ownerId"=auth.uid() or public.is_admin());

alter table public.solution_runs enable row level security;
create policy solution_run_owner on public.solution_runs for all to authenticated using("ownerId"=auth.uid() or public.is_admin()) with check("ownerId"=auth.uid() or public.is_admin());

alter table public.solution_candidates enable row level security;
create policy solution_candidate_owner on public.solution_candidates for all to authenticated using(exists(select 1 from public.solution_runs r where r.id="solutionRunId" and (r."ownerId"=auth.uid() or public.is_admin()))) with check(exists(select 1 from public.solution_runs r where r.id="solutionRunId" and (r."ownerId"=auth.uid() or public.is_admin())));

alter table public.solution_candidate_items enable row level security;
create policy solution_candidate_items_owner on public.solution_candidate_items for all to authenticated using(exists(select 1 from public.solution_candidates c join public.solution_runs r on r.id=c."solutionRunId" where c.id="candidateId" and (r."ownerId"=auth.uid() or public.is_admin()))) with check(exists(select 1 from public.solution_candidates c join public.solution_runs r on r.id=c."solutionRunId" where c.id="candidateId" and (r."ownerId"=auth.uid() or public.is_admin())));

alter table public.solution_explanations enable row level security;
create policy solution_explanations_owner on public.solution_explanations for all to authenticated using(exists(select 1 from public.solution_candidates c join public.solution_runs r on r.id=c."solutionRunId" where c.id="candidateId" and (r."ownerId"=auth.uid() or public.is_admin()))) with check(exists(select 1 from public.solution_candidates c join public.solution_runs r on r.id=c."solutionRunId" where c.id="candidateId" and (r."ownerId"=auth.uid() or public.is_admin())));

alter table public.staleness_reviews enable row level security;
create policy staleness_reviews_read on public.staleness_reviews for select to anon,authenticated using(true);
create policy staleness_reviews_admin on public.staleness_reviews for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Private evidence storage. The attestation Edge Function/service role is the only public-token bridge.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('implementation-evidence','implementation-evidence',false,15728640,array['application/pdf','image/png','image/jpeg','image/webp','text/plain','text/csv','application/json'])
on conflict(id) do nothing;

create policy intelligence_evidence_object_read on storage.objects for select to authenticated
using(bucket_id='implementation-evidence' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy intelligence_evidence_object_insert on storage.objects for insert to authenticated
with check(bucket_id='implementation-evidence' and (storage.foldername(name))[1]=auth.uid()::text);
create policy intelligence_evidence_object_update on storage.objects for update to authenticated
using(bucket_id='implementation-evidence' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='implementation-evidence' and (storage.foldername(name))[1]=auth.uid()::text);
create policy intelligence_evidence_object_delete on storage.objects for delete to authenticated
using(bucket_id='implementation-evidence' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
