-- Implementation-intelligence hardening (follow-up to 202609250001/0002).
-- Fixes audited RLS gaps: claim subject ownership, claim retargeting, trusted-field
-- tampering, re-moderation after material edits, forged attestations, evidence
-- attachment/IDOR, audit coverage and immutability, cross-tenant references.
-- Also adds the columns the typed client model sends (connected-mode round-trips).

-- ───────────── Trust helper ─────────────
-- Trusted = reviewer/admin, the service role (Edge Functions), or a direct database
-- session with no API role (migrations, seeds). Browser sessions are never trusted
-- unless their JWT/role says admin.
create or replace function public.is_trusted()
returns boolean language sql stable security definer set search_path=''
as $$
  select public.is_admin()
    or coalesce(auth.jwt()->>'role','') = 'service_role'
    or coalesce(current_setting('role', true), 'none') in ('none','service_role','postgres','supabase_admin')
$$;
revoke execute on function public.is_trusted() from public;
grant execute on function public.is_trusted() to anon, authenticated, service_role;

-- ───────────── Columns required by the client model ─────────────
alter table public.implementation_records
  add column if not exists "implementationCostLow" numeric check("implementationCostLow" is null or "implementationCostLow">=0),
  add column if not exists "implementationCostHigh" numeric check("implementationCostHigh" is null or "implementationCostHigh">=0),
  add column if not exists "ongoingMonthlyCostLow" numeric,
  add column if not exists "ongoingMonthlyCostHigh" numeric,
  add column if not exists "maintenanceBurden" text check("maintenanceBurden" is null or "maintenanceBurden" in ('low','medium','high','unknown')),
  add column if not exists "problemStatement" text not null default '' check(length("problemStatement")<=6000),
  add column if not exists "knownLimitations" text not null default '' check(length("knownLimitations")<=6000),
  add column if not exists "categoryTemplateId" text;
alter table public.implementation_records add constraint implementation_cost_range check("implementationCostLow" is null or "implementationCostHigh" is null or "implementationCostLow"<="implementationCostHigh");

alter table public.implementation_contexts
  add column if not exists "monthlyVolumeMin" numeric check("monthlyVolumeMin" is null or "monthlyVolumeMin">=0),
  add column if not exists "monthlyVolumeMax" numeric check("monthlyVolumeMax" is null or "monthlyVolumeMax">=0),
  add column if not exists "existingSystemProductIds" text[] not null default '{}',
  add column if not exists "dataSensitivity" text check("dataSensitivity" is null or "dataSensitivity" in ('low','medium','high')),
  add column if not exists "humanApprovalRequired" boolean,
  add column if not exists "maintenanceTolerance" text check("maintenanceTolerance" is null or "maintenanceTolerance" in ('low','medium','high')),
  add column if not exists extensions jsonb not null default '{}'::jsonb check(jsonb_typeof(extensions)='object' and length(extensions::text)<=4000);

alter table public.claims
  add column if not exists "claimantType" text check("claimantType" is null or "claimantType" in ('creator','implementer','customer','provider','platform','reviewer','auditor','demo-dataset')),
  add column if not exists "claimantId" uuid default auth.uid(),
  add column if not exists "evidenceMethod" text check("evidenceMethod" is null or length("evidenceMethod")<=500),
  add column if not exists "measurementPeriodId" text references public.measurement_periods(id) on delete set null,
  add column if not exists limitations text check(limitations is null or length(limitations)<=3000);

alter table public.attestations
  add column if not exists "claimIds" text[] not null default '{}',
  add column if not exists purpose text not null default 'claim-attestation' check(purpose='claim-attestation'),
  add column if not exists "submittedAt" timestamptz,
  add column if not exists "revokedAt" timestamptz,
  add column if not exists decisions jsonb not null default '{}'::jsonb;

alter table public.blueprints
  add column if not exists "sanitizationConfirmedAt" date,
  add column if not exists "sanitizationChecklist" text[] not null default '{}',
  add column if not exists "rightsDeclaredAt" date,
  add column if not exists "setupNotes" text not null default '' check(length("setupNotes")<=6000);
-- Publication requires a confirmed sanitization checklist and a rights declaration.
alter table public.blueprints add constraint blueprint_publication_gate
  check("moderationState"<>'approved' or ("sanitizationConfirmedAt" is not null and "rightsDeclaredAt" is not null)) not valid;
