-- Marketplace follow-ups after the 2026-09-26 release (docs/release-handover.md):
-- proposal-outcome notifications, Use Case restore, vendor claim verification,
-- scheduled maintenance, and removal of an unused table.

-- ───────────── Proposal outcome notifications ─────────────
-- Any decision (map, approve, reject — through the RPCs or an admin edit) tells the
-- proposer what happened. Notifications are owner-readable only (notification_read).
create or replace function public.notify_use_case_proposal() returns trigger
language plpgsql security definer set search_path='' as $$
declare target_name text; target_slug text; body text; title text; href text;
begin
  if old.status <> 'pending' or new.status = 'pending' then return new; end if;
  select u.data->>'name', coalesce(u.data->>'slug', u.id) into target_name, target_slug from public.use_cases u where u.id = new."resolvedUseCaseId";
  if new.status = 'mapped' then
    title := 'Use Case proposal matched';
    body := format('Your proposed Use Case “%s” describes the existing Use Case “%s”. Your Build is now listed under it.%s',
      new."suggestedTitle", target_name, case when new."reviewNote" <> '' then ' Moderator note: ' || new."reviewNote" else '' end);
    href := '/use-cases/' || target_slug;
  elsif new.status = 'approved' then
    title := 'Use Case proposal approved';
    body := format('“%s” is now a public Use Case, and your Build is listed under it. Your original wording is kept with the record.', target_name);
    href := '/use-cases/' || target_slug;
  else
    title := 'Use Case proposal not approved';
    body := format('Your proposed Use Case “%s” was not approved%s Your Build keeps its other Use Cases.',
      new."suggestedTitle", case when new."reviewNote" <> '' then ': ' || new."reviewNote" else '.' end);
    href := '/creator/builds/' || new."buildId" || '/edit';
  end if;
  insert into public.notifications(id, owner_id, published, provenance, data)
  values('notification-proposal-' || new.id || '-' || new.status, new."proposedBy", true, 'community supplied',
         jsonb_build_object('id', 'notification-proposal-' || new.id || '-' || new.status, 'name', title, 'body', body, 'href', href, 'read', false,
                            'createdAt', now(), 'provenance', 'community supplied'))
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.notify_use_case_proposal() from public, anon, authenticated;
create trigger notify_use_case_proposal after update of status on public.use_case_proposals
  for each row execute function public.notify_use_case_proposal();

-- ───────────── Solution Provider fields on creator profiles ─────────────
-- The public Solution Provider type, and an optional link to an implementer record.
-- The link merges that implementer's deployment records into the profile, so only an
-- administrator may set or change it.
alter table public.creator_profiles
  add column if not exists "providerType" text check ("providerType" is null or "providerType" in ('Agency','Freelancer','Consultancy','Studio','Systems Integrator','Independent Builder')),
  add column if not exists "integratorId" text references public.integrators(id) on delete set null;

create or replace function public.guard_creator_integrator_link() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if current_user in ('postgres','supabase_admin') or auth.role() = 'service_role' or public.is_admin() then return new; end if;
  if new."integratorId" is distinct from (case when tg_op = 'UPDATE' then old."integratorId" end) then
    raise exception 'Only an administrator can link a profile to an implementer record';
  end if;
  return new;
end $$;
create trigger guard_creator_integrator_link before insert or update on public.creator_profiles
  for each row execute function public.guard_creator_integrator_link();

-- ───────────── Indexing guard runs at commit ─────────────
-- save_build writes the Build row before its Use Case links, so the "approved Build has
-- an approved Use Case" rule must be checked when the transaction commits, not per row.
-- Removing a Build's last Use Case is checked the same way.
create or replace function public.guard_build_indexing() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new."useCaseProposalId" is not null and not exists(
    select 1 from public.use_case_proposals p where p.id = new."useCaseProposalId" and p."buildId" = new.id and p.status = 'pending'
  ) then
    raise exception 'The linked proposal must be this Build''s open proposal';
  end if;
  if new."blueprintId" is distinct from (case when tg_op = 'UPDATE' then old."blueprintId" end)
     and new."blueprintId" is not null and not public.is_trusted()
     and not exists(select 1 from public.blueprints b where b.id = new."blueprintId" and b."ownerId" = auth.uid()) then
    raise exception 'Only the Blueprint owner can attach it to a Build';
  end if;
  return new;
end $$;

create or replace function public.check_build_has_use_case() returns trigger
language plpgsql security definer set search_path='' as $$
declare target text;
begin
  -- Separate branches: builds has no "buildId" and build_use_cases fires on delete only.
  if tg_table_name = 'builds' then target := new.id; else target := old."buildId"; end if;
  if exists(select 1 from public.builds b where b.id = target and b.moderation = 'approved' and b.publication = 'published')
     and not exists(select 1 from public.build_use_cases where "buildId" = target) then
    raise exception 'A Build needs an approved Use Case before it can be approved';
  end if;
  return null;
end $$;
revoke execute on function public.check_build_has_use_case() from public, anon, authenticated;
create constraint trigger check_build_has_use_case after insert or update on public.builds
  deferrable initially deferred for each row execute function public.check_build_has_use_case();
create constraint trigger check_build_keeps_use_case after delete on public.build_use_cases
  deferrable initially deferred for each row execute function public.check_build_has_use_case();

