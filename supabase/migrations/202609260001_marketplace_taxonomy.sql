-- Marketplace taxonomy: Category → Subcategory → Use Case, Use Case sources (attribution,
-- never ownership), controlled-vocabulary aliases, moderated proposals, redirects, and
-- Build ↔ Use Case roles with a hard limit of three Use Cases per Build.

alter type public.provenance_state add value if not exists 'inferred';

-- ───────────── Categories ─────────────
create table public.use_case_categories(
  id text primary key check(id ~ '^[a-z0-9-]+$'),
  slug text not null unique check(slug ~ '^[a-z0-9-]+$'),
  name text not null check(length(name) between 2 and 80),
  description text not null default '' check(length(description) <= 500),
  level text not null check(level in ('category','subcategory')),
  "parentId" text references public.use_case_categories(id),
  "sortOrder" integer not null default 0,
  provenance text not null default 'inferred',
  check((level = 'category' and "parentId" is null) or (level = 'subcategory' and "parentId" is not null))
);
create index use_case_categories_parent_idx on public.use_case_categories("parentId");

-- ───────────── Use Cases (JSON documents) gain taxonomy and lifecycle columns ─────────────
alter table public.use_cases
  add column category_id text generated always as (data->>'categoryId') stored references public.use_case_categories(id),
  add column subcategory_id text generated always as (data->>'subcategoryId') stored references public.use_case_categories(id),
  add column status text generated always as (coalesce(data->>'status','approved')) stored,
  add column origin_type text generated always as (data->>'originType') stored,
  add column merged_into_id text generated always as (data->>'mergedIntoId') stored references public.use_cases(id),
  add constraint use_case_status check (status in ('approved','pending','merged','archived','rejected')),
  add constraint use_case_origin check (origin_type is null or origin_type in ('technology-vendor-sourced','solution-provider-proposed','oracnet-editorial')),
  add constraint use_case_published_approved check (not published or status = 'approved'),
  add constraint use_case_title check (length(data->>'name') between 3 and 160);
create index use_cases_category_idx on public.use_cases(category_id, subcategory_id) where published;
create index use_cases_status_idx on public.use_cases(status);

create or replace function public.use_case_is_public(target text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.use_cases u where u.id = target and u.published and u.status = 'approved')
$$;
revoke execute on function public.use_case_is_public(text) from public;
grant execute on function public.use_case_is_public(text) to anon, authenticated, service_role;

-- Use Cases are created only through moderation (approve RPC) or by administrators.
drop policy if exists creator_use_case_insert on public.use_cases;

-- ───────────── Sources, aliases, redirects ─────────────
create table public.use_case_sources(
  id text primary key,
  name text not null,
  "useCaseId" text not null references public.use_cases(id) on delete cascade,
  "sourceType" text not null check("sourceType" in ('technology-vendor','solution-provider','oracnet-editorial')),
  "sourceEntityId" text not null,
  "originalTitle" text check("originalTitle" is null or length("originalTitle") <= 300),
  "originalDescription" text not null check(length("originalDescription") between 1 and 2000),
  "productIds" text[] not null default '{}',
  "sourceUrl" text check("sourceUrl" is null or ("sourceUrl" ~ '^https://' and length("sourceUrl") < 2000)),
  "retrievedAt" date,
  "lastCheckedAt" date,
  "captureMethod" text,
  attribution text not null,
  status text not null default 'active' check(status in ('active','needs-verification','superseded')),
  provenance text not null default 'third-party sourced',
  "createdAt" timestamptz not null default now()
);
create index use_case_sources_use_case_idx on public.use_case_sources("useCaseId");
create index use_case_sources_entity_idx on public.use_case_sources("sourceType","sourceEntityId");

create table public.use_case_aliases(
  id text primary key,
  name text not null,
  "useCaseId" text not null references public.use_cases(id) on delete cascade,
  label text not null check(length(label) between 1 and 200),
  "aliasType" text not null check("aliasType" in ('preferred','alternate','hidden-search','original-source')),
  "normalizedLabel" text not null check(length("normalizedLabel") between 1 and 200),
  language text not null default 'en',
  source text not null default '',
  provenance text not null default 'inferred',
  unique("useCaseId","normalizedLabel")
);
create index use_case_aliases_label_idx on public.use_case_aliases("normalizedLabel");
-- One preferred label per Use Case and language (SKOS S14).
create unique index use_case_aliases_one_preferred on public.use_case_aliases("useCaseId", language) where "aliasType" = 'preferred';

