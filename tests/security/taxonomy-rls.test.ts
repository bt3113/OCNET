// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Marketplace taxonomy on real PostgreSQL (PGlite): Build ↔ Use Case limits, proposal
 * moderation, merges and RLS. Users are simulated the way PostgREST does it.
 */
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";

async function as(id: string, role = "authenticated", roles: string[] = []) {
  await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claims','${JSON.stringify({ sub: id, role, app_metadata: { roles, role: roles.includes("admin") ? "admin" : undefined } })}',false);`);
}
const asAdmin = () => as(admin, "authenticated", ["admin"]);
async function rows<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows;
}
const migration = (name: string) => readFileSync(`supabase/migrations/${name}`, "utf8");

const buildDoc = (id: string, ownerId: string, creatorId: string, useCaseIds: string[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    id, slug: id, name: `Build ${id} name`, tagline: "A tagline that is long enough", description: "A description that is comfortably longer than forty characters.",
    problem: "", intendedUsers: "", notes: "", ownerId, creatorId, visibility: "draft", publication: "draft", moderation: "pending", verification: "unverified",
    category: "ai-software", industry: "", demoUrl: "", githubUrl: "", sourceAvailable: false, cloneAllowed: false, commercialUseAllowed: false, license: "", attribution: "",
    buildTime: "", buildCost: "", currency: "USD", difficulty: "Intermediate", requirements: "", setupNotes: "", limitations: "", featured: false, ownershipConfirmed: true, createdAt: "2026-09-26T10:00:00Z", updatedAt: "2026-09-26T10:00:00Z",
    provenance: "creator supplied", stack: [], connections: [], media: [], sources: [], useCaseIds, capabilityIds: [], ...extra,
  }).replaceAll("'", "''");
