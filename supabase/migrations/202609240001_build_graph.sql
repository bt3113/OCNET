-- Additive Build graph. Procurement projects and their routes remain intact.
-- Camel-case columns intentionally match the typed repository DTOs; relationships are normalized.
create table public.user_roles (id text primary key, name text not null, "userId" uuid not null references auth.users(id) on delete cascade, role text not null check(role in ('buyer','creator','provider','integrator','consultant','admin')), provenance text not null default 'unverified', unique("userId",role));
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select coalesce(auth.jwt()->'app_metadata'->>'role','')='admin' or coalesce(auth.jwt()->'app_metadata'->'roles','[]'::jsonb) ? 'admin' or exists(select 1 from public.user_roles where "userId"=auth.uid() and role='admin') $$;
create or replace function public.is_supplier() returns boolean language sql stable security definer set search_path='' as $$ select public.is_admin() or coalesce(auth.jwt()->'app_metadata'->>'role','') in ('provider','integrator','consultant') or coalesce(auth.jwt()->'app_metadata'->'roles','[]'::jsonb) ?| array['provider','integrator','consultant'] or exists(select 1 from public.user_roles where "userId"=auth.uid() and role in ('provider','integrator','consultant')) $$;
create table public.organization_memberships(id text primary key,name text not null,"organizationId" text not null references public.organizations(id) on delete cascade,"userId" uuid not null references auth.users(id) on delete cascade,role text not null check(role in ('owner','editor','viewer')),provenance text not null default 'unverified',unique("organizationId","userId"));
create or replace function public.organization_editor(org text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.organization_memberships where "organizationId"=org and "userId"=auth.uid() and role in ('owner','editor')) $$;
create table public.creator_profiles(
 id text primary key, slug text not null unique check(slug ~ '^[a-z0-9-]+$'), name text not null check(length(name) between 2 and 120), "ownerId" uuid not null references auth.users(id) on delete cascade, "organizationId" text references public.organizations(id), headline text not null default '', bio text not null default '' check(length(bio)<=5000), location text not null default '', website text not null default '', github text not null default '', expertise text[] not null default '{}', "technologyIds" text[] not null default '{}', "useCaseIds" text[] not null default '{}', available boolean not null default false, kind text not null default 'individual' check(kind in ('individual','studio','company')), verification text not null default 'unverified' check(verification in ('unverified','verified')), color text not null default 'sand',provenance text not null default 'creator supplied',"createdAt" timestamptz default now(), unique(id,"ownerId")
);
create table public.builds(
 id text primary key,slug text not null unique check(slug ~ '^[a-z0-9-]+$'),name text not null check(length(name) between 1 and 120),tagline text not null default '' check(length(tagline)<=200),description text not null default '' check(length(description)<=12000),problem text not null default '',"intendedUsers" text not null default '',notes text not null default '',"ownerId" uuid not null references auth.users(id) on delete cascade,"creatorId" text not null references public.creator_profiles(id),"organizationId" text references public.organizations(id),visibility text not null default 'draft' check(visibility in ('draft','public','unlisted','private','archived')),publication text not null default 'draft' check(publication in ('draft','published')),moderation text not null default 'pending' check(moderation in ('pending','approved','flagged','rejected')),verification text not null default 'unverified' check(verification in ('unverified','verified')),category text references public.categories(id),industry text not null default '',"demoUrl" text not null default '',"githubUrl" text not null default '',"sourceAvailable" boolean not null default false,"cloneAllowed" boolean not null default false,"commercialUseAllowed" boolean not null default false,license text not null default '',attribution text not null default '',"forkedFromBuildId" text references public.builds(id),"buildTime" text not null default '',"buildCost" text not null default '',currency text not null default 'USD',difficulty text not null default 'Intermediate',requirements text not null default '',"setupNotes" text not null default '',limitations text not null default '',"createdAt" timestamptz not null default now(),"updatedAt" timestamptz not null default now(),featured boolean not null default false,"ownershipConfirmed" boolean not null default false,provenance text not null default 'creator supplied',check(not "cloneAllowed" or length(license)>0),check(publication<>'published' or (length(name)>=5 and length(tagline)>=10 and length(description)>=40 and "ownershipConfirmed"))
);
create table public.build_collaborators(id text primary key,name text not null,"buildId" text not null references public.builds(id) on delete cascade,"userId" uuid not null references auth.users(id) on delete cascade,role text not null check(role in ('editor','viewer')),provenance text not null default 'creator supplied',unique("buildId","userId"));
create or replace function public.can_edit_build(target text) returns boolean language sql stable security definer set search_path='' as $$ select public.is_admin() or exists(select 1 from public.builds b where b.id=target and (b."ownerId"=auth.uid() or public.organization_editor(b."organizationId") or exists(select 1 from public.build_collaborators c where c."buildId"=b.id and c."userId"=auth.uid() and c.role='editor'))) $$;
create or replace function public.can_read_build(target text) returns boolean language sql stable security definer set search_path='' as $$ select public.can_edit_build(target) or exists(select 1 from public.builds b where b.id=target and b.visibility in ('public','unlisted') and b.publication='published' and b.moderation='approved') or exists(select 1 from public.build_collaborators c where c."buildId"=target and c."userId"=auth.uid()) $$;
create table public.build_stack_items(id text primary key,"buildId" text not null references public.builds(id) on delete cascade,"productId" text not null references public.products(id),"capabilityId" text references public.capabilities(id),role text not null,notes text not null default '',"alternativeIds" text[] not null default '{}',evidence text not null check(evidence in ('detected','creator-confirmed','demo')),"sourceUrl" text,x integer not null default 0 check(x between 0 and 2000),y integer not null default 0 check(y between 0 and 2000),position integer not null default 0,unique("buildId",id));
create table public.build_connections(id text primary key,"buildId" text not null references public.builds(id) on delete cascade,"fromId" text not null,"toId" text not null,label text not null check(length(label)<=120),foreign key("buildId","fromId") references public.build_stack_items("buildId",id) on delete cascade,foreign key("buildId","toId") references public.build_stack_items("buildId",id) on delete cascade,check("fromId"<>"toId"));
create table public.build_media(id text primary key,"buildId" text not null references public.builds(id) on delete cascade,type text not null check(type in ('image','video','document')),url text not null check(length(url)<3000 and (url ~ '^https?://' or url ~ '^media/' or url ~ '^storage://build-media/')),alt text not null check(length(alt)>0),position integer not null default 0);
create table public.build_sources(id text primary key,"buildId" text not null references public.builds(id) on delete cascade,url text not null check(url ~ '^https?://' and length(url)<3000),label text not null,kind text not null check(kind in ('repository','demo','documentation','post')),evidence text not null check(evidence in ('creator supplied','third-party sourced','demo')));
create table public.build_use_cases("buildId" text not null references public.builds(id) on delete cascade,"useCaseId" text not null references public.use_cases(id),primary key("buildId","useCaseId"));
create table public.build_capabilities("buildId" text not null references public.builds(id) on delete cascade,"capabilityId" text not null references public.capabilities(id),primary key("buildId","capabilityId"));
create table public.build_offers(id text primary key, name text not null, provenance text not null default 'creator supplied',"buildId" text not null references public.builds(id) on delete cascade,"ownerId" uuid not null references auth.users(id),description text not null check(length(description) between 20 and 5000),"offerType" text not null check("offerType" in ('Free guide','Template','Source package','Starter kit','Setup service','Customisation','Full implementation','Support plan','Consultation')),"pricingModel" text not null check("pricingModel" in ('free','fixed','starting from','monthly','yearly','request quote')),price numeric check(price>=0),currency text not null check(currency ~ '^[A-Z]{3}$'),"deliveryTime" text not null default '',"checkoutMode" text not null check("checkoutMode" in ('contact','external','demo')),"externalUrl" text not null default '',active boolean not null default false,moderation text not null default 'pending' check(moderation in ('pending','approved','flagged','rejected')),check("checkoutMode"<>'external' or "externalUrl" ~ '^https?://'),check("pricingModel" in ('free','request quote') or price is not null));
create table public.collections(id text primary key, name text not null, provenance text not null default 'creator supplied',slug text not null unique,"ownerId" uuid not null references auth.users(id) on delete cascade,description text not null default '',visibility text not null default 'private' check(visibility in ('private','public')));
create table public.collection_items(id text primary key, name text not null, provenance text not null default 'creator supplied',"collectionId" text not null references public.collections(id) on delete cascade,"ownerId" uuid not null references auth.users(id),"entityId" text not null,"entityType" text not null,unique("collectionId","entityId","entityType"));
create table public.build_comments(id text primary key, name text not null, provenance text not null default 'creator supplied',"buildId" text not null references public.builds(id) on delete cascade,"ownerId" uuid not null references auth.users(id),body text not null check(length(body) between 10 and 3000),status text not null default 'pending' check(status in ('pending','approved','flagged','rejected')),"updatedAt" timestamptz not null default now());
create table public.build_updates(id text primary key, name text not null, provenance text not null default 'creator supplied',"buildId" text not null references public.builds(id) on delete cascade,"ownerId" uuid not null references auth.users(id),body text not null check(length(body)<=5000),date timestamptz not null default now());
create table public.creator_follows(id text primary key, name text not null, provenance text not null default 'creator supplied',"creatorId" text not null references public.creator_profiles(id) on delete cascade,"ownerId" uuid not null references auth.users(id) on delete cascade,unique("creatorId","ownerId"));
create table public.build_forks(id text primary key, name text not null, provenance text not null default 'creator supplied',"buildId" text not null unique references public.builds(id) on delete cascade,"parentBuildId" text not null references public.builds(id),"ownerId" uuid not null references auth.users(id),attribution text not null check(length(attribution)>0));
create table public.reports(id text primary key, name text not null, provenance text not null default 'creator supplied',"buildId" text not null references public.builds(id),"ownerId" uuid not null references auth.users(id),reason text not null check(reason in ('spam','misleading','copyright/IP','unsafe link','incorrect attribution','other')),details text not null check(length(details) between 10 and 5000),status text not null default 'open' check(status in ('open','resolved')));
create table public.provider_claims(id text primary key, name text not null, provenance text not null default 'creator supplied',"providerId" text not null references public.providers(id),"ownerId" uuid not null references auth.users(id),evidence text not null check(length(evidence) between 20 and 3000),status text not null default 'pending' check(status in ('pending','approved','flagged','rejected')));
create table public.audit_events(id text primary key, name text not null, provenance text not null default 'creator supplied',"actorId" uuid references auth.users(id),"entityId" text not null,"entityType" text not null,action text not null,at timestamptz not null default now());
create table public.marketplace_events(id text primary key, name text not null, provenance text not null default 'creator supplied',"ownerId" uuid not null references auth.users(id),event text not null check(event in ('build_view','technology_view','save_build','save_technology','remix_build','outbound_demo_click','source_click','provider_click','offer_click','contact_creator','search','filter_use')),"entityId" text not null,day date not null default current_date,unique("ownerId",event,"entityId",day));
create table public.build_comparisons(id text primary key, name text not null, provenance text not null default 'creator supplied',"ownerId" uuid not null unique references auth.users(id) on delete cascade,"buildIds" text[] not null default '{}' check(cardinality("buildIds")<=3));

