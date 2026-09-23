# Architecture

## Boundaries

React Router resolves seven lazy page modules: Home, Discovery, Details, Workspace, Compare, Auth, and Content. Shared shell and controls live in `src/components`. TanStack Query owns server/cache state. `useRecords` subscribes to the selected repository; mutation helpers cancel stale reads and refresh cache after persistence. Forms use React Hook Form/Zod for project, account, contact, and generic edit validation. No raw user HTML is rendered.

`Repository` exposes typed `list`, `save`, `remove`, and `subscribe`. `DemoRepository` uses versioned local storage. `SupabaseRepository` dynamically loads only in connected mode and uses public credentials plus the authenticated session. It never silently falls back to demo when production configuration fails.

## Demo contract

Demo actions are local simulations. No provider is emailed, no payments are accepted, and no account password is stored. All seed records are marked demo. Real organization names appear only in explicitly labelled sample profiles with links to their official sites. Partner organizations and consultants are fictional. No ratings or deployment counts are invented.

## Supabase contract

Each domain table has `id`, `owner_id`, `data`, `published`, `provenance`, and timestamps. Typed JSON documents preserve the frontend contract; generated relationship columns and foreign keys cover core catalogue, project, review, and messaging associations. This is a pragmatic first schema, not a claim that arbitrary JSON replaces relational validation. Add field-level constraints and indexes as production query patterns become known.

Catalogue reads require publication or ownership. Workspace reads require ownership; thread membership is managed outside untrusted document payloads. Supplier and administrator permissions use trusted Auth app_metadata, never user_metadata or the demo persona switch. Publication and verification require moderation. Private storage is scoped by user-id path prefixes. Realtime uses Postgres Changes and existing SELECT RLS.

## Remaining production services

Provision the project and run migrations; establish organization membership, provider ownership, routing and invitations. Contact delivery intentionally returns 503 until recipient verification, rate limiting, spam handling, delivery consent and mail integration exist. Configure password recovery completion and session lifecycle UX before live authentication launch. Media storage buckets are prepared; the current demo uploader stores local image data and must be replaced by signed upload flows in connected production. Payments are outside this deployment.

The frontend is adaptable through the repository interface. These remaining service integrations do not require replacing the marketplace UI, but require production engineering and acceptance tests.