-- A Blueprint and its first version are created by separate API calls; the circular
-- deferred FK made that impossible. Integrity is enforced by trigger instead.
alter table public.blueprints drop constraint if exists blueprint_current_version_fk;

alter table public.blueprint_versions
  add column if not exists "compatibilityNotes" text not null default '',
  add column if not exists "setupCostLow" numeric,
  add column if not exists "setupCostHigh" numeric,
  add column if not exists "monthlyCostLow" numeric,
  add column if not exists "monthlyCostHigh" numeric,
  add column if not exists "maintenanceHoursLow" numeric,
  add column if not exists "maintenanceHoursHigh" numeric,
  add column if not exists "costCurrency" text not null default 'GBP' check("costCurrency" ~ '^[A-Z]{3}$'),
  add column if not exists "costBasis" text not null default '',
  add column if not exists "externalReferences" jsonb not null default '[]'::jsonb check(jsonb_typeof("externalReferences")='array'),
  add column if not exists "updatedAt" timestamptz not null default now();

alter table public.technology_relationships
  add column if not exists "sourceType" text check("sourceType" is null or "sourceType" in ('vendor-documentation','platform-observed','implementation-record','community-report','reviewer-test','demo')),
  add column if not exists "middlewareProductId" text references public.products(id) on delete set null,
  add column if not exists conditions text[] not null default '{}';

alter table public.relationship_evidence
  add column if not exists "submittedBy" uuid default auth.uid();

alter table public.requirement_profiles
  add column if not exists "useCaseId" text,
  add column if not exists "ongoingBudgetMax" numeric,
  add column if not exists "dataResidency" text,
  add column if not exists "commercialReuseRequired" boolean not null default false,
  add column if not exists strengths jsonb not null default '{}'::jsonb check(jsonb_typeof(strengths)='object'),
  add column if not exists "inferredFields" text[] not null default '{}';

alter table public.solution_runs
  add column if not exists "fingerprintSchemaVersion" text,
  add column if not exists "profileSnapshot" jsonb,
  add column if not exists "catalogueDigest" text,
  add column if not exists "resultDigest" text,
  add column if not exists trace jsonb;

-- Candidate pseudo-scores are replaced by raw objective values (no hidden score).
-- Candidates are derived, reproducible data; no user-authored content is lost.
alter table public.solution_candidates
  drop column if exists "setupCost",
  drop column if exists "monthlyCost",
  drop column if exists complexity,
  drop column if exists "evidenceStrength",
  drop column if exists "maintenanceBurden",
  drop column if exists flexibility,
  add column if not exists "sourceBlueprintVersionId" text,
  add column if not exists "tradeoffLabels" text[] not null default '{}',
  add column if not exists objectives jsonb not null default '{}'::jsonb,
  add column if not exists "constraintResults" jsonb not null default '[]'::jsonb,
  add column if not exists "unknownHardConstraints" text[] not null default '{}',
  add column if not exists "softPreferenceMisses" text[] not null default '{}',
  add column if not exists "dominatedBy" text[] not null default '{}',
  add column if not exists assignment jsonb not null default '{}'::jsonb,
  add column if not exists substituted boolean not null default false,
  add column if not exists "equivalentVariants" integer not null default 0,
  add column if not exists feasible boolean not null default true,
  add column if not exists explanation jsonb;
alter table public.solution_candidate_items add column if not exists "slotId" text;

alter table public.audit_events add column if not exists detail jsonb not null default '{}'::jsonb;
-- Audit history must survive account deletion; keep the pseudonymous id without FK.
alter table public.audit_events drop constraint if exists "audit_events_actorId_fkey";

-- ───────────── New tables ─────────────
create table if not exists public.implementation_fingerprints(
  id text primary key,
  name text not null,
  "implementationId" text not null references public.implementation_records(id) on delete cascade,
  "fingerprintVersion" text not null,
  digest text not null check(digest ~ '^[0-9a-f]{64}$'),
  tokens text[] not null default '{}',
  canonical jsonb not null,
  "inputLineage" text[] not null default '{}',
  "computedAt" timestamptz not null default now(),
  provenance text not null default 'inferred',
  unique("implementationId","fingerprintVersion")
);
create index if not exists implementation_fingerprint_digest on public.implementation_fingerprints(digest);

-- Private customer identity for verification. Never exposed publicly or to search.
create table if not exists public.implementation_customer_identities(
  "implementationId" text primary key references public.implementation_records(id) on delete cascade,
  "customerName" text not null check(length("customerName") between 1 and 200),
  "ownerId" uuid not null default auth.uid(),
  "createdAt" timestamptz not null default now()
);

