// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { hashToken } from "../../src/data/attestation";

/**
 * Implementation-intelligence RLS and trigger tests on real PostgreSQL (PGlite).
 * Users are simulated with SET ROLE + request.jwt.claims exactly as PostgREST does.
 */
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";

async function as(id: string, role = "authenticated", roles: string[] = []) {
  await db.exec(`reset role; set role ${role}; select set_config('request.jwt.claims','${JSON.stringify({ sub: id, role, app_metadata: { roles } })}',false);`);
}
const asAdmin = () => as(admin, "authenticated", ["admin"]);
const asService = () => as("", "service_role");
async function rows<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows;
}
const migration = (name: string) => readFileSync(`supabase/migrations/${name}`, "utf8");

const record = (id: string, ownerId: string, extra = "") =>
  `insert into public.implementation_records(id,slug,name,summary,"ownerId","publicationState",visibility,"moderationState","verificationState"${extra ? "," + extra.split("=")[0] : ""})
   values('${id}','${id}','Record ${id} name','A published implementation summary for testing.','${ownerId}','published','public','approved','independently-audited'${extra ? "," + extra.split("=")[1] : ""})`;

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;create publication supabase_realtime;insert into auth.users values('${owner}'),('${other}'),('${admin}');`,
  );
  await db.exec(migration("202609230001_marketplace.sql"));
  await db.exec(migration("202609240001_build_graph.sql"));
  const search = migration("202609240002_search.sql");
  await db.exec(search.slice(search.indexOf("create or replace view"), search.indexOf("-- Server-only")));
  await db.exec(migration("202609250001_implementation_intelligence.sql"));
  await db.exec(migration("202609250002_intelligence_search.sql"));
  await db.exec(migration("202609250003_intelligence_hardening.sql"));
  await db.exec(
    `grant usage on schema public,auth,storage to anon,authenticated,service_role;
     grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;
     grant select on public.search_documents to anon,authenticated;
     insert into public.providers(id,data,published) values('vendor','{"name":"Vendor"}',true);
     insert into public.products(id,data,published) values('tool','{"name":"Twilio","providerId":"vendor","slug":"tool"}',true),('tool2','{"name":"HubSpot","providerId":"vendor","slug":"tool2"}',true);
     insert into public.capabilities(id,data,published) values('cap','{"name":"Capability"}',true);
     insert into public.use_cases(id,data,published) values('case','{"name":"Case"}',true);
     insert into public.metric_definitions(id,slug,name,unit,direction,category) values('rate','rate','Rate','%','lower-better','x');`,
  );
  // Trusted (migration) context seeds one approved public record per user.
  await db.exec(`reset role; select set_config('request.jwt.claims','{}',false);`);
  await db.exec(record("a-public", owner));
  await db.exec(record("b-public", other));
  await db.exec(`insert into public.implementation_stack_items(id,name,"implementationId","productId","capabilityId",role,"evidenceLevel") values('a-stack','Twilio','a-public','tool','cap','Telephony','creator-reported');
    insert into public.implementation_metrics(id,name,"implementationId","metricDefinitionId","baselineValue","observedValue",unit) values('a-public-rate','Rate','a-public','rate',20,10,'%');
    insert into public.claims(id,name,"subjectType","subjectId",predicate,value,claimant,status,"evidenceLevel",public) values
      ('a-claim','Rate','metric','a-public-rate','observed-value','10','Owner','accepted','creator-reported',true),
      ('a-arch','Architecture','implementation','a-public','architecture-deployed','Recorded','Owner','accepted','creator-reported',true);`);
}, 60000);
afterAll(async () => {
  await db.close();
});

describe("implementation records", () => {
  it("anonymous visitors see only approved public records and their children", async () => {
    await as(owner);
    await db.exec(`insert into public.implementation_records(id,slug,name,summary,"ownerId","publicationState",visibility) values('a-draft','a-draft','Owner draft record','A draft that must stay private to its owner.','${owner}','published','public')`);
    await as("", "anon");
    expect((await rows<{ id: string }>("select id from public.implementation_records order by id")).map((r) => r.id)).toEqual(["a-public", "b-public"]);
    await as(other);
    expect(await rows("select id from public.implementation_records where id='a-draft'")).toHaveLength(0);
  });
  it("owners cannot self-approve, self-verify or set trusted fields", async () => {
    await as(owner);
    await db.exec(`update public.implementation_records set "moderationState"='approved',"verificationState"='independently-audited',provenance='verified',demo=true where id='a-draft'`);
    const [draft] = await rows<Record<string, unknown>>(`select "moderationState","verificationState",provenance,demo from public.implementation_records where id='a-draft'`);
    expect(draft).toEqual({ moderationState: "pending", verificationState: "unverified", provenance: "creator supplied", demo: false });
  });
  it("material edits and child edits send an approved record back to review", async () => {
    await as(owner);
    await db.exec(`update public.implementation_records set "implementationCost"=999 where id='a-public'`);
    expect((await rows<{ m: string }>(`select "moderationState" m from public.implementation_records where id='a-public'`))[0].m).toBe("pending");
    await asAdmin();
    await db.exec(`update public.implementation_records set "moderationState"='approved' where id='a-public'`);
    await as(owner);
    await db.exec(`update public.implementation_metrics set "observedValue"=1 where id='a-public-rate'`);
    expect((await rows<{ m: string }>(`select "moderationState" m from public.implementation_records where id='a-public'`))[0].m).toBe("pending");
    await asAdmin();
    await db.exec(`update public.implementation_records set "moderationState"='approved' where id='a-public'`);
  });
  it("owners cannot set evidence levels on child rows", async () => {
    await as(owner);
    await db.exec(`insert into public.implementation_stack_items(id,name,"implementationId","productId","capabilityId",role,"evidenceLevel") values('a-stack-2','HubSpot','a-draft','tool2','cap','CRM','independently-audited')`);
    expect((await rows<{ e: string }>(`select "evidenceLevel" e from public.implementation_stack_items where id='a-stack-2'`))[0].e).toBe("creator-reported");
  });
  it("other users cannot edit or add children to someone else's record", async () => {
    await as(other);
    await db.exec(`update public.implementation_records set name='Hijacked name' where id='a-public'`);
    await expect(db.exec(`insert into public.implementation_metrics(id,name,"implementationId","metricDefinitionId",unit) values('x','x','a-public','rate','%')`)).rejects.toThrow();
    await as("", "anon");
    expect((await rows<{ name: string }>(`select name from public.implementation_records where id='a-public'`))[0].name).toBe("Record a-public name");
  });
});

describe("claims", () => {
  it("cannot be created on someone else's subject", async () => {
    await as(other);
    await expect(db.exec(`insert into public.claims(id,name,"subjectType","subjectId",predicate,value,claimant,public) values('b-forged','Forged','implementation','a-public','cost','90%','Owner Customer',true)`)).rejects.toThrow();
  });
  it("cannot be retargeted onto someone else's record", async () => {
    await as(other);
    await db.exec(`insert into public.claims(id,name,"subjectType","subjectId",predicate,value,claimant,public) values('b-own','Own claim','implementation','b-public','note','value','Other',true)`);
    await expect(db.exec(`update public.claims set "subjectId"='a-public' where id='b-own'`)).rejects.toThrow();
  });
  it("round-trip inserts return the owner's row (connected-mode upsert)", async () => {
    await as(owner);
    const inserted = await rows<{ id: string; status: string; e: string }>(
      `insert into public.claims(id,name,"subjectType","subjectId",predicate,value,claimant,status,"evidenceLevel",public) values('a-new','New','implementation','a-public','went-live','2026','Owner','accepted','independently-audited',true) returning id,status,"evidenceLevel" e`,
    );
    expect(inserted).toEqual([{ id: "a-new", status: "pending", e: "creator-reported" }]);
  });
  it("pending claims are not public; accepted edits return to pending", async () => {
    await as("", "anon");
    expect(await rows(`select id from public.claims where id='a-new'`)).toHaveLength(0);
    expect(await rows(`select id from public.claims where id='a-arch'`)).toHaveLength(1);
    await asAdmin();
    await db.exec(`update public.claims set "evidenceLevel"='evidence-reviewed' where id='a-arch'`);
    await as(owner);
    await db.exec(`update public.claims set predicate='changed-meaning' where id='a-arch'`);
    await asAdmin();
    expect(await rows(`select status,"evidenceLevel" e from public.claims where id='a-arch'`)).toEqual([{ status: "pending", e: "creator-reported" }]);
  });
  it("providers can file private corrections that owners and reviewers see, but the public does not", async () => {
    await as(other);
    await db.exec(`insert into public.claims(id,name,"subjectType","subjectId",predicate,value,claimant,public,"claimantType") values('b-correction','Correction','implementation','a-public','provider-correction','Wrong version recorded','Vendor','false','provider')`);
    await as("", "anon");
    expect(await rows(`select id from public.claims where id='b-correction'`)).toHaveLength(0);
    await as(owner);
    expect(await rows(`select id from public.claims where id='b-correction'`)).toHaveLength(1);
  });
});

describe("evidence and attestations", () => {
  it("evidence cannot point into another user's folder or attach to another user's claim", async () => {
    await as(other);
    await expect(db.exec(`insert into public.evidence_artifacts(id,name,"ownerId",kind,"storagePath") values('b-ev','x','${other}','other','implementation-evidence/${owner}/secret.pdf')`)).rejects.toThrow();
    await db.exec(`insert into public.evidence_artifacts(id,name,"ownerId",kind) values('b-ev2','x','${other}','other')`);
    await expect(db.exec(`insert into public.claim_evidence(id,name,"claimId","evidenceArtifactId",relationship) values('link','x','a-claim','b-ev2','contradicts')`)).rejects.toThrow();
  });
  it("owners cannot create or complete attestations directly", async () => {
    await as(owner);
    await expect(db.exec(`insert into public.attestations(id,name,"implementationId","ownerId","tokenHash","expiresAt",status) values('forged','x','a-public','${owner}','${"f".repeat(64)}',now()+interval '10 years','submitted')`)).rejects.toThrow();
    await expect(db.query("select public.apply_attestation('x','{}'::jsonb,'public')")).rejects.toThrow();
  });
  it("service-role attestation is scoped, single-use and records events", async () => {
    const hash = hashToken("test-token-abcdefghijklmnopqrstuvwxyz0123456789");
    await asService();
    await expect(db.query(`select public.create_attestation($1,'a-public',array['b-own'],'Ops lead','anonymous',$2,now()+interval '14 days','ops@example.org')`, [owner, hash])).rejects.toThrow();
    await expect(db.query(`select public.create_attestation($1,'a-public',array['a-claim'],'Ops lead','anonymous',$2,now()+interval '14 days','ops@example.org')`, [other, hash])).rejects.toThrow();
    const [{ id }] = await rows<{ id: string }>(`select public.create_attestation($1,'a-public',array['a-claim'],'Ops lead','anonymous',$2,now()+interval '14 days','ops@example.org') id`, [owner, hash]);
    await expect(db.query(`select public.apply_attestation($1,'{"a-arch":"confirm"}'::jsonb,'private')`, [hash])).rejects.toThrow();
    await db.query(`select public.apply_attestation($1,'{"a-claim":"confirm"}'::jsonb,'private')`, [hash]);
    expect(await rows(`select status,"evidenceLevel" e from public.claims where id='a-claim'`)).toEqual([{ status: "accepted", e: "customer-attested" }]);
    expect(await rows(`select status,"customerIdentityVisibility" v from public.attestations where id=$1`, [id])).toEqual([{ status: "submitted", v: "private" }]);
    expect(await rows(`select * from public.attestation_contacts where "attestationId"=$1`, [id])).toHaveLength(0);
    await expect(db.query(`select public.apply_attestation($1,'{"a-claim":"reject"}'::jsonb,'public')`, [hash])).rejects.toThrow();
    await as(owner);
    await expect(db.exec(`update public.attestations set status='pending' where id='${id}'`)).rejects.toThrow();
    await as(other);
    expect(await rows(`select id from public.attestations`)).toHaveLength(0);
    expect(await rows(`select * from public.attestation_contacts`)).toHaveLength(0);
  });
});

describe("audit and history", () => {
  it("records field-level audit events that nobody can rewrite", async () => {
    await asAdmin();
    const audit = await rows<{ detail: { changed: string[] } }>(`select detail from public.audit_events where "entityId"='a-arch' and action='update' order by at desc limit 1`);
    expect(audit[0].detail.changed).toContain("predicate");
    const before = (await rows<{ n: number }>(`select count(*)::int n from public.audit_events`))[0].n;
    expect(before).toBeGreaterThan(0);
    // No DELETE/UPDATE policy exists for reviewers: statements affect nothing.
    expect((await db.query(`delete from public.audit_events`)).affectedRows).toBe(0);
    expect((await db.query(`update public.audit_events set action='forged'`)).affectedRows).toBe(0);
    // Even the service role (bypasses RLS) is stopped by the append-only trigger.
    await asService();
    await expect(db.exec(`delete from public.audit_events`)).rejects.toThrow(/append-only/);
    await expect(db.exec(`update public.verification_events set action='forged'`)).rejects.toThrow(/append-only/);
    await asAdmin();
    expect((await rows<{ n: number }>(`select count(*)::int n from public.audit_events`))[0].n).toBe(before);
  });
  it("ordinary users cannot read audit history or grant themselves roles", async () => {
    await as(owner);
    expect(await rows(`select id from public.audit_events`)).toHaveLength(0);
    await expect(db.exec(`insert into public.user_roles values('esc','Admin','${owner}','admin','verified')`)).rejects.toThrow();
    await expect(db.exec(`insert into public.verification_events(id,name,"subjectType","subjectId",action,"actorId") values('v','x','claim','a-claim','forged','${owner}')`)).rejects.toThrow();
  });
});

describe("Blueprints, runs and search", () => {
  it("Blueprints need their own source record and a sanitization gate before approval", async () => {
    await as(other);
    await expect(db.exec(`insert into public.blueprints(id,slug,name,"ownerId","currentVersionId","maintainerId","derivedFromImplementationId") values('bp-steal','bp-steal','Stolen pattern','${other}','v','m','a-public')`)).rejects.toThrow();
    await as(owner);
    await db.exec(`insert into public.blueprints(id,slug,name,"ownerId","currentVersionId","maintainerId","derivedFromImplementationId","publicationState") values('bp','bp','Owner pattern','${owner}','bp-v1','m','a-public','published')`);
    await db.exec(`insert into public.blueprint_versions(id,name,"blueprintId",version) values('bp-v1','v1','bp','1.0')`);
    await asAdmin();
    await expect(db.exec(`update public.blueprints set "moderationState"='approved' where id='bp'`)).rejects.toThrow();
    await db.exec(`update public.blueprints set "sanitizationConfirmedAt"=current_date,"rightsDeclaredAt"=current_date,"moderationState"='approved' where id='bp'`);
    await as("", "anon");
    expect(await rows(`select id from public.blueprints where id='bp'`)).toHaveLength(1);
    await as(owner);
    await db.exec(`update public.blueprint_versions set "changeNotes"='Edited' where id='bp-v1'`);
    await as("", "anon");
    expect(await rows(`select id from public.blueprints where id='bp'`)).toHaveLength(0);
  });
  it("solution runs cannot reference another user's requirement profile", async () => {
    await as(other);
    await db.exec(`insert into public.requirement_profiles(id,name,"ownerId",objective) values('b-profile','Profile','${other}','Answer enquiries')`);
    await as(owner);
    await expect(db.exec(`insert into public.solution_runs(id,name,"ownerId","requirementProfileId","engineVersion","rulesetVersion") values('run','Run','${owner}','b-profile','1','1')`)).rejects.toThrow();
    expect(await rows(`select id from public.requirement_profiles`)).toHaveLength(0);
  });
  it("full-text search never returns drafts and indexes recorded technologies", async () => {
    await as("", "anon");
    const found = await rows<{ result: { id: string } }>(`select public.search_catalogue('Twilio','Implementation',40) as result`);
    expect(found.map((r) => r.result.id)).toEqual(["a-public"]);
    // HubSpot appears only in the owner's unapproved draft stack.
    expect(await rows(`select public.search_catalogue('HubSpot','Implementation',40) as result`)).toHaveLength(0);
    const drafts = await rows<{ result: { id: string } }>(`select public.search_catalogue('Owner draft','Implementation',40) as result`);
    expect(drafts).toHaveLength(0);
  });
});