-- ───────────── Restore an archived Use Case; audit label changes ─────────────
create or replace function public.restore_use_case(target text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Moderation requires administrator'; end if;
  update public.use_cases set data = data || jsonb_build_object('status','approved','updatedAt',now()), published = true
   where id = target and status = 'archived';
  if not found then raise exception 'Only an archived Use Case can be restored'; end if;
  insert into public.audit_events(id,name,provenance,"actorId","entityId","entityType",action,at)
  values(gen_random_uuid()::text,'Use Case restored','verified',auth.uid(),target,'use_cases','restored',now());
end $$;
revoke execute on function public.restore_use_case(text) from public, anon;
grant execute on function public.restore_use_case(text) to authenticated;

-- Labels are edited directly by administrators (RLS aliases_admin); record every change.
create or replace function public.audit_use_case_alias() returns trigger
language plpgsql security definer set search_path='' as $$
declare row_id text; use_case text; detail text;
begin
  if tg_op = 'DELETE' then row_id := old.id; use_case := old."useCaseId"; detail := 'removed label ' || old.label;
  elsif tg_op = 'UPDATE' then row_id := new.id; use_case := new."useCaseId"; detail := 'label ' || old.label || ' → ' || new.label || ' (' || new."aliasType" || ')';
  else row_id := new.id; use_case := new."useCaseId"; detail := 'added label ' || new.label || ' (' || new."aliasType" || ')';
  end if;
  insert into public.audit_events(id,name,provenance,"actorId","entityId","entityType",action,at)
  values(gen_random_uuid()::text,'Use Case label changed','verified',auth.uid(),use_case,'use_case_aliases',left(detail, 500),now());
  return null;
end $$;
revoke execute on function public.audit_use_case_alias() from public, anon, authenticated;
create trigger audit_use_case_alias after insert or update or delete on public.use_case_aliases
  for each row execute function public.audit_use_case_alias();

-- ───────────── Technology Vendor claims: domain + DNS verification ─────────────
-- Claimants prove control of the vendor's own domain with a TXT record at
-- _oracnet-verification.<domain>. Only a reviewer records the DNS result; approval
-- requires a verified result and marks the vendor listing as claimed.
alter table public.provider_claims
  add column if not exists domain text check (domain is null or domain ~ '^([a-z0-9-]{1,63}\.)+[a-z]{2,63}$'),
  add column if not exists "contactEmail" text check ("contactEmail" is null or length("contactEmail") <= 254),
  add column if not exists "verificationToken" text not null default replace(gen_random_uuid()::text, '-', ''),
  add column if not exists "dnsResult" text check ("dnsResult" is null or "dnsResult" in ('verified','not-found','error')),
  add column if not exists "dnsCheckedAt" timestamptz,
  add column if not exists "dnsVerifiedAt" timestamptz,
  add column if not exists "dnsDetail" text check ("dnsDetail" is null or length("dnsDetail") <= 500);
-- New approvals need a verified DNS check (existing rows are left as they were).
alter table public.provider_claims add constraint provider_claim_approval_verified
  check (status <> 'approved' or ("dnsVerifiedAt" is not null and "dnsResult" = 'verified')) not valid;

create or replace function public.guard_provider_claim() returns trigger
language plpgsql security invoker set search_path='' as $$
declare site_host text;
begin
  if current_user in ('postgres','supabase_admin') or auth.role() = 'service_role' or public.is_admin() then return new; end if;
  -- Claimants never record their own verification.
  if new."dnsResult" is not null or new."dnsCheckedAt" is not null or new."dnsVerifiedAt" is not null or new."dnsDetail" is not null then
    raise exception 'Only a reviewer records the DNS check';
  end if;
  select lower(substring(p.data->>'website' from '^https?://(?:www\.)?([^/:?#]+)')) into site_host from public.providers p where p.id = new."providerId";
  if new.domain is null or site_host is null or not (site_host = new.domain or site_host like '%.' || new.domain) then
    raise exception 'The claim domain must be the vendor''s own domain';
  end if;
  if new."contactEmail" is null or not (lower(new."contactEmail") like '%@' || new.domain or lower(new."contactEmail") like '%.' || new.domain) then
    raise exception 'Use a work email address at the claimed domain';
  end if;
  return new;
end $$;
create trigger guard_provider_claim before insert or update on public.provider_claims
  for each row execute function public.guard_provider_claim();

create or replace function public.apply_provider_claim() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.providers p
       set data = p.data || jsonb_build_object('listing',
             jsonb_build_object('compiledBy','Oracnet','sourcedAt', to_char(now(),'YYYY-MM-DD'),
                                'sources', jsonb_build_array(jsonb_build_object('label', p.data->>'name' || ' website', 'url', p.data->>'website')),
                                'tagline', p.data->>'description', 'about', p.data->>'description')
             || coalesce(p.data->'listing','{}'::jsonb)
             || jsonb_build_object('status','claimed','claimedAt', now(), 'claimId', new.id))
     where p.id = new."providerId";
    insert into public.audit_events(id,name,provenance,"actorId","entityId","entityType",action,at)
    values(gen_random_uuid()::text,'Vendor claim approved','verified',auth.uid(),new.id,'provider_claims','approved for ' || new.domain,now());
  end if;
  return null;
end $$;
revoke execute on function public.apply_provider_claim() from public, anon, authenticated;
create trigger apply_provider_claim after update of status on public.provider_claims
  for each row execute function public.apply_provider_claim();