-- Attestor contact details live only here, readable by the service role alone.
create table if not exists public.attestation_contacts(
  "attestationId" text primary key references public.attestations(id) on delete cascade,
  email text not null check(email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  "createdAt" timestamptz not null default now(),
  "deleteAfter" timestamptz not null default now() + interval '30 days'
);

-- ───────────── Row-based access helpers ─────────────
create or replace function public.can_edit_subject(subject_type text, subject_id text)
returns boolean language sql stable security definer set search_path=''
as $$
  select public.is_trusted() or case subject_type
    when 'implementation' then exists(select 1 from public.implementation_records i where i.id=subject_id and i."ownerId"=auth.uid())
    when 'metric' then exists(select 1 from public.implementation_metrics m join public.implementation_records i on i.id=m."implementationId" where m.id=subject_id and i."ownerId"=auth.uid())
    when 'blueprint' then exists(select 1 from public.blueprints b where b.id=subject_id and b."ownerId"=auth.uid())
    else false
  end
$$;

create or replace function public.subject_is_public(subject_type text, subject_id text)
returns boolean language sql stable security definer set search_path=''
as $$
  select case subject_type
    when 'implementation' then public.implementation_is_public(subject_id)
    when 'metric' then exists(select 1 from public.implementation_metrics m where m.id=subject_id and public.implementation_is_public(m."implementationId"))
    when 'blueprint' then public.blueprint_is_public(subject_id)
    when 'technology-relationship' then true
    else false
  end
$$;

-- A claim is public only when accepted, marked public and attached to a public subject.
create or replace function public.claim_is_public(target text)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.claims c where c.id=target and c.public and c.status='accepted' and public.subject_is_public(c."subjectType",c."subjectId"))
$$;

create or replace function public.can_edit_claim(target text)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.claims c where c.id=target and public.can_edit_subject(c."subjectType",c."subjectId"))
$$;

-- ───────────── Claims: ownership, retargeting and review integrity ─────────────
drop policy if exists claims_public_read on public.claims;
drop policy if exists claims_owner_read on public.claims;
drop policy if exists claims_owner_insert on public.claims;
drop policy if exists claims_owner_update on public.claims;
create policy claims_public_read on public.claims for select to anon,authenticated
  using(public and status='accepted' and public.subject_is_public("subjectType","subjectId"));
create policy claims_participant_read on public.claims for select to authenticated
  using(public.can_edit_subject("subjectType","subjectId") or "claimantId"=auth.uid());
create policy claims_owner_insert on public.claims for insert to authenticated
  with check(
    public.is_trusted()
    or (public.can_edit_subject("subjectType","subjectId") and "subjectType"<>'technology-relationship')
    -- Providers and others may file a private correction on any record; reviewers decide.
    or ("subjectType"='implementation' and predicate='provider-correction' and not public and "claimantId"=auth.uid())
  );
create policy claims_owner_update on public.claims for update to authenticated
  using(public.can_edit_subject("subjectType","subjectId"))
  with check(public.can_edit_subject("subjectType","subjectId"));

create or replace function public.protect_claim_review_fields()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if not public.is_trusted() then
    if tg_op = 'INSERT' then
      new."evidenceLevel" := case when new."evidenceLevel" = 'unverified' then 'unverified' else 'creator-reported' end;
      new.status := 'pending';
      new."reviewedAt" := null;
      new."claimantId" := auth.uid();
      new.provenance := case when new.predicate = 'provider-correction' then 'vendor supplied' else 'creator supplied' end;
    elsif row(new."subjectType",new."subjectId",new.predicate,new.value,new.unit,new.period,new."measurementPeriodId",new.public)
        is distinct from row(old."subjectType",old."subjectId",old.predicate,old.value,old.unit,old.period,old."measurementPeriodId",old.public) then
      -- Material change: evidence no longer applies to the new statement.
      new.status := 'pending';
      new."evidenceLevel" := case when old."evidenceLevel" = 'unverified' then 'unverified' else 'creator-reported' end;
      new."reviewedAt" := null;
      new."claimantId" := old."claimantId";
      new.provenance := old.provenance;
    else
      new.status := old.status;
      new."evidenceLevel" := old."evidenceLevel";
      new."reviewedAt" := old."reviewedAt";
      new."claimantId" := old."claimantId";
      new.provenance := old.provenance;
    end if;
  end if;
  new."updatedAt" := now();
  return new;
