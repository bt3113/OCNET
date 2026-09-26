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
