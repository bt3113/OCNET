-- Oracnet: versioned JSON documents with relational identity, ownership, and RLS.
-- Public catalogues and private workspace records share a stable repository contract.
create extension if not exists pgcrypto;
create type public.provenance_state as enum ('verified','vendor supplied','third-party sourced','community supplied','demo','unverified');
create or replace function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$ select coalesce(auth.jwt()->'app_metadata'->>'role','')='admin' $$;
create or replace function public.is_supplier() returns boolean language sql stable security invoker set search_path='' as $$ select coalesce(auth.jwt()->'app_metadata'->>'role','') in ('provider','integrator','consultant','admin') $$;
-- Never trust user_metadata for authorization. app_metadata is assigned by trusted administration.
do $$ declare t text; begin
foreach t in array array['users','organizations','providers','products','product_media','categories','capabilities','use_cases','use_case_capabilities','solution_stacks','stack_items','integrators','consultants','reviews','updates','articles','projects','proposals','saved_items','comparisons','message_threads','messages','notifications','verification_records','leads','media_assets','tags','integrations','compatibility','settings','team'] loop
 execute format('create table public.%I (id text primary key default gen_random_uuid()::text, owner_id uuid references auth.users(id) on delete cascade, data jsonb not null check (jsonb_typeof(data) = ''object''), published boolean not null default false, provenance public.provenance_state not null default ''unverified'', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint %I check (octet_length(data::text) <= 2000000))',t,t||'_size');
 execute format('alter table public.%I enable row level security',t);
 execute format('create index %I on public.%I(owner_id)',t||'_owner_idx',t);
 execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t);
end loop;end $$;
-- Generated relationship columns keep the JSON adapter while enforcing foreign keys.
alter table public.products add column provider_id text generated always as (data->>'providerId') stored references public.providers(id);
alter table public.product_media add column product_id text generated always as (data->>'productId') stored references public.products(id) on delete cascade;
alter table public.use_case_capabilities add column use_case_id text generated always as (data->>'useCaseId') stored references public.use_cases(id) on delete cascade, add column capability_id text generated always as (data->>'capabilityId') stored references public.capabilities(id);
alter table public.solution_stacks add column use_case_id text generated always as (data->>'useCaseId') stored references public.use_cases(id);
alter table public.stack_items add column stack_id text generated always as (data->>'stackId') stored references public.solution_stacks(id) on delete cascade, add column product_id text generated always as (data->>'productId') stored references public.products(id), add column capability_id text generated always as (data->>'capabilityId') stored references public.capabilities(id);
alter table public.reviews add column product_id text generated always as (data->>'productId') stored references public.products(id), add constraint review_rating check ((data->>'rating')::int between 1 and 5), add constraint review_body check (length(data->>'body') between 20 and 5000);
alter table public.proposals add column project_id text generated always as (data->>'projectId') stored references public.projects(id) on delete cascade;
alter table public.messages add column thread_id text generated always as (data->>'threadId') stored references public.message_threads(id) on delete cascade, add constraint message_body check (length(data->>'body') between 1 and 5000);
alter table public.integrations add column product_id text generated always as (data->>'productId') stored references public.products(id), add column target_id text generated always as (data->>'targetId') stored references public.products(id);
alter table public.compatibility add column product_id text generated always as (data->>'productId') stored references public.products(id), add column target_id text generated always as (data->>'targetId') stored references public.products(id);
create index messages_thread_idx on public.messages(thread_id,created_at);
create index products_provider_idx on public.products(provider_id);
create index proposals_project_idx on public.proposals(project_id);
-- Catalogue reads expose only explicitly published records.
do $$ declare t text;begin
foreach t in array array['providers','products','product_media','categories','capabilities','use_cases','use_case_capabilities','solution_stacks','stack_items','integrators','consultants','reviews','updates','articles','tags','integrations','compatibility'] loop
 execute format('create policy public_catalogue_read on public.%I for select to anon, authenticated using (published or owner_id=(select auth.uid()) or public.is_admin())',t);
end loop;
foreach t in array array['organizations','providers','products','product_media','integrators','consultants','media_assets','team'] loop
 execute format('create policy supplier_read on public.%I for select to authenticated using (owner_id=(select auth.uid()))',t);
 execute format('create policy supplier_insert on public.%I for insert to authenticated with check (owner_id=(select auth.uid()) and public.is_supplier() and not published)',t);
 execute format('create policy supplier_update on public.%I for update to authenticated using (owner_id=(select auth.uid()) and public.is_supplier()) with check (owner_id=(select auth.uid()) and public.is_supplier())',t);
 execute format('create policy supplier_delete on public.%I for delete to authenticated using (owner_id=(select auth.uid()) and public.is_supplier())',t);