end $$;
drop trigger if exists protect_claim_review on public.claims;
create trigger protect_claim_review before insert or update on public.claims for each row execute function public.protect_claim_review_fields();

-- ───────────── Trusted fields on implementation records ─────────────
create or replace function public.protect_implementation_review_fields()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  operational text[] := array['updatedAt','moderationState','verificationState','stalenessState','lastEvidenceReviewAt','nextEvidenceReviewAt','demo','provenance','createdAt'];
begin
  if public.is_trusted() then
    new."updatedAt" := now();
    return new;
  end if;
  if exists(select 1 from unnest(new."derivedBlueprintIds") b where not exists(select 1 from public.blueprints x where x.id=b and x."ownerId"=new."ownerId")) then
    raise exception 'derivedBlueprintIds must reference your own Blueprints';
  end if;
  if tg_op = 'INSERT' then
    new."verificationState" := case when new."verificationState"='unverified' then 'unverified' else 'creator-reported' end;
    new."moderationState" := 'pending';
    new."stalenessState" := 'unknown';
    new."lastEvidenceReviewAt" := current_date;
    new.demo := false;
    new.provenance := 'creator supplied';
    new."createdAt" := now();
  else
    new."verificationState" := old."verificationState";
    new."stalenessState" := old."stalenessState";
    new."lastEvidenceReviewAt" := old."lastEvidenceReviewAt";
    new.demo := old.demo;
    new.provenance := old.provenance;
    new."createdAt" := old."createdAt";
    -- Owners may always send a record back to review, never approve it themselves.
    if (to_jsonb(new) - operational) is distinct from (to_jsonb(old) - operational) or new."moderationState"='pending' then
      new."moderationState" := 'pending';
    else
      new."moderationState" := old."moderationState";
    end if;
  end if;
  new."updatedAt" := now();
  return new;
end $$;
drop trigger if exists protect_implementation_review on public.implementation_records;
create trigger protect_implementation_review before insert or update on public.implementation_records for each row execute function public.protect_implementation_review_fields();

-- Child rows: evidence levels are reviewer-controlled; edits send the parent back to review.
create or replace function public.protect_child_evidence_level()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if not public.is_trusted() then
    if tg_op = 'INSERT' then
      new."evidenceLevel" := 'creator-reported';
    else
      new."evidenceLevel" := old."evidenceLevel";
    end if;
  end if;
  return new;
end $$;
create trigger protect_metric_evidence before insert or update on public.implementation_metrics for each row execute function public.protect_child_evidence_level();
create trigger protect_stack_evidence before insert or update on public.implementation_stack_items for each row execute function public.protect_child_evidence_level();
create trigger protect_connection_evidence before insert or update on public.implementation_connections for each row execute function public.protect_child_evidence_level();

create or replace function public.remoderate_implementation_parent()
returns trigger language plpgsql security definer set search_path=''
as $$
declare target text := coalesce(new."implementationId", old."implementationId");
begin
  if not public.is_trusted() then
    update public.implementation_records set "moderationState"='pending' where id=target and "moderationState"='approved';
  end if;
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['implementation_contexts','implementation_process_steps','implementation_stack_items','implementation_connections','implementation_use_cases','implementation_capabilities','measurement_periods','implementation_metrics'] loop
    execute format('create trigger remoderate_parent after insert or update or delete on public.%I for each row execute function public.remoderate_implementation_parent()', t);
  end loop;
end $$;

-- ───────────── Blueprints ─────────────
create or replace function public.protect_blueprint_review_fields()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  operational text[] := array['updatedAt','moderationState','compatibilityState','demo','provenance','lastValidatedAt','createdAt'];
begin
  if not public.is_trusted() then
    if new."derivedFromImplementationId" is not null and not exists(
      select 1 from public.implementation_records i where i.id=new."derivedFromImplementationId" and i."ownerId"=new."ownerId") then
      raise exception 'A Blueprint can only be derived from your own implementation record';
    end if;
    if tg_op = 'INSERT' then
      new."moderationState" := 'pending';
      new."compatibilityState" := 'unknown';
      new.demo := false;
      new.provenance := 'creator supplied';
    else
      new."compatibilityState" := old."compatibilityState";
      new.demo := old.demo;
      new.provenance := old.provenance;
      if (to_jsonb(new) - operational) is distinct from (to_jsonb(old) - operational) or new."moderationState"='pending' then
        new."moderationState" := 'pending';
      else
        new."moderationState" := old."moderationState";
      end if;
    end if;
  end if;
  if new."publicationState"='published' and new."moderationState"='approved' and not exists(
    select 1 from public.blueprint_versions v where v.id=new."currentVersionId" and v."blueprintId"=new.id) then
    raise exception 'A published Blueprint must point at one of its own versions';
  end if;
  new."updatedAt" := now();
  return new;
