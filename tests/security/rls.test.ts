// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { remixBuild } from "../../src/data/build-domain";
import type { Build } from "../../src/data/build-model";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  admin = "33333333-3333-4333-8333-333333333333";
async function identity(
  id: string,
  role = "authenticated",
  roles: string[] = [],
) {
  await db.exec(
    `reset role; set role ${role}; select set_config('request.jwt.claims','${JSON.stringify({ sub: id, role, app_metadata: { roles } })}',false);`,
  );
}
beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;create publication supabase_realtime;insert into auth.users values('${owner}'),('${other}'),('${admin}');`,
  );
  await db.exec(
    readFileSync("supabase/migrations/202609230001_marketplace.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202609240001_build_graph.sql", "utf8"),
  );
  await db.exec(
    `grant usage on schema public,auth,storage to anon,authenticated;grant select,insert,update,delete on all tables in schema public to anon,authenticated;insert into public.categories(id,data,published) values('ai-software','{"name":"AI"}',true);insert into public.providers(id,data,published) values('vendor','{"name":"Vendor"}',true);insert into public.products(id,data,published) values('tool','{"name":"Tool","providerId":"vendor"}',true);insert into public.capabilities(id,data,published) values('cap','{"name":"Capability"}',true);insert into public.use_cases(id,data,published) values('case','{"name":"Case"}',true);insert into public.creator_profiles(id,slug,name,"ownerId") values('creator','creator','Test Creator','${owner}');insert into public.builds(id,slug,name,"ownerId","creatorId",category) values('private-build','private-build','Private draft','${owner}','creator','ai-software');insert into public.builds(id,slug,name,tagline,description,"ownerId","creatorId",category,visibility,publication,moderation,"ownershipConfirmed","cloneAllowed",license,attribution) values('public-build','public-build','Published build','A published demonstration','A sufficiently detailed implementation description for testing.','${owner}','creator','ai-software','public','published','approved',true,true,'Blueprint attribution required','Original creator');insert into public.build_stack_items(id,"buildId","productId","capabilityId",role,evidence) values('node','public-build','tool','cap','Reasoning','creator-confirmed');insert into public.build_use_cases values('public-build','case');`,
  );
}, 60000);
afterAll(async () => {
  await db.close();
});
describe("Build graph RLS on actual PostgreSQL", () => {
  it("anonymous sees public builds but cannot see private drafts or graph children", async () => {
    await identity("", "anon");
    const r = await db.query("select id from public.builds");
    expect(r.rows).toEqual([{ id: "public-build" }]);
    expect(
      (await db.query("select public.get_build('private-build') as b")).rows,
    ).toEqual([{ b: null }]);
  });
  it("unrelated authenticated account cannot edit or discover a draft", async () => {
    await identity(other);
    expect(
      (await db.query("select id from public.builds where id='private-build'"))
        .rows,
    ).toHaveLength(0);
    await db.exec(
      "update public.builds set name='Hijacked' where id='private-build'",
    );
    await identity(owner);
    expect(
      (
        await db.query(
          "select name from public.builds where id='private-build'",
        )
      ).rows,
    ).toEqual([{ name: "Private draft" }]);
  });
  it("owner can edit a draft but cannot self-verify or grant admin", async () => {
    await identity(owner);
    await db.exec(
      "update public.builds set name='Revised draft' where id='private-build'",
    );
    await expect(
      db.exec(
        "update public.builds set verification='verified' where id='private-build'",
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into public.user_roles values('escalate','Admin','${owner}','admin','verified')`,
      ),
    ).rejects.toThrow();
  });
  it("private collections cannot be read or moved into by another user", async () => {
    await identity(owner);
    await db.exec(
      `insert into public.collections(id,name,slug,"ownerId") values('private-research','Private research','private-research','${owner}')`,
    );
    await identity(other);
    expect(
      (await db.query("select * from public.collections")).rows,
    ).toHaveLength(0);
    await expect(
      db.exec(
        `insert into public.collection_items(id,name,"collectionId","ownerId","entityId","entityType") values('injected','Injected','private-research','${other}','public-build','builds')`,
      ),
    ).rejects.toThrow();
  });
  it("trusted collaborator can edit but cannot transfer ownership", async () => {
    await identity(admin, "authenticated", ["admin"]);
    await db.exec(
      `insert into public.build_collaborators(id,name,"buildId","userId",role) values('collab','Editor','private-build','${other}','editor')`,
    );
    await identity(other);
    await db.exec(
      "update public.builds set notes='Collaborative edit' where id='private-build'",
    );
    expect(
      (
        await db.query(
          "select notes from public.builds where id='private-build'",
        )
      ).rows,
    ).toEqual([{ notes: "Collaborative edit" }]);
    await expect(
      db.exec(
        `update public.builds set "ownerId"='${other}' where id='private-build'`,
      ),
    ).rejects.toThrow();
  });
  it("admin moderation records immutable audit evidence", async () => {
    await identity(admin, "authenticated", ["admin"]);
    await db.exec(
      "update public.builds set verification='verified' where id='public-build'",
    );
    expect(
      (await db.query("select * from public.audit_events")).rows.length,
    ).toBeGreaterThan(0);
    await expect(
      db.exec("delete from public.audit_events"),
    ).resolves.toBeDefined();
    expect(
      (await db.query("select * from public.audit_events")).rows.length,
    ).toBeGreaterThan(0);
  });
  it("editing a published stack revokes its previous moderation", async () => {
    await identity(owner);
    await db.exec(
      "update public.build_stack_items set notes='Changed implementation' where id='node'",
    );
    expect(
      (
        await db.query(
          "select moderation from public.builds where id='public-build'",
        )
      ).rows,
    ).toEqual([{ moderation: "pending" }]);
  });
  it("claims are claimant/admin only and cannot be self-approved", async () => {
    await identity(owner);
    await db.exec(
      `insert into public.provider_claims(id,name,"providerId","ownerId",evidence) values('claim','Claim','vendor','${owner}','Company representation evidence provided for review')`,
    );
    await identity(other);
    expect(
      (await db.query("select * from public.provider_claims")).rows,
    ).toHaveLength(0);
    await identity(owner);
    await db.exec(
      "update public.provider_claims set status='approved' where id='claim'",
    );
    expect(
      (
        await db.query(
          "select status from public.provider_claims where id='claim'",
        )
      ).rows,
    ).toEqual([{ status: "pending" }]);
  });
  it("enquiry creates only server-selected participants and unrelated users cannot read it", async () => {
    await identity(admin, "authenticated", ["admin"]);
    await db.exec(
      "update public.builds set moderation='approved' where id='public-build'",
    );
    await identity(other);
    const r = await db.query<{ id: string }>(
      "select public.start_build_enquiry('public-build','Please help adapt this implementation to our workflow.') as id",
    );
    const id = r.rows[0].id;
    expect(
      (await db.query(`select * from public.messages where thread_id='${id}'`))
        .rows,
    ).toHaveLength(1);
    await identity(owner);
    expect(
      (await db.query(`select * from public.messages where thread_id='${id}'`))
        .rows,
    ).toHaveLength(1);
    await identity("", "anon");
    expect(
      (await db.query(`select * from public.messages where thread_id='${id}'`))
        .rows,
    ).toHaveLength(0);
  });
  it("seed graph round-trips through the same transaction used by the app", async () => {
    await db.exec("reset role");
    await db.exec(readFileSync("supabase/seed.sql", "utf8"));
    const sql = readFileSync("supabase/seed-builds.sql", "utf8")
      .replaceAll(":'demo_owner_id'", "'" + owner + "'")
      .replaceAll(":'demo_studio_id'", "'" + other + "'")
      .replaceAll(":'demo_maya_id'", "'" + admin + "'");
    await db.exec(sql);
    await identity(owner);
    const rows = await db.query<{ b: Record<string, unknown> }>(
      "select public.get_build('ai-dental-receptionist') as b",
    );
    expect(rows.rows[0].b.stack).toHaveLength(4);
    const doc = { ...rows.rows[0].b, notes: "Creator revision" };
    await db.query("select public.save_build($1::jsonb)", [
      JSON.stringify(doc),
    ]);
    expect(
      (
        await db.query<{ b: { moderation: string } }>(
          "select public.get_build('ai-dental-receptionist') as b",
        )
      ).rows[0].b.moderation,
    ).toBe("pending");
    await identity(other);
    await expect(
      db.query("select public.save_build($1::jsonb)", [JSON.stringify(doc)]),
    ).rejects.toThrow();
  });
  it("unlisted records stay out of discovery but exact approved links resolve", async () => {
    await identity(admin, "authenticated", ["admin"]);
    await db.exec(
      "update public.builds set visibility='unlisted',moderation='approved' where id='public-build'",
    );
    await identity("", "anon");
    expect(
      (await db.query("select id from public.builds where id='public-build'"))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query<{ b: unknown }>(
          "select public.get_build('public-build') as b",
        )
      ).rows[0].b,
    ).not.toBeNull();
  });
  it("PostgreSQL full-text search observes publication and privacy policies", async () => {
    await db.exec("reset role");
    const migration = readFileSync(
      "supabase/migrations/202609240002_search.sql",
      "utf8",
    );
    await db.exec(
      migration.slice(
        migration.indexOf("create or replace view"),
        migration.indexOf("-- Server-only"),
      ),
    );
    await db.exec(
      "grant select on public.search_documents to anon,authenticated",
    );
    await identity("", "anon");
    const rows = await db.query<{ result: { name: string } }>(
      "select public.search_catalogue('support',null,40) as result",
    );
    expect(rows.rows.length).toBeGreaterThan(0);
    expect(rows.rows.some((r) => r.result.name === "Private draft")).toBe(
      false,
    );
  });
  it('attributed remix saves as a separate graph without source ID collisions', async () => {
    await identity(owner);
    const result = await db.query<{b: Build}>("select public.get_build('ai-dental-receptionist') as b");
    const draft = remixBuild(result.rows[0].b, owner, 'alex-chen', 'Alex Chen');
    draft.provenance = 'creator supplied';
    await db.query('select public.save_build($1::jsonb)', [JSON.stringify(draft)]);
    const saved = await db.query<{b: Build}>('select public.get_build($1) as b', [draft.slug]);
    expect(saved.rows[0].b.forkedFromBuildId).toBe(result.rows[0].b.id);
    expect(saved.rows[0].b.sources[0].id).not.toBe(result.rows[0].b.sources[0].id);
    expect(saved.rows[0].b.publication).toBe('draft');
  });

});
