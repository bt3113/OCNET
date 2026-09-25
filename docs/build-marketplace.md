# Build marketplace

A **Build** is a creator-published implementation blueprint. A procurement **Project** is a buyer's request for work. They remain separate entities; “Build something like this” can create a Project with the originating Build and stack references, or an attributed remix draft.

## Experience

- `/builds`, `/explore`: outcome search, technology/creator/use-case/industry/category and reuse/offer filters, sorting, pagination, preview, save and share.
- `/builds/:slug`: gallery, connected stack, architecture canvas (pan, zoom, fit, keyboard), mobile list, node details and exploratory alternatives, implementation notes, license, sources, offers, questions, updates and related builds.
- `/creators` and `/creators/:slug`: expertise discovery, technologies, availability, Builds, offers, biography and follows.
- `/collections` and `/collections/:slug`: private research collections, creation, rename, move, remove and save-to-collection.
- `/creator/*`: nine-step publishing wizard with autosave; Build editing, offers, profile, messages, analytics and preferences.
- `/provider/builds`, `/provider/claims`: derived technology usage and evidence-based claims.
- `/admin/builds`, `/admin/creators`, `/admin/offers`, `/admin/reports`, `/admin/claims`: moderation and audit.

All six seeded Builds, three creators, six offers and UI concept images are fictional demonstrations. They are not verified deployments, tool compatibility claims, customer endorsements or actual service pricing. Usage/co-occurrence counts derive from these labelled examples. No paid ranking is implemented.

## Publication and reuse

Details, one use case, a confirmed stack and a rights declaration are required. Detected dependencies cannot be published without human confirmation. Reuse requires an explicit blueprint license. A remix remaps stack/edge IDs, preserves source attribution/license and starts as a draft. It never copies source code or media. Published slugs are stable. Supabase edits revoke previous moderation; a moderator must approve discovery again. Verification is separate from publication.

Public approved Builds appear in discovery. Unlisted approved Builds require an exact slug lookup; private/draft records are owner/collaborator/admin only. Supabase RLS is authoritative. Demo personas merely explore browser-local state and are not authentication.

## Import and GitHub

Demo mode imports public GitHub metadata, README text and supported manifest dependencies through GitHub's tokenless API. Limits/errors permit manual completion. GitHub OAuth in connected mode uses Supabase PKCE with `read:user user:email`, not private repository scopes. Provider tokens are removed before Auth session persistence; no GitHub token enters localStorage. Auth state uses sessionStorage.

Deploy `supabase/functions/import-public` for connected import. It authenticates, uses a shared database request budget, restricts size/time/redirect count and fetches GitHub only from a fixed API origin. General URL metadata import **fails closed** until a secure outbound gateway is configured. The gateway contract accepts `url`, validated `allowedAddresses`, `redirect: manual`, `maxBytes`, and `timeoutMs`, pins the connection to those public addresses, rejects private/reserved IPv4/IPv6 destinations, and returns the original status/content-type/location. Set server-only `SAFE_FETCH_GATEWAY_URL`, `SAFE_FETCH_GATEWAY_KEY` and `APP_ORIGIN`. DNS resolution followed by ordinary fetch is insufficient against rebinding. Private-repository imports and repository writeback are deferred.

## Connected storage and search

Build graph tables are relational. `list_builds`, `get_build` and transactional `save_build` translate normalized rows to the frontend aggregate DTO. Core catalogue tables retain the earlier validated document adapter. Signed media URLs are short lived; upload paths are scoped to the authenticated UUID. Uploaded images support PNG/JPEG/WebP; arbitrary SVG/HTML uploads are rejected. YouTube/Vimeo embeds use an allowlist.

Demo search is deterministic local keyword matching across connected records. Supabase search calls `search_catalogue` and uses PostgreSQL full-text search. Vector storage and a server-only hybrid RPC are prepared with pgvector; an embedding provider, indexing worker and semantic-search Edge endpoint are **not active**. Public-document joins prevent hidden Builds from leaking through stale embeddings. No frontend model key exists.

## Offers and communication

Free guides, templates, source packages, starter kits, setup, customization, full implementation, support and consultation share typed offers. Free/fixed/from/monthly/yearly/quote pricing is supported. Demo offers show a preview; external offers clearly hand off; contact offers create a creator enquiry. Supabase's enquiry RPC selects thread membership server-side and rate-limits requests. No card forms, payouts, escrow, digital delivery entitlement or payment processing exist on Pages.

## Deployment acceptance

Apply migrations in order, then `seed.sql` for the labelled technology catalogue. `seed-builds.sql` is optional and must be run as an administrator with three existing test Auth UUIDs:

```sh
psql "$DATABASE_URL" -v demo_owner_id=UUID -v demo_studio_id=UUID -v demo_maya_id=UUID -f supabase/seed-builds.sql
```

It does not create accounts/passwords. Use an isolated staging database. Database credentials stay outside the browser and repository. Grant roles/memberships through trusted administration. Configure GitHub OAuth callback and allowed app redirects before enabling Auth. Test signed upload/read, Realtime and OAuth against the provisioned project; local PostgreSQL tests do not substitute for these external acceptance tests.

## Deliberately deferred

Production payment/entitlement services, private repository access, live provider verification, outbound email, full invitation lifecycle, semantic embeddings, general URL gateway operations, production legal review, SSR metadata for user-created entities and real-user performance monitoring need external services or production operations. Pages remains the complete browser-local demonstration.

## Relationship to implementation intelligence

Builds remain creator showcases. They are listed on technology pages as “creator projects, not deployment evidence”, never count toward implementation evidence in the Solution Compiler, and never become Implementation Records or Blueprints automatically.
