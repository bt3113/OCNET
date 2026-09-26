# Architecture

## Boundaries

React Router resolves seven lazy page modules: Home, Discovery, Details, Workspace, Compare, Auth, and Content. Shared shell and controls live in `src/components`. TanStack Query owns server/cache state. `useRecords` subscribes to the selected repository; mutation helpers cancel stale reads and refresh cache after persistence. Forms use React Hook Form/Zod for project, account, contact, and generic edit validation. No raw user HTML is rendered.

`Repository` exposes typed `list`, `save`, `remove`, and `subscribe`. `DemoRepository` uses versioned local storage. `SupabaseRepository` dynamically loads only in connected mode and uses public credentials plus the authenticated session. It never silently falls back to demo when production configuration fails.

## Demo contract

Demo actions are local simulations. No provider is emailed, no payments are accepted, and no account password is stored. All seed records are marked demo. Real organization names appear only in explicitly labelled sample profiles with links to their official sites. Partner organizations and consultants are fictional. No ratings or deployment counts are invented.

## Supabase contract

The initial catalogue and procurement tables have `id`, `owner_id`, `data`, `published`, `provenance`, and timestamps. Typed JSON documents preserve the frontend contract; generated relationship columns and foreign keys cover core catalogue, project, review, and messaging associations. This is a pragmatic first schema, not a claim that arbitrary JSON replaces relational validation. Add field-level constraints and indexes as production query patterns become known.

Catalogue reads require publication or ownership. Workspace reads require ownership; thread membership is managed outside untrusted document payloads. Supplier and administrator permissions use trusted Auth app_metadata, never user_metadata or the demo persona switch. Publication and verification require moderation. Private storage is scoped by user-id path prefixes. Realtime uses Postgres Changes and existing SELECT RLS.

## Remaining production services

Provision the project and run migrations; establish organization membership, provider ownership, routing and invitations. Contact delivery intentionally returns 503 until recipient verification, rate limiting, spam handling, delivery consent and mail integration exist. Configure password recovery completion and session lifecycle UX before live authentication launch. Connected media uses private, UUID-scoped storage uploads and signed reads; validate delivery and moderation on the provisioned project. Payments are outside this deployment.

The frontend is adaptable through the repository interface. These remaining service integrations do not require replacing the marketplace UI, but require production engineering and acceptance tests.

## Build graph extension

The Build release adds lazy discovery/detail, creator, collection, publisher and workspace modules. The new `build-model.ts` defines aggregate DTOs; `build-domain.ts` contains publication, remix and discovery rules. The repository hides `save_build` transactions and `list_builds` aggregation. Build relations, membership, offers, collections and moderation use normalized tables, not the initial catalogue JSON pattern. Procurement Projects remain backward compatible and gain optional origin references.

Auth identities can hold buyer, creator, provider, integrator, consultant and admin roles concurrently. Database decisions accept trusted app_metadata or server-managed user_roles. UI role switching never grants production privileges. See [Build marketplace](build-marketplace.md) for search, signed media, import, messaging and deployment contracts. The old provider-contact email adapter remains deliberately disabled; new Build enquiries use a server-managed in-app thread RPC.

## Implementation intelligence extension

Domain logic is pure TypeScript in `src/data` (similarity, fingerprint, metrics, evidence, freshness, rights, sanitization, attestation, provenance, manifests, requirement parsing, compiler, contribution, review) and is unit-tested without React. Pages load the graph through `useIntelligence()` (`src/data/intelligence-hooks.ts`), which wraps the same `useRecords` repository queries. The architecture map is a lazily loaded SVG component with a list equivalent. Intelligence tables use their own browser-storage namespace (`oracnet:intel-v3:`) so seed revisions never mix with older demo data.

Connected mode reads/writes the same normalized tables through the repository; privileged steps (attestation, evidence upload/download) go through Edge Functions; audit rows are written only by database triggers. Failed connected calls surface errors — there is no fallback to demo data. See [implementation intelligence](implementation-intelligence.md) and [production architecture](production-architecture.md).
