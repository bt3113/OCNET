# Deployment

## GitHub Pages prototype

Repository: `bt3113/OCNET`. Base URL: `https://bt3113.github.io/OCNET/`.

The Pages workflow runs on main push or manual dispatch. It installs locked dependencies, runs lint/strict TypeScript/unit tests, installs Chromium, runs browser tests, builds, uploads the dist artifact, and deploys with Pages OIDC. The `github-pages` environment scopes deployment authorization. Concurrency prevents overlapping deployments.

Enable GitHub Actions as the Pages source in repository Settings → Pages. The connector used for implementation may not have administration permissions to change this setting. If deployment reports the site is not enabled, enable it and rerun the workflow. No frontend secret is needed for the demo.

Vite base and BrowserRouter basename are `/OCNET/`. `scripts/postbuild.mjs` generates static entry directories for fixed routes. Unknown nested entity paths fall through `404.html`, which redirects to `/OCNET/?route=...`; the bootstrap restores the original path/query/hash with history.replaceState before Router loads. This preserves direct links and refresh without hash routes. Entity URLs can still produce an initial 404 HTTP response on Pages; use server rewrites/prerendering on a production host for SEO status correctness.

## Supabase

1. Create a Supabase project and apply the migration and seed SQL as an administrative DB role.
2. Configure Auth site URL/allowed redirects for the actual host. Configure outbound mail.
3. Set trusted app_metadata roles server-side. Do not allow users to self-promote.
4. Configure provider organization ownership and server-managed thread memberships.
5. Set build-time public URL/anon key and `VITE_DATA_MODE=supabase`.
6. Test isolation with two unrelated buyers, provider, and administrator before enabling real data.

## Production host

Use a host with request headers, server functions, route rewrites, structured observability, and server-rendered entity metadata. Add a strict CSP compatible with required media, secure cookies/session policy, signed storage, spam prevention, delivery services, backups, retention, and performance monitoring. Never add live payments or sensitive financial collection to the Pages prototype.

## Build release

Apply both `202609240001_build_graph.sql` and `202609240002_search.sql` after the original migration. Ensure pgvector is installed in the public schema expected by the search migration. Re-run `seed.sql`; use optional `seed-builds.sql` with explicitly selected staging Auth UUIDs. Deploy `import-public` with server-side environment configuration described in [Build marketplace](build-marketplace.md). Enable GitHub in Supabase Auth and configure the Supabase callback in the GitHub OAuth application; allow the deployed `/creator` redirect.

Pages always builds demo mode. No Supabase credential, GitHub token, embedding key or gateway secret is required for this deployment. New seeded Build/creator URLs receive static metadata; dynamically published demo records exist only in that browser and use the SPA fallback.

## Implementation intelligence release

Apply `202609250001_implementation_intelligence.sql`, `202609250002_intelligence_search.sql`, `202609250003_intelligence_hardening.sql` and (with pgvector) `202609250004_hybrid_search_rrf.sql` in order. Migration 0003 drops the legacy pseudo-score columns from `solution_candidates` (derived, reproducible data only).

Deploy Edge Functions `attestation` and `evidence` with secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_ORIGIN`, `APP_BASE_PATH` (e.g. `/OCNET`), and for invitations `RESEND_API_KEY` + `EMAIL_FROM`. Without the email secrets, invitation creation fails closed with 503 and creates nothing. Schedule a job to purge `attestation_contacts` past `deleteAfter`.

The Pages build stays demo-only. `postbuild.mjs` prerenders metadata only for published, approved, public records and Blueprints and adds implementer profiles; drafts never reach the sitemap.