-- Every table is protected. No user-editable profile metadata grants permissions.
alter table public.user_roles enable row level security;
create policy admin_access on public.user_roles for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.organization_memberships enable row level security;
create policy admin_access on public.organization_memberships for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.creator_profiles enable row level security;
create policy admin_access on public.creator_profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.builds enable row level security;
create policy admin_access on public.builds for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_collaborators enable row level security;
create policy admin_access on public.build_collaborators for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_stack_items enable row level security;
create policy admin_access on public.build_stack_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_connections enable row level security;
create policy admin_access on public.build_connections for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_media enable row level security;
create policy admin_access on public.build_media for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_sources enable row level security;
create policy admin_access on public.build_sources for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_use_cases enable row level security;
create policy admin_access on public.build_use_cases for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_capabilities enable row level security;
create policy admin_access on public.build_capabilities for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_offers enable row level security;
create policy admin_access on public.build_offers for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.collections enable row level security;
create policy admin_access on public.collections for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.collection_items enable row level security;
create policy admin_access on public.collection_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_comments enable row level security;
create policy admin_access on public.build_comments for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_updates enable row level security;
create policy admin_access on public.build_updates for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.creator_follows enable row level security;
create policy admin_access on public.creator_follows for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_forks enable row level security;
create policy admin_access on public.build_forks for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.reports enable row level security;
create policy admin_access on public.reports for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.provider_claims enable row level security;
create policy admin_access on public.provider_claims for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.audit_events enable row level security;
create policy admin_access on public.audit_events for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.marketplace_events enable row level security;
create policy admin_access on public.marketplace_events for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.build_comparisons enable row level security;
create policy admin_access on public.build_comparisons for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy read_membership on public.user_roles for select to authenticated using("userId"=auth.uid());
create policy read_membership on public.organization_memberships for select to authenticated using("userId"=auth.uid());
create policy read_membership on public.build_collaborators for select to authenticated using("userId"=auth.uid());
create policy creator_read on public.creator_profiles for select to anon,authenticated using(true);
create policy creator_insert on public.creator_profiles for insert to authenticated with check("ownerId"=auth.uid() and ("organizationId" is null or public.organization_editor("organizationId")) and verification='unverified');
create policy creator_update on public.creator_profiles for update to authenticated using("ownerId"=auth.uid()) with check("ownerId"=auth.uid() and ("organizationId" is null or public.organization_editor("organizationId")));
create policy build_read on public.builds for select to anon,authenticated using(public.can_read_build(id));
create policy build_insert on public.builds for insert to authenticated with check("ownerId"=auth.uid() and exists(select 1 from public.creator_profiles c where c.id="creatorId" and c."ownerId"=auth.uid()) and ("organizationId" is null or public.organization_editor("organizationId")) and moderation='pending' and verification='unverified' and not featured);
create policy build_update on public.builds for update to authenticated using(public.can_edit_build(id)) with check(public.can_edit_build(id));
create policy build_delete on public.builds for delete to authenticated using("ownerId"=auth.uid());
create policy child_read on public.build_stack_items for select to anon,authenticated using(public.can_read_build("buildId"));
create policy child_write on public.build_stack_items for all to authenticated using(public.can_edit_build("buildId")) with check(public.can_edit_build("buildId"));
create policy child_read on public.build_connections for select to anon,authenticated using(public.can_read_build("buildId"));
create policy child_write on public.build_connections for all to authenticated using(public.can_edit_build("buildId")) with check(public.can_edit_build("buildId"));
create policy child_read on public.build_media for select to anon,authenticated using(public.can_read_build("buildId"));
create policy child_write on public.build_media for all to authenticated using(public.can_edit_build("buildId")) with check(public.can_edit_build("buildId"));
create policy child_read on public.build_sources for select to anon,authenticated using(public.can_read_build("buildId"));
create policy child_write on public.build_sources for all to authenticated using(public.can_edit_build("buildId")) with check(public.can_edit_build("buildId"));
create policy child_read on public.build_use_cases for select to anon,authenticated using(public.can_read_build("buildId"));
create policy child_write on public.build_use_cases for all to authenticated using(public.can_edit_build("buildId")) with check(public.can_edit_build("buildId"));
create policy child_read on public.build_capabilities for select to anon,authenticated using(public.can_read_build("buildId"));
create policy child_write on public.build_capabilities for all to authenticated using(public.can_edit_build("buildId")) with check(public.can_edit_build("buildId"));
create policy child_read on public.build_updates for select to anon,authenticated using(public.can_read_build("buildId"));
create policy child_write on public.build_updates for all to authenticated using(public.can_edit_build("buildId")) with check(public.can_edit_build("buildId"));
create policy offer_read on public.build_offers for select to anon,authenticated using((active and moderation='approved' and public.can_read_build("buildId")) or "ownerId"=auth.uid());
create policy offer_write on public.build_offers for all to authenticated using("ownerId"=auth.uid() and public.can_edit_build("buildId")) with check("ownerId"=auth.uid() and public.can_edit_build("buildId"));
create policy collection_read on public.collections for select to anon,authenticated using(visibility='public' or "ownerId"=auth.uid());
create policy collection_write on public.collections for all to authenticated using("ownerId"=auth.uid()) with check("ownerId"=auth.uid());
create policy collection_item_read on public.collection_items for select to anon,authenticated using(exists(select 1 from public.collections c where c.id="collectionId" and (c.visibility='public' or c."ownerId"=auth.uid())));
create policy collection_item_write on public.collection_items for all to authenticated using("ownerId"=auth.uid()) with check("ownerId"=auth.uid() and exists(select 1 from public.collections c where c.id="collectionId" and c."ownerId"=auth.uid()));
create policy comment_read on public.build_comments for select to anon,authenticated using((status='approved' and public.can_read_build("buildId")) or "ownerId"=auth.uid());
create policy comment_create on public.build_comments for insert to authenticated with check("ownerId"=auth.uid() and status='pending' and public.can_read_build("buildId"));
create policy comment_delete on public.build_comments for delete to authenticated using("ownerId"=auth.uid());
create policy fork_read on public.build_forks for select to anon,authenticated using(public.can_read_build("buildId"));
create policy fork_create on public.build_forks for insert to authenticated with check("ownerId"=auth.uid() and public.can_edit_build("buildId") and exists(select 1 from public.builds p where p.id="parentBuildId" and p."cloneAllowed"));
create policy report_create on public.reports for insert to authenticated with check("ownerId"=auth.uid() and status='open' and public.can_read_build("buildId"));
create policy report_read on public.reports for select to authenticated using("ownerId"=auth.uid());
create policy claim_create on public.provider_claims for insert to authenticated with check("ownerId"=auth.uid() and status='pending');
create policy claim_read on public.provider_claims for select to authenticated using("ownerId"=auth.uid());
create policy private_owner on public.creator_follows for all to authenticated using("ownerId"=auth.uid()) with check("ownerId"=auth.uid());
create policy private_owner on public.build_comparisons for all to authenticated using("ownerId"=auth.uid()) with check("ownerId"=auth.uid());
create policy private_owner on public.marketplace_events for all to authenticated using("ownerId"=auth.uid()) with check("ownerId"=auth.uid());
-- Audit is append-only and written by the moderation trigger, never by browser input.
drop policy admin_access on public.audit_events;
create policy audit_read on public.audit_events for select to authenticated using(public.is_admin());
create or replace function public.guard_build_record() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('postgres','supabase_admin') or auth.role()='service_role' then return new; end if;
 if TG_OP='UPDATE' and (to_jsonb(new)->>'ownerId') is distinct from (to_jsonb(old)->>'ownerId') then raise exception 'Owner is immutable'; end if;
 if public.is_admin() then return new; end if;
 if TG_TABLE_NAME in ('builds','creator_profiles','build_offers') then
  if TG_OP='INSERT' then new.provenance='creator supplied';elsif new.provenance is distinct from old.provenance then raise exception 'Provenance changes require moderation';end if;
 end if;
 if TG_TABLE_NAME='builds' then
  if TG_OP='INSERT' then new.moderation='pending';new.verification='unverified';new.featured=false;
  else
   if new.verification is distinct from old.verification or new.featured is distinct from old.featured or (new.moderation is distinct from old.moderation and new.moderation<>'pending') then raise exception 'Moderation requires administrator'; end if;
   if new."organizationId" is distinct from old."organizationId" and new."organizationId" is not null and not public.organization_editor(new."organizationId") then raise exception 'Organization membership required';end if;
   if new."creatorId"<>old."creatorId" then raise exception 'Creator attribution is immutable'; end if;
   if old.publication='published' and new.slug<>old.slug then raise exception 'Published URL is permanent';end if;
   if new."forkedFromBuildId" is distinct from old."forkedFromBuildId" then raise exception 'Fork attribution is immutable';end if;
   new.moderation='pending';
  end if;
  if new."forkedFromBuildId" is not null and not exists(select 1 from public.builds p where p.id=new."forkedFromBuildId" and p."cloneAllowed" and length(new.attribution)>0 and new.license=p.license and (not new."commercialUseAllowed" or p."commercialUseAllowed")) then raise exception 'Remix permission and original license required';end if;
  new."updatedAt"=now();
 elsif TG_TABLE_NAME='creator_profiles' then
  if (TG_OP='INSERT' and new.verification<>'unverified') or (TG_OP='UPDATE' and new.verification<>old.verification) then raise exception 'Verification requires administrator'; end if;
 elsif TG_TABLE_NAME='build_offers' then
  if TG_OP='UPDATE' and new."buildId"<>old."buildId" then raise exception 'Offer build is immutable';end if;
  if TG_OP='UPDATE' and new.moderation<>old.moderation and new.moderation<>'pending' then raise exception 'Offer moderation requires administrator';end if;
  new.moderation='pending';
 end if;
 return new;