end $$;
drop trigger if exists protect_blueprint_review on public.blueprints;
create trigger protect_blueprint_review before insert or update on public.blueprints for each row execute function public.protect_blueprint_review_fields();

create or replace function public.remoderate_blueprint_parent()
returns trigger language plpgsql security definer set search_path=''
as $$
declare target text;
begin
  if public.is_trusted() then return coalesce(new, old); end if;
  if tg_table_name in ('blueprint_versions','blueprint_requirements','blueprint_licenses') then
    target := coalesce(new."blueprintId", old."blueprintId");
  else
    select v."blueprintId" into target from public.blueprint_versions v where v.id=coalesce(new."blueprintVersionId", old."blueprintVersionId");
  end if;
  update public.blueprints set "moderationState"='pending' where id=target and "moderationState"='approved';
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['blueprint_versions','blueprint_stack_items','blueprint_connections','blueprint_requirements','blueprint_licenses'] loop
    execute format('create trigger remoderate_blueprint after insert or update or delete on public.%I for each row execute function public.remoderate_blueprint_parent()', t);
  end loop;
end $$;

-- ───────────── Attestations: created and completed only server-side ─────────────
drop policy if exists attestation_owner_insert on public.attestations;
drop policy if exists attestation_admin_update on public.attestations;
create policy attestation_owner_revoke on public.attestations for update to authenticated
  using("ownerId"=auth.uid() or public.is_admin()) with check("ownerId"=auth.uid() or public.is_admin());
create or replace function public.protect_attestation()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if public.is_trusted() then return new; end if;
  -- Owners may only revoke a pending invitation.
  if old.status <> 'pending' or new.status <> 'revoked'
     or (to_jsonb(new) - array['status','revokedAt','updatedAt']) is distinct from (to_jsonb(old) - array['status','revokedAt','updatedAt']) then
    raise exception 'Attestations can only be revoked by their owner';
  end if;
  new."revokedAt" := now();
  new."updatedAt" := now();
  return new;
end $$;
create trigger protect_attestation before update on public.attestations for each row execute function public.protect_attestation();

alter table public.attestation_contacts enable row level security; -- no policies: service role only
alter table public.implementation_customer_identities enable row level security;
create policy customer_identity_owner on public.implementation_customer_identities for all to authenticated
  using(public.is_admin() or ("ownerId"=auth.uid() and public.can_edit_implementation("implementationId")))
  with check("ownerId"=auth.uid() and public.can_edit_implementation("implementationId"));

-- ───────────── Evidence ─────────────
alter table public.evidence_artifacts add constraint evidence_path_owner
  check("storagePath"='' or "storagePath" like 'implementation-evidence/' || "ownerId"::text || '/%') not valid;
alter table public.evidence_artifacts add constraint evidence_safe_mime
  check("mimeType" in ('','application/pdf','image/png','image/jpeg','image/webp','text/plain','text/csv','application/json')) not valid;
drop policy if exists claim_evidence_write on public.claim_evidence;
drop policy if exists claim_evidence_private on public.claim_evidence;
create policy claim_evidence_read on public.claim_evidence for select to authenticated
  using(public.is_admin() or exists(select 1 from public.evidence_artifacts e where e.id="evidenceArtifactId" and e."ownerId"=auth.uid()) or public.can_edit_claim("claimId"));
create policy claim_evidence_write on public.claim_evidence for all to authenticated
  using(public.is_admin() or (exists(select 1 from public.evidence_artifacts e where e.id="evidenceArtifactId" and e."ownerId"=auth.uid()) and public.can_edit_claim("claimId")))
  with check(public.is_admin() or (exists(select 1 from public.evidence_artifacts e where e.id="evidenceArtifactId" and e."ownerId"=auth.uid()) and public.can_edit_claim("claimId")));

