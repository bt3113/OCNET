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
// Optional Build examples require three real, explicitly supplied Auth user IDs.
// Run as the database administrator; never create seeded passwords or login identities.
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const owners = {
  "demo-user": "demo_owner_id",
  "demo-studio": "demo_studio_id",
  "demo-maya": "demo_maya_id",
};
let graph =
  "-- Optional fictional Build examples. Supply psql variables demo_owner_id, demo_studio_id, demo_maya_id (existing Auth UUIDs).\nBEGIN;\n";
graph += `insert into public.organizations(id,data,published,provenance) values('northstar','{"id":"northstar","name":"Northstar Studio","provenance":"demo"}',true,'demo') on conflict(id) do nothing;\n`;
for (const c of seed.creator_profiles ?? []) {
  const keys = Object.keys(c),
    values = keys.map((k) =>
      k === "ownerId"
        ? `:'${owners[c.ownerId]}'::uuid`
        : Array.isArray(c[k])
          ? `ARRAY[${c[k].map(quote).join(",")}]::text[]`
          : typeof c[k] === "boolean"
            ? String(c[k])
            : quote(c[k]),
    );
  graph += `insert into public.creator_profiles(${keys.map((k) => '"' + k + '"').join(",")}) values(${values.join(",")}) on conflict(id) do nothing;\n`;
}
for (const b of seed.builds ?? [])
  graph += `select set_config('request.jwt.claims',jsonb_build_object('sub', :'${owners[b.ownerId]}','role','service_role')::text,true);\nselect public.save_build(${quote(JSON.stringify(b))}::jsonb || jsonb_build_object('ownerId', :'${owners[b.ownerId]}'));\n`;
for (const o of seed.build_offers ?? []) {
  const keys = Object.keys(o),
    values = keys.map((k) =>
      k === "ownerId"
        ? `:'${owners[o.ownerId]}'::uuid`
        : o[k] === null
          ? "null"
          : typeof o[k] === "boolean" || typeof o[k] === "number"
            ? String(o[k])
            : quote(o[k]),
    );
  graph += `insert into public.build_offers(${keys.map((k) => '"' + k + '"').join(",")}) values(${values.join(",")}) on conflict(id) do nothing;\n`;
}
graph += "COMMIT;\n";
writeFileSync("supabase/seed-builds.sql", graph);