create table public.use_case_redirects(
  id text primary key,
  name text not null,
  "fromSlug" text not null unique check("fromSlug" ~ '^[a-z0-9-]+$'),
  "targetType" text not null check("targetType" in ('use-case','category')),
  target text not null,
  reason text not null check(reason in ('merged','retired-broad-area','renamed','migrated-listing')),
  provenance text not null default 'inferred',
  "createdAt" timestamptz not null default now()
);

-- ───────────── Proposals ─────────────
create table public.use_case_proposals(
  id text primary key default gen_random_uuid()::text,
  name text not null default 'Use Case proposal',
  "buildId" text not null references public.builds(id) on delete cascade,
  "creatorId" text not null references public.creator_profiles(id),
  "proposedBy" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "originalText" text not null check(length("originalText") between 8 and 200),
  "suggestedTitle" text not null check(length("suggestedTitle") between 8 and 120),
  "suggestedCategoryId" text references public.use_case_categories(id),
  "suggestedSubcategoryId" text references public.use_case_categories(id),
  status text not null default 'pending' check(status in ('pending','approved','mapped','rejected')),
  "resolvedUseCaseId" text references public.use_cases(id),
  "reviewedBy" uuid references auth.users(id),
  "reviewedAt" timestamptz,
  "reviewNote" text not null default '',
  "createdAt" timestamptz not null default now(),
  provenance text not null default 'community supplied'
);
-- One open proposal per Build.
create unique index use_case_proposals_one_pending on public.use_case_proposals("buildId") where status = 'pending';
create index use_case_proposals_status_idx on public.use_case_proposals(status, "createdAt");

-- ───────────── Builds ↔ Use Cases ─────────────
alter table public.builds
  add column "useCaseProposalId" text references public.use_case_proposals(id) on delete set null,
  add column "blueprintId" text references public.blueprints(id) on delete set null;
alter table public.blueprints add column if not exists "buildId" text references public.builds(id) on delete set null;

alter table public.build_use_cases
  add column role text not null default 'secondary' check(role in ('primary','secondary')),
  add column "sortOrder" integer not null default 0 check("sortOrder" between 0 and 2);
create unique index build_use_cases_one_primary on public.build_use_cases("buildId") where role = 'primary';

-- Business rules the UI cannot be trusted to enforce: at most three Use Cases per Build
-- (counting an open proposal), only approved public Use Cases, one open proposal.
create or replace function public.enforce_build_use_cases() returns trigger
language plpgsql security definer set search_path='' as $$
declare target text; linked integer; open_proposals integer;
begin
  target := coalesce(new."buildId", old."buildId");
  -- Nested IFs: PL/pgSQL would otherwise resolve new."useCaseId" on the proposals table.
  if tg_table_name = 'build_use_cases' then
    if not public.use_case_is_public(new."useCaseId") then
      raise exception 'Only approved Use Cases can be linked to a Build';
    end if;
  end if;
  select count(*) into linked from public.build_use_cases where "buildId" = target;
  select count(*) into open_proposals from public.use_case_proposals where "buildId" = target and status = 'pending';
  if linked + open_proposals > 3 then
    raise exception 'A Build can address at most 3 Use Cases, including a proposed one';
  end if;
  return coalesce(new, old);
end $$;
create trigger enforce_build_use_cases after insert or update on public.build_use_cases for each row execute function public.enforce_build_use_cases();
create trigger enforce_build_use_case_proposals after insert or update on public.use_case_proposals for each row execute function public.enforce_build_use_cases();

-- A Build may be submitted with only a proposal, but is never approved (indexed) until it
-- has at least one approved Use Case.
create or replace function public.guard_build_indexing() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.moderation = 'approved' and new.publication = 'published'
     and not exists(select 1 from public.build_use_cases where "buildId" = new.id) then
    raise exception 'A Build needs an approved Use Case before it can be approved';
  end if;
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
create trigger guard_build_indexing before insert or update on public.builds for each row execute function public.guard_build_indexing();