-- Legacy storage policy applied to every bucket; restrict to its own buckets.
drop policy if exists own_asset_update on storage.objects;
create policy own_asset_update on storage.objects for update to authenticated
  using(bucket_id in ('logos','product-screenshots','video-media','company-media','documents') and (storage.foldername(name))[1]=(select auth.uid())::text and public.is_supplier())
  with check(bucket_id in ('logos','product-screenshots','video-media','company-media','documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Evidence objects are written by the evidence Edge Function via signed upload URLs only.
drop policy if exists intelligence_evidence_object_insert on storage.objects;
drop policy if exists intelligence_evidence_object_update on storage.objects;

-- ───────────── Reviews and verification history: append-only ─────────────
drop policy if exists evidence_reviews_admin on public.evidence_reviews;
create policy evidence_reviews_read on public.evidence_reviews for select to authenticated using(public.is_admin() or public.can_edit_claim("claimId"));
create policy evidence_reviews_insert on public.evidence_reviews for insert to authenticated with check(public.is_admin() and "reviewerId"=auth.uid());
drop policy if exists verification_events_admin on public.verification_events;
create policy verification_events_read on public.verification_events for select to authenticated using(public.is_admin());
create policy verification_events_insert on public.verification_events for insert to authenticated with check(public.is_admin() and "actorId"=auth.uid()::text);

create or replace function public.forbid_history_change()
returns trigger language plpgsql set search_path=''
as $$ begin raise exception '% is append-only', tg_table_name; end $$;
create trigger audit_events_append_only before update or delete on public.audit_events for each row execute function public.forbid_history_change();
create trigger evidence_reviews_append_only before update or delete on public.evidence_reviews for each row execute function public.forbid_history_change();
create trigger verification_events_append_only before update or delete on public.verification_events for each row execute function public.forbid_history_change();

-- ───────────── Audit with field-level change lists (values only for state fields) ─────────────
create or replace function public.record_intelligence_audit()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  state_fields text[] := array['verificationState','evidenceLevel','status','moderationState','publicationState','relationshipType','reuseRights','commercialUseAllowed','visibility','customerIdentityVisibility','result','rights'];
  changed text[];
  states jsonb := '{}'::jsonb;
  f text;
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}') into changed
      from jsonb_each(to_jsonb(new)) n where n.value is distinct from (to_jsonb(old)->n.key) and n.key <> 'updatedAt';
    foreach f in array state_fields loop
      if f = any(changed) then states := states || jsonb_build_object(f, jsonb_build_array(to_jsonb(old)->f, to_jsonb(new)->f)); end if;
    end loop;
    if cardinality(changed) = 0 then return new; end if;
  end if;
  insert into public.audit_events(id,name,provenance,"actorId","entityId","entityType",action,at,detail)
  values(gen_random_uuid()::text, tg_table_name || ' ' || lower(tg_op), 'verified', auth.uid(),
         coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'implementationId', to_jsonb(new)->>'attestationId'), tg_table_name, lower(tg_op), now(),
         jsonb_build_object('changed', to_jsonb(coalesce(changed, '{}'::text[])), 'states', states));
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['attestations','evidence_artifacts','claim_evidence','evidence_reviews','verification_events','implementation_metrics','implementation_stack_items','blueprint_versions','blueprint_licenses','compatibility_checks','relationship_evidence','user_roles'] loop
    execute format('drop trigger if exists intelligence_audit on public.%I', t);
    execute format('create trigger intelligence_audit after insert or update or delete on public.%I for each row execute function public.record_intelligence_audit()', t);
  end loop;
end $$;

-- ───────────── Cross-tenant references ─────────────
drop policy if exists solution_run_owner on public.solution_runs;
create policy solution_run_owner on public.solution_runs for all to authenticated
  using("ownerId"=auth.uid() or public.is_admin())
  with check("ownerId"=auth.uid() and exists(select 1 from public.requirement_profiles p where p.id="requirementProfileId" and p."ownerId"=auth.uid()));

-- ───────────── Relationship evidence submissions ─────────────
drop policy if exists relationship_evidence_read on public.relationship_evidence;
drop policy if exists relationship_evidence_admin on public.relationship_evidence;
create policy relationship_evidence_read on public.relationship_evidence for select to anon,authenticated
  using("evidenceLevel" not in ('creator-reported','unverified') or "submittedBy"=auth.uid() or public.is_admin());
create policy relationship_evidence_submit on public.relationship_evidence for insert to authenticated
  with check("submittedBy"=auth.uid() and "evidenceLevel"='creator-reported');
create policy relationship_evidence_admin on public.relationship_evidence for update to authenticated using(public.is_admin()) with check(public.is_admin());