end $$;
create trigger guard_build before insert or update on public.builds for each row execute function public.guard_build_record();
create trigger guard_creator before insert or update on public.creator_profiles for each row execute function public.guard_build_record();
create trigger guard_offer before insert or update on public.build_offers for each row execute function public.guard_build_record();
create or replace function public.audit_moderation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if public.is_admin() and TG_OP='UPDATE' and to_jsonb(new) is distinct from to_jsonb(old) then
 insert into public.audit_events(id,name,"actorId","entityId","entityType",action,provenance) values(gen_random_uuid()::text,'Moderation decision',auth.uid(),new.id,TG_TABLE_NAME,'updated '||coalesce(to_jsonb(new)->>'moderation',to_jsonb(new)->>'status',to_jsonb(new)->>'verification','record'),'verified');
 end if;return new;
end $$;
create trigger audit_decision after update on public.builds for each row execute function public.audit_moderation();
create trigger audit_decision after update on public.creator_profiles for each row execute function public.audit_moderation();
create trigger audit_decision after update on public.build_offers for each row execute function public.audit_moderation();
create trigger audit_decision after update on public.build_comments for each row execute function public.audit_moderation();
create trigger audit_decision after update on public.reports for each row execute function public.audit_moderation();
create trigger audit_decision after update on public.provider_claims for each row execute function public.audit_moderation();
create index build_visibility_idx on public.builds(visibility,publication,moderation,"updatedAt" desc);
create index build_owner_idx on public.builds("ownerId");
create index build_creator_idx on public.builds("creatorId");
create index build_stack_product_idx on public.build_stack_items("productId","buildId");
create index build_use_case_idx on public.build_use_cases("useCaseId","buildId");
create index build_offer_idx on public.build_offers("buildId",active,moderation);
create index build_comment_idx on public.build_comments("buildId",status);
create index collection_owner_idx on public.collections("ownerId");
-- Aggregate DTOs are assembled from relational graph tables.
create or replace function public.build_document(target text) returns jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(b)||jsonb_build_object(
 'stack',coalesce((select jsonb_agg(to_jsonb(s)-'buildId'-'position' order by position) from public.build_stack_items s where s."buildId"=b.id),'[]'::jsonb),
 'connections',coalesce((select jsonb_agg(to_jsonb(c)-'buildId') from public.build_connections c where c."buildId"=b.id),'[]'::jsonb),
 'media',coalesce((select jsonb_agg(to_jsonb(m)-'buildId'-'position' order by position) from public.build_media m where m."buildId"=b.id),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(to_jsonb(s)-'buildId') from public.build_sources s where s."buildId"=b.id),'[]'::jsonb),
 'useCaseIds',coalesce((select jsonb_agg(u."useCaseId") from public.build_use_cases u where u."buildId"=b.id),'[]'::jsonb),
 'capabilityIds',coalesce((select jsonb_agg(c."capabilityId") from public.build_capabilities c where c."buildId"=b.id),'[]'::jsonb)
 ) from public.builds b where b.id=target