-- Build documents keep Use Case order (first = primary) and the new links.
create or replace function public.build_document(target text) returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(b)||jsonb_build_object(
 'stack',coalesce((select jsonb_agg(to_jsonb(s)-'buildId'-'position' order by position) from public.build_stack_items s where s."buildId"=b.id),'[]'::jsonb),
 'connections',coalesce((select jsonb_agg(to_jsonb(c)-'buildId') from public.build_connections c where c."buildId"=b.id),'[]'::jsonb),
 'media',coalesce((select jsonb_agg(to_jsonb(m)-'buildId'-'position' order by position) from public.build_media m where m."buildId"=b.id),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(to_jsonb(s)-'buildId') from public.build_sources s where s."buildId"=b.id),'[]'::jsonb),
 'useCaseIds',coalesce((select jsonb_agg(u."useCaseId" order by u."sortOrder") from public.build_use_cases u where u."buildId"=b.id),'[]'::jsonb),
 'capabilityIds',coalesce((select jsonb_agg(c."capabilityId") from public.build_capabilities c where c."buildId"=b.id),'[]'::jsonb)
 ) from public.builds b where b.id=target
$$;

create or replace function public.save_build(document jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare rec public.builds; existing public.builds; item jsonb; pos integer; target text:=document->>'id'; wanted integer;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if octet_length(document::text)>1500000 then raise exception 'Build payload exceeds limit';end if;
 select count(*) into wanted from jsonb_array_elements_text(coalesce(document->'useCaseIds','[]'::jsonb));
 if wanted > 3 then raise exception 'A Build can address at most 3 Use Cases, including a proposed one';end if;
 select * into existing from public.builds where id=target;
 if found then
  if not public.can_edit_build(target) then raise exception 'Build edit denied';end if;
  select * into rec from jsonb_populate_record(existing,document);
  update public.builds set
  name=rec.name,slug=rec.slug,tagline=rec.tagline,description=rec.description,problem=rec.problem,"intendedUsers"=rec."intendedUsers",notes=rec.notes,"ownerId"=rec."ownerId","creatorId"=rec."creatorId","organizationId"=rec."organizationId",visibility=rec.visibility,publication=rec.publication,moderation=rec.moderation,verification=rec.verification,category=rec.category,industry=rec.industry,"demoUrl"=rec."demoUrl","githubUrl"=rec."githubUrl","sourceAvailable"=rec."sourceAvailable","cloneAllowed"=rec."cloneAllowed","commercialUseAllowed"=rec."commercialUseAllowed",license=rec.license,attribution=rec.attribution,"forkedFromBuildId"=rec."forkedFromBuildId","buildTime"=rec."buildTime","buildCost"=rec."buildCost",currency=rec.currency,difficulty=rec.difficulty,requirements=rec.requirements,"setupNotes"=rec."setupNotes",limitations=rec.limitations,featured=rec.featured,"ownershipConfirmed"=rec."ownershipConfirmed",provenance=rec.provenance,"useCaseProposalId"=rec."useCaseProposalId","blueprintId"=rec."blueprintId" where id=target;
 else
  select * into rec from jsonb_populate_record(null::public.builds,document);
  insert into public.builds select rec.*;
 end if;
 delete from public.build_connections where "buildId"=target;
 delete from public.build_stack_items where "buildId"=target;
 delete from public.build_media where "buildId"=target;
 delete from public.build_sources where "buildId"=target;
 delete from public.build_use_cases where "buildId"=target;
 delete from public.build_capabilities where "buildId"=target;
 pos=0;
 for item in select value from jsonb_array_elements(coalesce(document->'stack','[]'::jsonb)) loop
  insert into public.build_stack_items select * from jsonb_populate_record(null::public.build_stack_items,item||jsonb_build_object('buildId',target,'position',pos,'capabilityId',nullif(item->>'capabilityId','')));pos=pos+1;
 end loop;
 for item in select value from jsonb_array_elements(coalesce(document->'connections','[]'::jsonb)) loop insert into public.build_connections select * from jsonb_populate_record(null::public.build_connections,item||jsonb_build_object('buildId',target));end loop;
 pos=0;
 for item in select value from jsonb_array_elements(coalesce(document->'media','[]'::jsonb)) loop insert into public.build_media select * from jsonb_populate_record(null::public.build_media,item||jsonb_build_object('buildId',target,'position',pos));pos=pos+1;end loop;
 for item in select value from jsonb_array_elements(coalesce(document->'sources','[]'::jsonb)) loop insert into public.build_sources select * from jsonb_populate_record(null::public.build_sources,item||jsonb_build_object('buildId',target));end loop;
 insert into public.build_use_cases("buildId","useCaseId",role,"sortOrder")
   select target, value, case when ordinality = 1 then 'primary' else 'secondary' end, ordinality - 1
   from jsonb_array_elements_text(coalesce(document->'useCaseIds','[]'::jsonb)) with ordinality on conflict do nothing;
 insert into public.build_capabilities select target,value from jsonb_array_elements_text(coalesce(document->'capabilityIds','[]'::jsonb)) on conflict do nothing;
 if rec.publication='published' and (
   not exists(select 1 from public.build_stack_items where "buildId"=target)
   or (not exists(select 1 from public.build_use_cases where "buildId"=target) and not exists(select 1 from public.use_case_proposals where "buildId"=target and status='pending'))
   or exists(select 1 from public.build_stack_items where "buildId"=target and evidence='detected')
 ) then raise exception 'Published builds require confirmed stack and a Use Case or proposal';end if;
 return public.build_document(target);
end $$;
revoke all on function public.save_build(jsonb) from public;
grant execute on function public.save_build(jsonb) to authenticated;

-- ───────────── RLS ─────────────
alter table public.use_case_categories enable row level security;
alter table public.use_case_sources enable row level security;
alter table public.use_case_aliases enable row level security;
alter table public.use_case_redirects enable row level security;
alter table public.use_case_proposals enable row level security;

create policy categories_read on public.use_case_categories for select to anon, authenticated using(true);
create policy categories_admin on public.use_case_categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy redirects_read on public.use_case_redirects for select to anon, authenticated using(true);
create policy redirects_admin on public.use_case_redirects for all to authenticated using(public.is_admin()) with check(public.is_admin());
-- Sources and labels follow their Use Case. Hidden labels are readable (search needs them)
-- but the interface never displays them.
create policy sources_read on public.use_case_sources for select to anon, authenticated using(public.use_case_is_public("useCaseId") or public.is_admin());
create policy sources_admin on public.use_case_sources for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy aliases_read on public.use_case_aliases for select to anon, authenticated using(public.use_case_is_public("useCaseId") or public.is_admin());
create policy aliases_admin on public.use_case_aliases for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Proposals: the proposer and the Build's editors see them; only moderation decides them.
create policy proposals_read on public.use_case_proposals for select to authenticated
  using("proposedBy" = auth.uid() or public.can_edit_build("buildId") or public.is_admin());
create policy proposals_insert on public.use_case_proposals for insert to authenticated
  with check(
    "proposedBy" = auth.uid() and status = 'pending' and "resolvedUseCaseId" is null and "reviewedBy" is null and "reviewedAt" is null
    and public.can_edit_build("buildId")
    and exists(select 1 from public.creator_profiles c where c.id = "creatorId" and c."ownerId" = auth.uid())
  );
create policy proposals_withdraw on public.use_case_proposals for delete to authenticated using("proposedBy" = auth.uid() and status = 'pending');
create policy proposals_admin on public.use_case_proposals for update to authenticated using(public.is_admin()) with check(public.is_admin());

-- ───────────── Moderation RPCs (administrators only, audited) ─────────────
create or replace function public.link_use_case_to_build(target_build text, target_use_case text) returns void
language plpgsql security definer set search_path='' as $$
declare next_order integer;
begin
  if exists(select 1 from public.build_use_cases where "buildId" = target_build and "useCaseId" = target_use_case) then return; end if;
  select coalesce(max("sortOrder") + 1, 0) into next_order from public.build_use_cases where "buildId" = target_build;
  insert into public.build_use_cases("buildId","useCaseId",role,"sortOrder")
  values(target_build, target_use_case, case when next_order = 0 then 'primary' else 'secondary' end, next_order);
end $$;
revoke execute on function public.link_use_case_to_build(text,text) from public, anon, authenticated;

create or replace function public.map_use_case_proposal(target_proposal text, target_use_case text, note text default '') returns void
language plpgsql security definer set search_path='' as $$
declare p public.use_case_proposals;
begin
  if not public.is_admin() then raise exception 'Moderation requires administrator'; end if;
  select * into p from public.use_case_proposals where id = target_proposal and status = 'pending' for update;
  if not found then raise exception 'Open proposal not found'; end if;
  if not public.use_case_is_public(target_use_case) then raise exception 'Map to an approved Use Case'; end if;
  update public.use_case_proposals set status = 'mapped', "resolvedUseCaseId" = target_use_case, "reviewedBy" = auth.uid(), "reviewedAt" = now(), "reviewNote" = coalesce(note,'') where id = p.id;
  update public.builds set "useCaseProposalId" = null where id = p."buildId" and "useCaseProposalId" = p.id;
  perform public.link_use_case_to_build(p."buildId", target_use_case);
  insert into public.use_case_aliases(id,name,"useCaseId",label,"aliasType","normalizedLabel",source,provenance)
  values('alias-proposal-' || p.id, p."originalText", target_use_case, p."originalText", 'original-source',
         trim(regexp_replace(lower(p."originalText"), '[^a-z0-9]+', ' ', 'g')), 'Proposal ' || p.id, p.provenance)
  on conflict do nothing;
  insert into public.audit_events(id,name,provenance,"actorId","entityId","entityType",action,at)
  values(gen_random_uuid()::text,'Use Case proposal mapped','verified',auth.uid(),p.id,'use_case_proposals','mapped to ' || target_use_case,now());
end $$;

create or replace function public.approve_use_case_proposal(target_proposal text, title text, definition text, category text, subcategory text) returns text
language plpgsql security definer set search_path='' as $$
declare p public.use_case_proposals; new_id text; base text; n integer := 1;
begin
  if not public.is_admin() then raise exception 'Moderation requires administrator'; end if;
  select * into p from public.use_case_proposals where id = target_proposal and status = 'pending' for update;
  if not found then raise exception 'Open proposal not found'; end if;
  if length(trim(title)) not between 8 and 120 then raise exception 'Reviewed title must be 8–120 characters'; end if;
  if not exists(select 1 from public.use_case_categories s where s.id = subcategory and s."parentId" = category) then raise exception 'Choose a subcategory of the category'; end if;
  base := trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'));
  new_id := base;
  while exists(select 1 from public.use_cases where id = new_id) loop n := n + 1; new_id := base || '-' || n; end loop;
  insert into public.use_cases(id, owner_id, published, provenance, data) values(new_id, null, true, 'community supplied', jsonb_build_object(
    'id', new_id, 'slug', new_id, 'name', trim(title), 'description', trim(definition), 'outcome', trim(title),
    'category', 'automation', 'icon', 'Sparkles', 'color', 'sand', 'stackId', '',
    'categoryId', category, 'subcategoryId', subcategory, 'status', 'approved',
    'originType', 'solution-provider-proposed', 'originEntityId', p."creatorId", 'createdBy', p."proposedBy",
    'createdAt', now(), 'updatedAt', now(), 'provenance', 'community supplied'));
  insert into public.use_case_sources(id,name,"useCaseId","sourceType","sourceEntityId","originalTitle","originalDescription","retrievedAt",attribution,status,provenance)
  values('proposal-source-' || p.id, 'Proposal ' || p.id, new_id, 'solution-provider', p."creatorId", p."originalText", p."suggestedTitle", p."createdAt"::date,
         'Proposed by a Solution Provider while publishing a Build', 'active', p.provenance);
  update public.use_case_proposals set status = 'approved', "resolvedUseCaseId" = new_id, "reviewedBy" = auth.uid(), "reviewedAt" = now() where id = p.id;
  update public.builds set "useCaseProposalId" = null where id = p."buildId" and "useCaseProposalId" = p.id;
  perform public.link_use_case_to_build(p."buildId", new_id);
  insert into public.audit_events(id,name,provenance,"actorId","entityId","entityType",action,at)
  values(gen_random_uuid()::text,'Use Case proposal approved','verified',auth.uid(),p.id,'use_case_proposals','approved as ' || new_id,now());
  return new_id;
end $$;

create or replace function public.reject_use_case_proposal(target_proposal text, note text) returns void
language plpgsql security definer set search_path='' as $$
declare p public.use_case_proposals;
begin
  if not public.is_admin() then raise exception 'Moderation requires administrator'; end if;
  if length(trim(coalesce(note,''))) < 5 then raise exception 'Give the provider a reason'; end if;
  select * into p from public.use_case_proposals where id = target_proposal and status = 'pending' for update;
  if not found then raise exception 'Open proposal not found'; end if;
  update public.use_case_proposals set status = 'rejected', "reviewedBy" = auth.uid(), "reviewedAt" = now(), "reviewNote" = note where id = p.id;
  update public.builds set "useCaseProposalId" = null where id = p."buildId" and "useCaseProposalId" = p.id;
  insert into public.audit_events(id,name,provenance,"actorId","entityId","entityType",action,at)
  values(gen_random_uuid()::text,'Use Case proposal rejected','verified',auth.uid(),p.id,'use_case_proposals','rejected',now());
end $$;

create or replace function public.merge_use_cases(from_id text, into_id text) returns void
language plpgsql security definer set search_path='' as $$
declare f public.use_cases; r record;
begin
  if not public.is_admin() then raise exception 'Moderation requires administrator'; end if;
  if from_id = into_id then raise exception 'A Use Case cannot be merged into itself'; end if;
  select * into f from public.use_cases where id = from_id for update;
  if not found or not public.use_case_is_public(into_id) then raise exception 'Both Use Cases must exist and the target must be approved'; end if;
  for r in select * from public.build_use_cases where "useCaseId" = from_id loop
    if exists(select 1 from public.build_use_cases where "buildId" = r."buildId" and "useCaseId" = into_id) then
      delete from public.build_use_cases where "buildId" = r."buildId" and "useCaseId" = from_id;
      if r.role = 'primary' then update public.build_use_cases set role = 'primary' where "buildId" = r."buildId" and "useCaseId" = into_id; end if;
    else
      update public.build_use_cases set "useCaseId" = into_id where "buildId" = r."buildId" and "useCaseId" = from_id;
    end if;
  end loop;
  update public.use_case_sources set "useCaseId" = into_id where "useCaseId" = from_id;
  update public.use_case_aliases a set "useCaseId" = into_id where a."useCaseId" = from_id
    and not exists(select 1 from public.use_case_aliases b where b."useCaseId" = into_id and b."normalizedLabel" = a."normalizedLabel");
  insert into public.use_case_aliases(id,name,"useCaseId",label,"aliasType","normalizedLabel",source,provenance)
  values('alias-merged-' || from_id, f.data->>'name', into_id, f.data->>'name', 'alternate',
         trim(regexp_replace(lower(f.data->>'name'), '[^a-z0-9]+', ' ', 'g')), 'Merged from ' || from_id, 'inferred')
  on conflict do nothing;
  update public.use_cases set published = false, data = data || jsonb_build_object('status','merged','mergedIntoId',into_id,'updatedAt',now()) where id = from_id;
  insert into public.use_case_redirects(id,name,"fromSlug","targetType",target,reason)
  values(coalesce(f.data->>'slug', from_id), coalesce(f.data->>'slug', from_id), coalesce(f.data->>'slug', from_id), 'use-case', into_id, 'merged')
  on conflict (id) do update set target = excluded.target, reason = 'merged';
  insert into public.audit_events(id,name,provenance,"actorId","entityId","entityType",action,at)
  values(gen_random_uuid()::text,'Use Case merged','verified',auth.uid(),from_id,'use_cases','merged into ' || into_id,now());
end $$;

revoke execute on function public.map_use_case_proposal(text,text,text) from public, anon;
revoke execute on function public.approve_use_case_proposal(text,text,text,text,text) from public, anon;
revoke execute on function public.reject_use_case_proposal(text,text) from public, anon;
revoke execute on function public.merge_use_cases(text,text) from public, anon;
grant execute on function public.map_use_case_proposal(text,text,text) to authenticated;
grant execute on function public.approve_use_case_proposal(text,text,text,text,text) to authenticated;
grant execute on function public.reject_use_case_proposal(text,text) to authenticated;
grant execute on function public.merge_use_cases(text,text) to authenticated;
