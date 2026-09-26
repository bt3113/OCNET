import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * A PGlite database with Supabase's auth/storage shims and every migration applied in
 * order (pgvector-only parts skipped), as the security tests expect it.
 */
export const migration = (name: string) => readFileSync(`supabase/migrations/${name}`, "utf8");

export async function migratedDatabase() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;create publication supabase_realtime;`,
  );
  for (const name of ["202609230001_marketplace.sql", "202609240001_build_graph.sql"]) await db.exec(migration(name));
  const search = migration("202609240002_search.sql");
  await db.exec(search.slice(search.indexOf("create or replace view"), search.indexOf("-- Server-only")));
  for (const name of [
    "202609250001_implementation_intelligence.sql",
    "202609250002_intelligence_search.sql",
    "202609250003_intelligence_hardening.sql",
    "202609260001_marketplace_taxonomy.sql",
    "202609270001_marketplace_followups.sql",
  ])
    await db.exec(migration(name));
  await db.exec(`grant usage on schema public,auth,storage to anon,authenticated,service_role;
     grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;
     reset role; select set_config('request.jwt.claims','{}',false);`);
  const as = async (id: string, role = "authenticated", roles: string[] = []) =>
    db.exec(
      `reset role; set role ${role}; select set_config('request.jwt.claims','${JSON.stringify({ sub: id, role, app_metadata: { roles, role: roles.includes("admin") ? "admin" : undefined } })}',false);`,
    );
  const asOwner = () => db.exec(`reset role; select set_config('request.jwt.claims','{}',false);`);
  const rows = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows;
  return { db, as, asOwner, rows };
}
