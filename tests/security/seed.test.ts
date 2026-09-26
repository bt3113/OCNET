// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { seed } from "../../src/data/seed";

/**
 * The generated catalogue seed (supabase/seed.sql) must apply cleanly on top of every
 * migration, so a fresh Supabase project gets the Use Case taxonomy, aliases, redirects
 * and vendor sources the demo shows — and anonymous visitors see only public rows.
 */
let db: PGlite;
const migration = (name: string) => readFileSync(`supabase/migrations/${name}`, "utf8");

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;create publication supabase_realtime;`,
  );
  for (const name of ["202609230001_marketplace.sql", "202609240001_build_graph.sql"]) await db.exec(migration(name));
  const search = migration("202609240002_search.sql");
  await db.exec(search.slice(search.indexOf("create or replace view"), search.indexOf("-- Server-only")));
  for (const name of ["202609250001_implementation_intelligence.sql", "202609250002_intelligence_search.sql", "202609250003_intelligence_hardening.sql", "202609260001_marketplace_taxonomy.sql"])
    await db.exec(migration(name));
  await db.exec(`grant usage on schema public,auth,storage to anon,authenticated,service_role;
     grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;
     reset role; select set_config('request.jwt.claims','{}',false);`);
  // Applied as the database administrator, exactly as docs/deployment.md describes.
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
}, 60000);
afterAll(async () => {
  await db.close();
});

const count = async (sql: string) => Number((await db.query<{ n: number }>(sql)).rows[0].n);

describe("catalogue seed", () => {
  it("loads the full taxonomy, sources, aliases and redirects", async () => {
    expect(await count("select count(*) n from public.use_case_categories")).toBe(seed.use_case_categories!.length);
    expect(await count("select count(*) n from public.use_case_sources")).toBe(seed.use_case_sources!.length);
    expect(await count("select count(*) n from public.use_case_aliases")).toBe(seed.use_case_aliases!.length);
    expect(await count("select count(*) n from public.use_case_redirects")).toBe(seed.use_case_redirects!.length);
    expect(await count("select count(*) n from public.use_cases where status = 'approved' and category_id is not null and subcategory_id is not null")).toBe(
      seed.use_cases!.filter((useCase) => (useCase.status ?? "approved") === "approved").length,
    );
  });
  it("keeps vendor provenance on the xAI Use Cases and their sources", async () => {
    const vendorCases = seed.use_cases!.filter((useCase) => useCase.originType === "technology-vendor-sourced").length;
    expect(await count("select count(*) n from public.use_cases where origin_type = 'technology-vendor-sourced' and provenance = 'third-party sourced'")).toBe(vendorCases);
    expect(await count(`select count(*) n from public.use_case_sources where "sourceType" = 'technology-vendor' and "sourceEntityId" = 'xai' and "sourceUrl" like 'https://x.ai/%'`)).toBe(vendorCases);
  });
  it("is idempotent", async () => {
    await db.exec(readFileSync("supabase/seed.sql", "utf8"));
    expect(await count("select count(*) n from public.use_case_aliases")).toBe(seed.use_case_aliases!.length);
  });
  it("exposes public taxonomy rows to anonymous visitors", async () => {
    await db.exec(`set role anon; select set_config('request.jwt.claims','{"role":"anon"}',false);`);
    expect(await count("select count(*) n from public.use_case_categories")).toBe(seed.use_case_categories!.length);
    expect(await count("select count(*) n from public.use_case_sources where \"sourceEntityId\" = 'xai'")).toBeGreaterThan(0);
    await db.exec("reset role;");
  });
});
