# Data model

The model follows business outcome → use case → required capability → solution stack → technology/product → provider → implementation partner → evidence.

| Area | Types/tables | Relationships |
| --- | --- | --- |
| Identity | users, organizations | Auth UUID owner; trusted app_metadata role |
| Supply | providers, products, product_media | product → provider; media → product |
| Discovery | categories, capabilities, use_cases, use_case_capabilities | use case → category; required capabilities join |
| Architecture | solution_stacks, stack_items | stack → use case; item → capability/product; alternative IDs |
| Expertise | integrators, consultants | provider-style profile, specialties and service list |
| Evidence | reviews, verification_records | review → product/user; verification → organization |
| Editorial | updates, articles | slug, body, date, provenance |
| Procurement | projects, proposals, leads | proposal → project/provider; lead → provider |
| Personal | saved_items, comparisons, settings | private owner; saved entity; comparison product IDs |
| Messaging | message_threads, thread_members, messages, notifications | authorized thread membership; message → thread |
| Media | media_assets, product_media | original images, videos, document metadata |
| Ecosystem | tags, integrations, compatibility | product-to-product relationship and evidence |
| Administration | team | private demo membership record; real membership is a server-managed concern |

Provenance: verified, vendor supplied, third-party sourced, community supplied, demo, unverified. Published visibility and verification are distinct. No provenance state implies a numerical rating. The frontend uses stable text IDs and slugs; SQL adds generated relational columns for referential integrity.

`src/data/model.ts` is the TypeScript source. `src/data/seed.ts` is the demo catalogue. `scripts/export-seed.mjs` generates public SQL seeds; private demo workspace records are intentionally not seeded to a live database with fake Auth users. `supabase/migrations` owns DB constraints and policies.
