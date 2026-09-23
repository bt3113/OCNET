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