const saveBuild = (doc: string) => db.query<{ save_build: { useCaseIds: string[] } }>(`select public.save_build('${doc}'::jsonb)`);

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;create publication supabase_realtime;insert into auth.users values('${owner}'),('${other}'),('${admin}');`,
  );
  for (const name of ["202609230001_marketplace.sql", "202609240001_build_graph.sql"]) await db.exec(migration(name));
  const search = migration("202609240002_search.sql");
  await db.exec(search.slice(search.indexOf("create or replace view"), search.indexOf("-- Server-only")));
  for (const name of ["202609250001_implementation_intelligence.sql", "202609250002_intelligence_search.sql", "202609250003_intelligence_hardening.sql", "202609260001_marketplace_taxonomy.sql"])
    await db.exec(migration(name));
  await db.exec(`grant usage on schema public,auth,storage to anon,authenticated,service_role;
     grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;`);
  // Trusted seed (migration context).
  await db.exec(`reset role; select set_config('request.jwt.claims','{}',false);
    insert into public.categories(id,data,published) values('ai-software','{"name":"AI"}',true);
    insert into public.use_case_categories(id,slug,name,level,"parentId") values
      ('finance','finance','Finance','category',null),('fin-ar','fin-ar','Accounts Receivable','subcategory','finance'),
      ('software-development','software-development','Software Development','category',null),('sd-coding','sd-coding','Coding','subcategory','software-development');
    insert into public.use_cases(id,data,published) values
      ('chase','{"name":"Chase overdue invoices","slug":"chase","categoryId":"finance","subcategoryId":"fin-ar","status":"approved"}',true),
      ('send','{"name":"Send invoices and record payments","slug":"send","categoryId":"finance","subcategoryId":"fin-ar","status":"approved"}',true),
      ('plan','{"name":"Plan and implement code changes","slug":"plan","categoryId":"software-development","subcategoryId":"sd-coding","status":"approved","originType":"technology-vendor-sourced","originEntityId":"xai"}',true),
      ('reconcile','{"name":"Reconcile customer payments","slug":"reconcile","categoryId":"finance","subcategoryId":"fin-ar","status":"approved"}',true),
      ('hidden','{"name":"Pending thing","slug":"hidden","status":"pending"}',false);
    insert into public.use_case_sources(id,name,"useCaseId","sourceType","sourceEntityId","originalDescription","sourceUrl","retrievedAt",attribution,status) values
      ('src-plan','xAI','plan','technology-vendor','xai','Use plan mode to architect changes.','https://x.ai/grok/use-cases','2026-09-26','© xAI','needs-verification'),
      ('src-hidden','x','hidden','oracnet-editorial','oracnet','Pending','https://example.com','2026-09-26','x','active');
    insert into public.use_case_aliases(id,name,"useCaseId",label,"aliasType","normalizedLabel") values('al-1','invoice chasing','chase','invoice chasing','hidden-search','invoice chasing');
    insert into public.creator_profiles(id,slug,name,"ownerId") values('owner-creator','owner-creator','Owner Studio','${owner}'),('other-creator','other-creator','Other Studio','${other}');`);
}, 60000);
afterAll(async () => {
  await db.close();
});

describe("taxonomy visibility", () => {
  it("anonymous visitors read categories and public sources, never pending ones", async () => {
    await as("", "anon");
    expect((await rows("select id from public.use_case_categories")).length).toBe(4);
    expect((await rows<{ id: string }>("select id from public.use_case_sources order by id")).map((row) => row.id)).toEqual(["src-plan"]);
    expect(await rows("select id from public.use_cases where id='hidden'")).toHaveLength(0);
  });
  it("only administrators change categories, sources and aliases; creators cannot create Use Cases directly", async () => {
    await as(owner);
    await expect(db.exec(`insert into public.use_case_categories(id,slug,name,level) values('x','x','Xx','category')`)).rejects.toThrow();
    await db.exec(`update public.use_case_sources set "originalDescription"='rewritten' where id='src-plan'`);
    await expect(db.exec(`insert into public.use_cases(id,owner_id,data,published) values('mine','${owner}','{"name":"My own use case"}',false)`)).rejects.toThrow();
    await as("", "anon");
    expect((await rows<{ d: string }>(`select "originalDescription" d from public.use_case_sources where id='src-plan'`))[0].d).toBe("Use plan mode to architect changes.");
  });
});

describe("Build ↔ Use Case rules", () => {
  it("stores up to three Use Cases in order, first as primary", async () => {
    await as(owner);
    const result = await saveBuild(buildDoc("b1", owner, "owner-creator", ["plan", "chase", "send"]));
    expect(result.rows[0].save_build.useCaseIds).toEqual(["plan", "chase", "send"]);
    expect(await rows<{ role: string }>(`select role from public.build_use_cases where "buildId"='b1' order by "sortOrder"`)).toEqual([{ role: "primary" }, { role: "secondary" }, { role: "secondary" }]);
  });
  it("refuses a fourth Use Case", async () => {
    await as(owner);
    await expect(saveBuild(buildDoc("b1", owner, "owner-creator", ["plan", "chase", "send", "reconcile"]))).rejects.toThrow(/at most 3/);
    await expect(db.exec(`insert into public.build_use_cases("buildId","useCaseId",role,"sortOrder") values('b1','reconcile','secondary',2)`)).rejects.toThrow();
  });
  it("refuses unapproved Use Cases", async () => {
    await as(owner);
    await expect(saveBuild(buildDoc("b2", owner, "owner-creator", ["hidden"]))).rejects.toThrow(/approved Use Cases/);
  });
});

describe("Use Case proposals", () => {
  it("lets a provider propose one Use Case for their own Build, never approve it", async () => {
    await as(owner);
    await saveBuild(buildDoc("b3", owner, "owner-creator", ["chase"]));
    await db.exec(`insert into public.use_case_proposals(id,"buildId","creatorId","originalText","suggestedTitle","suggestedCategoryId","suggestedSubcategoryId") values('p1','b3','owner-creator','automatically sending teh invoice to customer then recording it in xero','Send invoices and record them in Xero','finance','fin-ar')`);
    await expect(db.exec(`insert into public.use_case_proposals(id,"buildId","creatorId","originalText","suggestedTitle") values('p2','b3','owner-creator','another proposal text','Another proposal title')`)).rejects.toThrow();
    await expect(db.exec(`insert into public.use_case_proposals(id,"buildId","creatorId","originalText","suggestedTitle",status) values('p3','b1','owner-creator','proposal text here','Proposal title here','approved')`)).rejects.toThrow();
    await expect(db.exec(`update public.use_case_proposals set status='approved' where id='p1'`)).resolves.toBeDefined();
    expect((await rows<{ status: string }>(`select status from public.use_case_proposals where id='p1'`))[0].status).toBe("pending");
  });
  it("counts an open proposal toward the three-Use-Case limit", async () => {
    await as(owner);
    await expect(db.exec(`insert into public.use_case_proposals(id,"buildId","creatorId","originalText","suggestedTitle") values('p4','b1','owner-creator','proposal for a full build','Proposal for a full build')`)).rejects.toThrow(/at most 3/);
  });
  it("hides proposals from other users and anonymous visitors", async () => {
    await as(other);
    expect(await rows("select id from public.use_case_proposals")).toHaveLength(0);
    await expect(db.exec(`insert into public.use_case_proposals(id,"buildId","creatorId","originalText","suggestedTitle") values('p5','b3','other-creator','someone else build','Someone else build')`)).rejects.toThrow();
    await as("", "anon");
    expect(await rows("select id from public.use_case_proposals")).toHaveLength(0);
  });
  it("only administrators map proposals; mapping repairs the Build and keeps the original text", async () => {
    await as(owner);
    await expect(db.exec(`select public.map_use_case_proposal('p1','send')`)).rejects.toThrow(/administrator/);
    await asAdmin();
    await db.exec(`select public.map_use_case_proposal('p1','send','Existing Use Case covers this')`);
    expect((await rows<{ status: string; r: string }>(`select status, "resolvedUseCaseId" r from public.use_case_proposals where id='p1'`))[0]).toEqual({ status: "mapped", r: "send" });
    expect((await rows<{ id: string }>(`select "useCaseId" id from public.build_use_cases where "buildId"='b3' order by "sortOrder"`)).map((row) => row.id)).toEqual(["chase", "send"]);
    expect((await rows<{ t: string }>(`select "aliasType" t from public.use_case_aliases where "useCaseId"='send' and label like 'automatically sending%'`))[0].t).toBe("original-source");
    expect((await rows(`select 1 from public.audit_events where "entityId"='p1'`)).length).toBeGreaterThan(0);
  });
  it("approval publishes the reviewed title and keeps the provider's wording as the source", async () => {
    await as(owner);
    await saveBuild(buildDoc("b4", owner, "owner-creator", []));
    await db.exec(`insert into public.use_case_proposals(id,"buildId","creatorId","originalText","suggestedTitle") values('p6','b4','owner-creator','reconsile bank statments weekly','Reconcile bank statements weekly')`);
    await asAdmin();
    const [{ id }] = await rows<{ id: string }>(`select public.approve_use_case_proposal('p6','Reconcile bank statements','Match bank lines to invoices and payments.','finance','fin-ar') id`);
    await as("", "anon");
    expect((await rows<{ name: string }>(`select data->>'name' as name from public.use_cases where id='${id}'`))[0].name).toBe("Reconcile bank statements");
    expect((await rows<{ t: string }>(`select "originalTitle" t from public.use_case_sources where "useCaseId"='${id}'`))[0].t).toBe("reconsile bank statments weekly");
    await asAdmin();
    expect((await rows<{ id: string }>(`select "useCaseId" id from public.build_use_cases where "buildId"='b4'`)).map((row) => row.id)).toEqual([id]);
  });
});

describe("indexing and merges", () => {
  it("never approves a Build that has only a proposal", async () => {
    await as(owner);
    await saveBuild(buildDoc("b5", owner, "owner-creator", []));
    await db.exec(`insert into public.use_case_proposals(id,"buildId","creatorId","originalText","suggestedTitle") values('p7','b5','owner-creator','some brand new work item','Some brand new work item')`);
    await asAdmin();
    await expect(db.exec(`update public.builds set publication='published', moderation='approved' where id='b5'`)).rejects.toThrow(/approved Use Case/);
  });
  it("merging moves Build links, keeps a primary, and redirects the old slug", async () => {
    await asAdmin();
    await db.exec(`select public.merge_use_cases('send','chase')`);
    expect((await rows<{ id: string; role: string }>(`select "useCaseId" id, role from public.build_use_cases where "buildId"='b1' order by "sortOrder"`))).toEqual([
      { id: "plan", role: "primary" },
      { id: "chase", role: "secondary" },
    ]);
    expect((await rows<{ id: string }>(`select "useCaseId" id from public.build_use_cases where "buildId"='b3'`)).map((row) => row.id)).toEqual(["chase"]);
    expect((await rows<{ t: string }>(`select target t from public.use_case_redirects where "fromSlug"='send'`))[0].t).toBe("chase");
    expect((await rows<{ p: boolean; s: string }>(`select published p, status s from public.use_cases where id='send'`))[0]).toEqual({ p: false, s: "merged" });
    await as(owner);
    await expect(db.exec(`select public.merge_use_cases('chase','plan')`)).rejects.toThrow(/administrator/);
  });
});