-- ───────────── Fingerprints ─────────────
alter table public.implementation_fingerprints enable row level security;
create policy fingerprint_read on public.implementation_fingerprints for select to anon,authenticated
  using(public.implementation_is_public("implementationId") or public.can_edit_implementation("implementationId"));
create policy fingerprint_write on public.implementation_fingerprints for all to authenticated
  using(public.can_edit_implementation("implementationId")) with check(public.can_edit_implementation("implementationId"));

-- ───────────── Analytics events for implementation intelligence ─────────────
alter table public.marketplace_events drop constraint if exists marketplace_events_event_check;
alter table public.marketplace_events add constraint marketplace_events_event_check check(event in (
  'build_view','technology_view','save_build','save_technology','remix_build','outbound_demo_click','source_click','provider_click','offer_click','contact_creator','search','filter_use',
  'implementation_view','implementation_saved','metric_provenance_opened','implementation_compared','context_similarity_viewed','blueprint_view','blueprint_started',
  'solution_compiler_started','requirement_confirmed','compiler_run_completed','candidate_viewed','candidate_rejected','candidate_substitution','implementation_request_started','implementer_contacted'));

-- ───────────── Search: include recorded technologies and evidence methods ─────────────
create or replace view public.search_documents with (security_invoker=true) as
 select i.id,i.name,i.summary description,'Implementation'::text type,'/implementations/'||i.slug path,i.provenance,
   i."contextSummary"||' '||i."problemStatement"||' '||i.industry||' '||i."businessType"||' '||i."organizationSizeBand"||' '||i.region||' '||i."verificationState"||' '||
   coalesce((select array_to_string(c."existingSystems",' ')||' '||array_to_string(c."workflowCharacteristics",' ') from public.implementation_contexts c where c."implementationId"=i.id),'')||' '||
   coalesce((select string_agg(p.data->>'name',' ') from public.implementation_stack_items s join public.products p on p.id=s."productId" where s."implementationId"=i.id),'')||' '||
   coalesce((select string_agg(distinct replace(cl."evidenceLevel",'-',' '),' ') from public.claims cl where cl.public and cl.status='accepted' and (cl."subjectId"=i.id or cl."subjectId" like i.id||'-%')),'') body,
   i."updatedAt" updated_at
 from public.implementation_records i
 where i.visibility='public' and i."publicationState"='published' and i."moderationState"='approved'
 union all
 select b.id,b.name,b.description,'Blueprint','/blueprints/'||b.slug,b.provenance,
   b.description||' '||array_to_string(b."capabilityIds",' ')||' '||case when 'human-escalation'=any(b."capabilityIds") then 'human approval review ' else '' end||array_to_string(b."requiredSkills",' ')||' '||b."reuseRights"||' '||b."estimatedComplexity"||' '||b."knownLimitations",b."updatedAt"
 from public.blueprints b where b."publicationState"='published' and b."moderationState"='approved'
 union all
 select b.id,b.name,b.tagline,'Build','/builds/'||b.slug,b.provenance,
   b.description||' '||b.industry||' '||coalesce((select string_agg(p.data->>'name',' ') from public.build_stack_items s join public.products p on p.id=s."productId" where s."buildId"=b.id),'')||' '||coalesce((select string_agg(u.data->>'name',' ') from public.build_use_cases x join public.use_cases u on u.id=x."useCaseId" where x."buildId"=b.id),'')||' '||coalesce((select c.name from public.creator_profiles c where c.id=b."creatorId"),'') body,b."updatedAt"
 from public.builds b where b.visibility='public' and b.publication='published' and b.moderation='approved'
 union all select id,name,headline,'Creator','/creators/'||slug,provenance,bio||' '||array_to_string(expertise,' '),"createdAt" from public.creator_profiles
 union all select id,data->>'name',data->>'description','Technology','/technologies/'||(data->>'slug'),provenance::text,(data->>'description')||' '||coalesce(data->>'capabilityIds',''),updated_at from public.products where published
 union all select id,data->>'name',data->>'description','Use case','/use-cases/'||(data->>'slug'),provenance::text,coalesce(data->>'outcome',''),updated_at from public.use_cases where published
 union all select id,data->>'name',data->>'description','Provider','/providers/'||(data->>'slug'),provenance::text,coalesce(data->>'specialties',''),updated_at from public.providers where published
 union all select 'implementer-'||id,data->>'name',data->>'description','Implementer','/implementers/'||(data->>'slug'),provenance::text,coalesce(data->>'specialties','')||' '||coalesce(data->>'region',''),updated_at from public.integrators where published
 union all select id,data->>'name',data->>'description','Stack','/solution-stacks/'||(data->>'slug'),provenance::text,coalesce(data->>'description',''),updated_at from public.solution_stacks where published
 union all select id,data->>'name',data->>'description','Resource','/resources/'||(data->>'slug'),provenance::text,coalesce(data->>'body',''),updated_at from public.articles where published;

