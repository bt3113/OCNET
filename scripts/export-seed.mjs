import { seed } from "../src/data/seed.ts";
import { writeFileSync } from "node:fs";
const tables = [
  "categories",
  "providers",
  "capabilities",
  "products",
  "use_cases",
  "solution_stacks",
  "integrators",
  "consultants",
  "articles",
  "updates",
];
let sql =
  "-- Clearly labelled sample catalogue. No fictional ratings or deployment claims.\n";
for (const table of tables)
  for (const record of seed[table] ?? []) {
    sql += `insert into public.${table}(id,data,published,provenance) values ('${record.id.replaceAll("'", "''")}','${JSON.stringify(record).replaceAll("'", "''")}'::jsonb,true,'demo') on conflict(id) do update set data=excluded.data;\n`;
  }
writeFileSync("supabase/seed.sql", sql);
