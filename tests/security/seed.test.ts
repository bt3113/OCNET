// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { seed } from "../../src/data/seed";
import { migratedDatabase } from "./pglite";

/**
 * The generated catalogue seed (supabase/seed.sql) must apply cleanly on top of every
 * migration, so a fresh Supabase project gets the Use Case taxonomy, aliases, redirects
 * and vendor sources the demo shows — and anonymous visitors see only public rows.
 */
let db: PGlite;

beforeAll(async () => {
  ({ db } = await migratedDatabase());
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
