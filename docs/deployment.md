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
