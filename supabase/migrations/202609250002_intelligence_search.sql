-- Expand the security-invoker catalogue after the implementation-intelligence migration.
-- Relevance remains organic; sponsorship is not a ranking input.
create or replace view public.search_documents with (security_invoker=true) as
 select i.id,i.name,i.summary description,'Implementation'::text type,'/implementations/'||i.slug path,i.provenance,
   i."contextSummary"||' '||i.industry||' '||i."businessType"||' '||i."organizationSizeBand"||' '||i.region||' '||i."verificationState"||' '||
   coalesce((select array_to_string(c."existingSystems",' ')||' '||array_to_string(c."workflowCharacteristics",' ') from public.implementation_contexts c where c."implementationId"=i.id),'') body,
   i."updatedAt" updated_at
 from public.implementation_records i
 where i.visibility='public' and i."publicationState"='published' and i."moderationState"='approved'
 union all
 select b.id,b.name,b.description,'Blueprint','/blueprints/'||b.slug,b.provenance,
   b.description||' '||array_to_string(b."capabilityIds",' ')||' '||array_to_string(b."requiredSkills",' ')||' '||b."reuseRights"||' '||b."estimatedComplexity"||' '||b."knownLimitations",b."updatedAt"
 from public.blueprints b where b."publicationState"='published' and b."moderationState"='approved'
 union all
 select b.id,b.name,b.tagline,'Build','/builds/'||b.slug,b.provenance,
   b.description||' '||b.industry||' '||coalesce((select string_agg(p.data->>'name',' ') from public.build_stack_items s join public.products p on p.id=s."productId" where s."buildId"=b.id),'')||' '||coalesce((select string_agg(u.data->>'name',' ') from public.build_use_cases x join public.use_cases u on u.id=x."useCaseId" where x."buildId"=b.id),'')||' '||coalesce((select c.name from public.creator_profiles c where c.id=b."creatorId"),'') body,b."updatedAt"
 from public.builds b where b.visibility='public' and b.publication='published' and b.moderation='approved'
 union all select id,name,headline,'Creator','/creators/'||slug,provenance,bio||' '||array_to_string(expertise,' '),"createdAt" from public.creator_profiles
 union all select id,data->>'name',data->>'description','Technology','/technologies/'||(data->>'slug'),provenance::text,(data->>'description')||' '||coalesce(data->>'capabilityIds',''),updated_at from public.products where published
 union all select id,data->>'name',data->>'description','Use case','/use-cases/'||(data->>'slug'),provenance::text,coalesce(data->>'outcome',''),updated_at from public.use_cases where published
 union all select id,data->>'name',data->>'description','Provider','/providers/'||(data->>'slug'),provenance::text,coalesce(data->>'specialties',''),updated_at from public.providers where published
 union all select 'implementer-'||id,data->>'name',data->>'description','Implementer','/integrators/'||(data->>'slug'),provenance::text,coalesce(data->>'specialties','')||' '||coalesce(data->>'region',''),updated_at from public.integrators where published
 union all select id,data->>'name',data->>'description','Stack','/solution-stacks/'||(data->>'slug'),provenance::text,coalesce(data->>'description',''),updated_at from public.solution_stacks where published
 union all select id,data->>'name',data->>'description','Resource','/resources/'||(data->>'slug'),provenance::text,coalesce(data->>'body',''),updated_at from public.articles where published;

create index if not exists implementation_intelligence_fts on public.implementation_records using gin(to_tsvector('english',name||' '||summary||' '||"contextSummary"||' '||industry||' '||"businessType"||' '||region));
create index if not exists blueprint_intelligence_fts on public.blueprints using gin(to_tsvector('english',name||' '||description||' '||"knownLimitations"));

create or replace function public.search_catalogue(query text,kind text default null,result_limit integer default 40)
returns setof jsonb language sql stable security invoker set search_path='' as $$
 with candidates as(
   select d.*,setweight(to_tsvector('english',coalesce(d.name,'')),'A')||setweight(to_tsvector('english',coalesce(d.description,'')||' '||coalesce(d.body,'')),'B') document
   from public.search_documents d where kind is null or d.type=kind
 )
 select to_jsonb(c)-'document'-'body'||jsonb_build_object('score',case when query='' then 0 else ts_rank_cd(c.document,websearch_to_tsquery('english',query)) end)
 from candidates c
 where query='' or c.document@@websearch_to_tsquery('english',query)
 order by case when query='' then 0 else ts_rank_cd(c.document,websearch_to_tsquery('english',query)) end desc,c.updated_at desc
 limit least(greatest(result_limit,1),100)
$$;
