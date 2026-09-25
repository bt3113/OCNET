# Security and threat model

## Assets and trust boundaries

Buyer briefs/messages, provider listings/media, Auth sessions, verification decisions, and moderation controls require different trust levels. Browser input is untrusted. Local demo role switching is convenience only. Supabase policies and trusted server claims are production authorization boundaries.

| Threat | Control | Remaining production work |
| --- | --- | --- |
| Cross-user data access | owner-based RLS, membership checks, private storage | Live multi-user policy tests and organization membership integration |
| Privilege escalation | app_metadata roles, no frontend service key, moderation guard trigger | Admin provisioning and audited role-change service |
| False evidence | explicit demo labels, no invented ratings, pending moderation | Reviewer processes, evidence retention, dispute handling |
| XSS | React text escaping, no dangerouslySetInnerHTML, no user HTML | CSP/security headers on production host |
| Malicious uploads | MIME/size limits; image-only demo uploads; private storage | Content scanning, EXIF stripping, verified media publishing |
| Spam/unsolicited contact | Demo delivery is local; production endpoint fails closed | Rate limits, recipient verification, anti-abuse, consent |
| Secret exposure | ignored .env; public anon key only | Secret scanning and production rotation processes |
| Data loss | demo export/reset; errors on invalid stored data | Managed backups, retention, restore testing |
| Dependency vulnerabilities | lockfile and npm audit | Continuous updates and automated advisory monitoring |

Sensitive information should not be entered into the browser demo. Auth passwords are not persisted in demo mode. External links use noopener/noreferrer. Errors do not print tokens. SQL functions set their search_path explicitly. Storage uses private buckets and user-id prefixes. Messages are append-only for non-admin users. Admin/supplier role checks also occur in the UI but are not relied on for security.

The SQL migration is prepared source; local frontend tests do not prove deployed RLS. It must be applied and tested with real Supabase identities. OWASP ASVS principles guide the design; this is not a certification or a completed security audit.

Official references: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/storage/security/access-control.

## Build release threats and controls

- Cross-account access: relational RLS covers ownership, collaborator and organization roles. PostgreSQL tests exercise anonymous, owner, unrelated and admin users.
- Self-promotion: trusted role storage; triggers block owner/creator changes, self-verification, feature status and unreviewed publication changes. Child graph edits invalidate approval. Audit events are trigger-written and immutable to clients.
- Attribution theft: server checks parent remix permission, retained license, attribution and commercial-use limits. Published slugs and fork parent are immutable.
- Private graph leakage: public discovery filters publication/visibility/moderation; unlisted lookup requires exact slug. Search uses a security-invoker public document view. Embeddings/hybrid access is service-only.
- Imported malicious content: imported HTML/README are treated as text, never rendered HTML. Active URL schemes and embedded credentials are rejected. The Edge importer has authenticated budgets and bounded responses. General URL fetching requires a DNS-pinning gateway and otherwise fails closed.
- GitHub tokens: public demo import is tokenless. Connected OAuth uses PKCE with minimal identity scopes; provider tokens are stripped from persistence. No private repo scope is requested.
- Marketplace fraud: offers and questions enter moderation; reports/claims have private access. No live transaction or claim of escrow/security verification is implied.

Provisioned Supabase, OAuth, storage signing, gateway behavior and Realtime still require staging acceptance. The checked-in PostgreSQL tests verify migrations/RLS/RPCs locally; they do not claim a deployed backend. The optional vector migration requires pgvector in the public schema; provision/reconcile extension placement before applying to an existing database.

## Implementation intelligence controls

Audited against migration `202609250001` and fixed in `202609250003` (all covered by `tests/security/intelligence-rls.test.ts` on PostgreSQL):

- **Claim IDOR / forgery** — claims require an editable subject; retargeting is rejected by row-based `WITH CHECK`; only accepted, public claims on public subjects are readable anonymously; material edits reset status and evidence level.
- **Self-verification** — triggers force `pending`/`creator-reported` on insert, keep trusted fields (verification, freshness, provenance, demo) on update, and send approved records/Blueprints back to moderation after material or child edits. Owners can never approve.
- **Attestation forgery** — browsers cannot insert or complete attestations; `create_attestation`/`apply_attestation` are executable only by the service role, check ownership and claim scope, lock the row, enforce single use and expiry, and delete the contact email. Tokens are stored as SHA-256 hashes; lookups return a uniform error.
- **Evidence** — artifacts can only point into the owner’s storage prefix and use allowed MIME types; attaching evidence requires owning both the artifact and the claim subject; uploads use server-chosen names via signed URLs, content is sniffed (magic bytes, UTF-8 without active markup) and mismatches are deleted; downloads are 60-second signed URLs for the owner or reviewers.
- **History** — audit, review and verification events are append-only, including for the service role; audit rows record changed field names, not values (except state fields).
- **Cross-tenant references** — runs must reference the caller’s own requirement profile; derived Blueprints must come from the owner’s record; `derivedBlueprintIds` must be the owner’s Blueprints.
- **Private data in search/SEO** — search views, sitemap and prerendered metadata include only published, approved, public rows; private customer names are stored in a separate owner/admin table and never in public fields.
- **Sanitization** — Blueprint derivation requires a confirmed checklist and no blocking scanner findings; scanning is assistance, not a guarantee.

Accepted residual risks: helper functions such as `implementation_is_public` are executable by `anon` (needed by policies) and reveal only a boolean about public status; relationship submissions accept external URLs that are never fetched server-side and are rendered with `rel="noopener noreferrer nofollow"`; admin deletion of a claim with reviews is blocked by the append-only history (revoke instead). The RRF hybrid function is SQL-reviewed but not executed locally (no pgvector in PGlite). Edge Functions are type-checked only by Deno at deploy time and have not run against a provisioned project.
