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

## Relational Build graph

`creator_profiles` owns identity presentation. `builds` references an Auth owner, creator, optional organization, category and optional parent Build. `build_stack_items` references products/capabilities; `build_connections` has composite foreign keys enforcing both nodes belong to the same Build. `build_use_cases`, `build_capabilities`, `build_sources` and `build_media` complete the aggregate. Read DTO arrays are assembled by SQL; writes replace child sets atomically.

`build_offers`, `build_comments`, `build_updates`, `build_forks`, `creator_follows`, `collections`, `collection_items`, `build_comparisons` and `marketplace_events` model interaction. `user_roles`, `organization_memberships` and `build_collaborators` define trusted authorization. `reports`, `provider_claims` and immutable `audit_events` support review. `import_budgets` is a server-managed rate-limit counter. `search_embeddings` is server-only, with no browser RLS policies. Each exposed new table has RLS enabled.

A Build is never stored in `projects`: that existing entity is a procurement brief. It can reference `sourceBuildId` and `sourceStackProductIds` without copying ownership. Provenance, publication, moderation, verification, visibility, source availability and reuse permission are separate states.