$$;
create or replace function public.list_builds() returns setof jsonb language sql stable security invoker set search_path='' as $$ select public.build_document(id) from public.builds $$;
-- Unlisted records are accessible through an exact slug lookup, not a public table scan.
create or replace function public.can_read_build(target text) returns boolean language sql stable security definer set search_path='' as $$ select public.can_edit_build(target) or exists(select 1 from public.builds b where b.id=target and b.visibility='public' and b.publication='published' and b.moderation='approved') or exists(select 1 from public.build_collaborators c where c."buildId"=target and c."userId"=auth.uid()) $$;
create or replace function public.get_build(target_slug text) returns jsonb language plpgsql stable security definer set search_path='' as $$ declare b public.builds;begin
 select * into b from public.builds where slug=target_slug;
 if not found or not (public.can_read_build(b.id) or (b.visibility='unlisted' and b.publication='published' and b.moderation='approved')) then return null;end if;
 return public.build_document(b.id);
end $$;
create or replace function public.save_build(document jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare rec public.builds; existing public.builds; item jsonb; pos integer; target text:=document->>'id';begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if octet_length(document::text)>1500000 then raise exception 'Build payload exceeds limit';end if;
 select * into existing from public.builds where id=target;
 if found then
  if not public.can_edit_build(target) then raise exception 'Build edit denied';end if;
  select * into rec from jsonb_populate_record(existing,document);
  update public.builds set
  name=rec.name,slug=rec.slug,tagline=rec.tagline,description=rec.description,problem=rec.problem,"intendedUsers"=rec."intendedUsers",notes=rec.notes,"ownerId"=rec."ownerId","creatorId"=rec."creatorId","organizationId"=rec."organizationId",visibility=rec.visibility,publication=rec.publication,moderation=rec.moderation,verification=rec.verification,category=rec.category,industry=rec.industry,"demoUrl"=rec."demoUrl","githubUrl"=rec."githubUrl","sourceAvailable"=rec."sourceAvailable","cloneAllowed"=rec."cloneAllowed","commercialUseAllowed"=rec."commercialUseAllowed",license=rec.license,attribution=rec.attribution,"forkedFromBuildId"=rec."forkedFromBuildId","buildTime"=rec."buildTime","buildCost"=rec."buildCost",currency=rec.currency,difficulty=rec.difficulty,requirements=rec.requirements,"setupNotes"=rec."setupNotes",limitations=rec.limitations,"updatedAt"=now(),featured=rec.featured,"ownershipConfirmed"=rec."ownershipConfirmed",provenance=rec.provenance where id=target;
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
 insert into public.build_use_cases select target,value from jsonb_array_elements_text(coalesce(document->'useCaseIds','[]'::jsonb)) on conflict do nothing;
 insert into public.build_capabilities select target,value from jsonb_array_elements_text(coalesce(document->'capabilityIds','[]'::jsonb)) on conflict do nothing;
 if rec.publication='published' and (not exists(select 1 from public.build_stack_items where "buildId"=target) or not exists(select 1 from public.build_use_cases where "buildId"=target) or exists(select 1 from public.build_stack_items where "buildId"=target and evidence='detected')) then raise exception 'Published builds require confirmed stack and use case';end if;
 return public.build_document(target);
end $$;
-- New use-case proposals are private pending moderation, never instantly verified catalogue facts.
create policy creator_use_case_insert on public.use_cases for insert to authenticated with check(owner_id=auth.uid() and not published);
-- Server-managed enquiries: clients cannot nominate arbitrary thread participants.
create or replace function public.start_build_enquiry(target_build text,body text) returns text language plpgsql security definer set search_path='' as $$
declare b public.builds;tid text:=gen_random_uuid()::text;begin
 if auth.uid() is null or length(trim(body)) not between 20 and 5000 then raise exception 'Valid authenticated enquiry required';end if;
 select * into b from public.builds where id=target_build and visibility in ('public','unlisted') and publication='published' and moderation='approved';
 if not found then raise exception 'Build unavailable';end if;
 if (select count(*) from public.message_threads where owner_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Enquiry limit reached. Try later.';end if;
 insert into public.message_threads(id,owner_id,data) values(tid,auth.uid(),jsonb_build_object('id',tid,'name',b.name||' · Creator enquiry','providerId',b."creatorId",'participantIds',jsonb_build_array(auth.uid(),b."ownerId"),'provenance','community supplied'));
 insert into public.thread_members(thread_id,user_id) values(tid,auth.uid()),(tid,b."ownerId") on conflict do nothing;
 insert into public.messages(id,owner_id,data) values(gen_random_uuid()::text,auth.uid(),jsonb_build_object('name','Implementation enquiry','threadId',tid,'senderId',auth.uid(),'body',trim(body),'sentAt',now(),'provenance','community supplied'));
 return tid;
end $$;
revoke all on function public.start_build_enquiry(text,text) from public;
grant execute on function public.start_build_enquiry(text,text) to authenticated;
revoke all on function public.save_build(jsonb) from public;
grant execute on function public.save_build(jsonb) to authenticated;
-- Storage remains private. Media is read through short-lived signed delivery, with owner prefixes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('build-media','build-media',false,5242880,array['image/png','image/jpeg','image/webp']),
 ('avatars','avatars',false,1048576,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy creator_asset_read on storage.objects for select to authenticated using(bucket_id in ('build-media','avatars') and (storage.foldername(name))[1]=auth.uid()::text);
create policy creator_asset_insert on storage.objects for insert to authenticated with check(bucket_id in ('build-media','avatars') and (storage.foldername(name))[1]=auth.uid()::text);
create policy creator_asset_delete on storage.objects for delete to authenticated using(bucket_id in ('build-media','avatars') and (storage.foldername(name))[1]=auth.uid()::text);
alter publication supabase_realtime add table public.build_comments,public.build_updates;
-- Import request budget is server-managed, not user-editable analytics.
create table public.import_budgets(user_id uuid primary key references auth.users(id) on delete cascade,window_start timestamptz not null default now(),requests int not null default 0);
alter table public.import_budgets enable row level security;
create or replace function public.consume_import_budget() returns boolean language plpgsql security definer set search_path='' as $$ declare n int;begin
 if auth.uid() is null then return false;end if;
 insert into public.import_budgets(user_id,window_start,requests) values(auth.uid(),now(),1) on conflict(user_id) do update set requests=case when public.import_budgets.window_start<now()-interval '1 hour' then 1 else public.import_budgets.requests+1 end,window_start=case when public.import_budgets.window_start<now()-interval '1 hour' then now() else public.import_budgets.window_start end returning requests into n;
 return n<=15;
end $$;
revoke all on function public.consume_import_budget() from public;
grant execute on function public.consume_import_budget() to authenticated;
-- Editing a child record invalidates previous moderation; no side door through a join table.
create or replace function public.touch_build_graph() returns trigger language plpgsql security definer set search_path='' as $$ declare target text;begin
 target=coalesce(to_jsonb(new)->>'buildId',to_jsonb(old)->>'buildId');
 if auth.uid() is not null and not public.is_admin() and auth.role()<>'service_role' then update public.builds set moderation='pending',"updatedAt"=now() where id=target;end if;
 return coalesce(new,old);
end $$;
create trigger touch_graph after insert or update or delete on public.build_stack_items for each row execute function public.touch_build_graph();
create trigger touch_graph after insert or update or delete on public.build_connections for each row execute function public.touch_build_graph();
create trigger touch_graph after insert or update or delete on public.build_media for each row execute function public.touch_build_graph();
create trigger touch_graph after insert or update or delete on public.build_sources for each row execute function public.touch_build_graph();
create trigger touch_graph after insert or update or delete on public.build_use_cases for each row execute function public.touch_build_graph();
create trigger touch_graph after insert or update or delete on public.build_capabilities for each row execute function public.touch_build_graph();

-- Signed media delivery can read only objects referenced by approved public builds (or their owner).
create policy published_build_asset_read on storage.objects for select to anon,authenticated using(bucket_id='build-media' and exists(select 1 from public.build_media m join public.builds b on b.id=m."buildId" where m.url='storage://build-media/'||storage.objects.name and b.visibility='public' and b.publication='published' and b.moderation='approved'));