-- ───────────── Attestation operations (service role only, atomic) ─────────────
create or replace function public.create_attestation(
  p_owner uuid, p_implementation text, p_claims text[], p_label text, p_visibility text,
  p_token_hash text, p_expires timestamptz, p_email text)
returns text language plpgsql security definer set search_path=''
as $$
declare new_id text := 'attestation-' || substr(p_token_hash, 1, 16);
begin
  if not exists(select 1 from public.implementation_records i where i.id=p_implementation and i."ownerId"=p_owner) then
    raise exception 'not owner';
  end if;
  -- Every scoped claim must belong to this implementation (directly or via one of its metrics).
  if exists(select 1 from unnest(p_claims) c where not exists(
      select 1 from public.claims x where x.id=c and (
        (x."subjectType"='implementation' and x."subjectId"=p_implementation)
        or (x."subjectType"='metric' and exists(select 1 from public.implementation_metrics m where m.id=x."subjectId" and m."implementationId"=p_implementation))))) then
    raise exception 'claim outside implementation';
  end if;
  if (select count(*) from public.attestations a where a."implementationId"=p_implementation and a.status='pending') >= 20 then
    raise exception 'too many pending invitations';
  end if;
  insert into public.attestations(id,name,"implementationId","ownerId","tokenHash","expiresAt",status,"customerIdentityVisibility","attestorLabel","claimIds",provenance)
  values(new_id,'Attestation request: '||p_label,p_implementation,p_owner,p_token_hash,p_expires,'pending',p_visibility,p_label,p_claims,'creator supplied');
  insert into public.attestation_contacts("attestationId",email) values(new_id,p_email);
  return new_id;
end $$;

create or replace function public.apply_attestation(p_token_hash text, p_decisions jsonb, p_visibility text)
returns void language plpgsql security definer set search_path=''
as $$
declare
  a public.attestations;
  claim_id text;
  decision text;
  previous text;
  next_level text;
begin
  select * into a from public.attestations where "tokenHash"=p_token_hash for update;
  if a.id is null or a.status<>'pending' or a."expiresAt"<=now() then raise exception 'not usable'; end if;
  for claim_id, decision in select key, value#>>'{}' from jsonb_each(p_decisions) loop
    if not claim_id = any(a."claimIds") or decision not in ('confirm','reject') then raise exception 'out of scope'; end if;
    select "evidenceLevel" into previous from public.claims where id=claim_id;
    next_level := case when decision='confirm' then 'customer-attested' when previous in ('demo','unverified') then previous else 'creator-reported' end;
    update public.claims set status=case when decision='confirm' then 'accepted' else 'rejected' end,
      "evidenceLevel"=next_level, "reviewedAt"=now() where id=claim_id;
    insert into public.verification_events(id,name,"subjectType","subjectId",action,"actorId",at,"previousLevel","nextLevel",provenance)
    values(a.id||'-'||claim_id,case when decision='confirm' then 'Customer confirmed claim' else 'Customer rejected claim' end,'claim',claim_id,
      case when decision='confirm' then 'customer-confirmed' else 'customer-rejected' end,'customer-attestor:'||a.id,now(),previous,next_level,'verified');
  end loop;
  update public.attestations set status='submitted',"submittedAt"=now(),decisions=p_decisions,"customerIdentityVisibility"=p_visibility,"updatedAt"=now() where id=a.id;
  -- Data minimization: the contact address is no longer needed once the link is used.
  delete from public.attestation_contacts where "attestationId"=a.id;
end $$;

revoke execute on function public.create_attestation(uuid,text,text[],text,text,text,timestamptz,text) from public, anon, authenticated;
revoke execute on function public.apply_attestation(text,jsonb,text) from public, anon, authenticated;
grant execute on function public.create_attestation(uuid,text,text[],text,text,text,timestamptz,text) to service_role;
grant execute on function public.apply_attestation(text,jsonb,text) to service_role;