end loop;
foreach t in array array['users','projects','saved_items','comparisons','settings','verification_records'] loop
 execute format('create policy owner_read on public.%I for select to authenticated using (owner_id=(select auth.uid()))',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check (owner_id=(select auth.uid()) and not published)',t);
 execute format('create policy owner_update on public.%I for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()))',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using (owner_id=(select auth.uid()))',t);
end loop;
end $$;
-- Server-managed membership: recipients cannot be added by arbitrary frontend JSON.
create table public.thread_members(thread_id text references public.message_threads(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,primary key(thread_id,user_id));
alter table public.thread_members enable row level security;
create policy read_own_membership on public.thread_members for select to authenticated using (user_id=(select auth.uid()) or public.is_admin());
create policy admin_membership on public.thread_members for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy thread_read on public.message_threads for select to authenticated using(owner_id=(select auth.uid()) or exists(select 1 from public.thread_members m where m.thread_id=id and m.user_id=(select auth.uid())));
create policy thread_create on public.message_threads for insert to authenticated with check(owner_id=(select auth.uid()) and not published);
create policy message_read on public.messages for select to authenticated using(exists(select 1 from public.message_threads t where t.id=thread_id));
create policy message_insert on public.messages for insert to authenticated with check(owner_id=(select auth.uid()) and data->>'senderId'=(select auth.uid())::text and exists(select 1 from public.message_threads t where t.id=thread_id));
-- Messages are append-only for users. Notifications/leads are created by trusted services.
create policy notification_read on public.notifications for select to authenticated using(owner_id=(select auth.uid()));
create policy notification_update on public.notifications for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy lead_read on public.leads for select to authenticated using(owner_id=(select auth.uid()));
create policy lead_update on public.leads for update to authenticated using(owner_id=(select auth.uid()) and public.is_supplier()) with check(owner_id=(select auth.uid()) and public.is_supplier());
create policy review_insert on public.reviews for insert to authenticated with check(owner_id=(select auth.uid()) and not published and data->>'status'='pending');
create policy proposal_read on public.proposals for select to authenticated using(owner_id=(select auth.uid()) or exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy proposal_insert on public.proposals for insert to authenticated with check(owner_id=(select auth.uid()) and public.is_supplier() and exists(select 1 from public.projects p where p.id=project_id));
create policy proposal_update on public.proposals for update to authenticated using(owner_id=(select auth.uid()) or exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid()))) with check(owner_id=(select auth.uid()) or exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid())));
-- Prevent self-publication, owner reassignment, forged evidence and verification escalation.
create or replace function public.guard_record() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.updated_at=now();
 if current_user in ('postgres','supabase_admin') or auth.role()='service_role' or public.is_admin() then return new;end if;
 if TG_OP='UPDATE' and new.owner_id is distinct from old.owner_id then raise exception 'Owner is immutable';end if;
 if TG_OP='INSERT' then new.published=false;new.provenance='unverified';
 elsif new.published is distinct from old.published or new.provenance is distinct from old.provenance then raise exception 'Publication and evidence require moderation';end if;
 if new.data->>'provenance'='verified' then raise exception 'Verified evidence requires moderation';end if;
 if TG_TABLE_NAME in ('reviews','verification_records') and coalesce(new.data->>'status','pending')<>'pending' then raise exception 'Review status requires moderation';end if;
 if TG_TABLE_NAME='notifications' and TG_OP='UPDATE' and (new.data-'read') is distinct from (old.data-'read') then raise exception 'Only notification read state can change';end if;
 if TG_TABLE_NAME='proposals' and TG_OP='UPDATE' and new.owner_id<>auth.uid() and (new.data-'status') is distinct from (old.data-'status') then raise exception 'Recipients can only update proposal status';end if;
 return new;
end $$;
do $$ declare t text;begin foreach t in array array['users','organizations','providers','products','product_media','categories','capabilities','use_cases','use_case_capabilities','solution_stacks','stack_items','integrators','consultants','reviews','updates','articles','projects','proposals','saved_items','comparisons','message_threads','messages','notifications','verification_records','leads','media_assets','tags','integrations','compatibility','settings','team'] loop execute format('create trigger guard_record before insert or update on public.%I for each row execute function public.guard_record()',t);end loop;end $$;
-- Storage: user-id prefix and private buckets. Public image delivery must use approved signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('logos','logos',false,1048576,array['image/png','image/jpeg','image/webp']),
('product-screenshots','product-screenshots',false,5242880,array['image/png','image/jpeg','image/webp']),
('video-media','video-media',false,52428800,array['video/mp4','video/webm']),
('company-media','company-media',false,5242880,array['image/png','image/jpeg','image/webp']),
('documents','documents',false,10485760,array['application/pdf']) on conflict(id) do nothing;
create policy own_asset_read on storage.objects for select to authenticated using(bucket_id in ('logos','product-screenshots','video-media','company-media','documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy own_asset_insert on storage.objects for insert to authenticated with check(bucket_id in ('logos','product-screenshots','video-media','company-media','documents') and (storage.foldername(name))[1]=(select auth.uid())::text and public.is_supplier());
create policy own_asset_update on storage.objects for update to authenticated using((storage.foldername(name))[1]=(select auth.uid())::text and public.is_supplier()) with check(bucket_id in ('logos','product-screenshots','video-media','company-media','documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy own_asset_delete on storage.objects for delete to authenticated using(bucket_id in ('logos','product-screenshots','video-media','company-media','documents') and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Postgres Changes honors table SELECT RLS. Do not use public broadcast channels for messages.
alter publication supabase_realtime add table public.messages,public.notifications;
