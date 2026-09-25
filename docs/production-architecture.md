# Production architecture

GitHub Pages hosts a public demo only: static files, browser-local data, no secrets, no private evidence, no payments. Production needs a server boundary.

## Target

| Concern | Production component |
| --- | --- |
| UI | The existing React/Vite SPA (no framework migration) |
| Hosting | A host with edge rewrites, response headers and edge functions — recommended: Cloudflare Pages + a small Worker, or Vercel/Netlify with edge middleware |
| Dynamic metadata | Edge function renders title/description/OG/JSON-LD for `/implementations/:slug`, `/blueprints/:slug`, `/builds/:slug`, `/use-cases/:slug`, `/technologies/:slug`, `/implementers/:slug` from the security-invoker `search_documents` view (public rows only), and returns real 404s |
| Auth, DB, Storage | Supabase Auth (PKCE), Postgres with RLS (migrations `202609230001`–`202609250004`), private `implementation-evidence` bucket |
| Privileged operations | Supabase Edge Functions: `attestation`, `evidence`, `import-public`; future `embeddings`, payment webhooks |
| Background jobs | Scheduled function: expire attestations, purge `attestation_contacts` after 30 days, recompute freshness and fingerprints, embed changed public documents |
| Search | Postgres FTS (`search_catalogue`) for browsers; server-only RRF hybrid search (`hybrid_search_rrf`) with embeddings generated server-side |
| Security headers | CSP (self + Supabase + fonts), HSTS, frame-ancestors none, referrer policy, permissions policy |
| Observability | Error reporting without PII, RUM for LCP/INP/CLS, function logs without tokens or emails |

## Secrets

Only the Supabase URL and anon/publishable key are `VITE_*`. Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SAFE_FETCH_GATEWAY_*`, future Stripe keys) exist only in Edge Function secret storage. `APP_ORIGIN` and `APP_BASE_PATH` configure CORS and links.

## Payments (future, not implemented)

No card data, escrow or checkout exists. A future Stripe Connect integration would add: connected-account onboarding (KYC handled by Stripe), a `PaymentProvider` server interface (`createOnboardingLink`, `createPaymentIntent(projectId, amount, platformFee)`, `refund`, webhook handler for `payment_intent.*`, `account.updated`, `charge.dispute.*`), and `payments`/`payouts` tables written only by webhooks. Oracnet would not describe itself as an escrow service unless the regulatory and payment architecture supports that claim.

## Privacy and retention (proposed; requires legal review)

| Category | Retention |
| --- | --- |
| Public records, Blueprints | Until removed or archived by owner/moderation |
| Private evidence files | Duration of review + 12 months, or owner deletion; deleted from storage with the artifact |
| Attestation invitations | Token hash kept with the attestation; contact email deleted on submission or after 30 days |
| Messages | Lifetime of the thread + 24 months |
| Audit events | 6 years, pseudonymous actor id, field names not values (state fields excepted) |
| Analytics | Event type, entity id and day only; 25 months |
| Deleted accounts | Personal rows cascade; audit keeps pseudonymous id |

Sensitive evidence is never sent to external AI providers. If AI processing is introduced it needs a processing policy, minimization/redaction, provider and purpose logging, retention limits and consent where required. Nothing in this repository constitutes completed legal, GDPR or compliance review.

## Performance targets

LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile of field data. Lab runs in `docs/qa.md` are samples, not field results. Route-level code splitting, a lazily loaded architecture map, self-hosted fonts with `font-display: swap` and cached queries are in place.
