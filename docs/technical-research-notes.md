# Technical research notes

Only decisions that changed the implementation are recorded.

| Topic | Decision | Source |
| --- | --- | --- |
| CycloneDX | Emit **1.7** (Oct 2025; backward compatible with 1.4–1.6). SaaS products are `services` with `data` flows; dependencies from connections | [CycloneDX 1.7 release](https://cyclonedx.org/news/cyclonedx-v1.7-released/), [specification overview](https://cyclonedx.org/specification/overview/) |
| SPDX | Emit **2.3** JSON for broad tooling support; SaaS licences `NOASSERTION`; Oracnet rights as `LicenseRef-` with extracted text. SPDX 3.x can be added as another adapter | [SPDX 2.3 spec](https://spdx.github.io/spdx-spec/v2.3/) |
| Verifiable Credentials | Map attestations to **VC Data Model 2.0** (Recommendation, 15 May 2025): v2 context, `validFrom`/`validUntil`; V1 output unsigned | [VC DM 2.0](https://www.w3.org/TR/vc-data-model-2.0/) |
| W3C PROV | Relational model stays canonical; PROV-JSON export for entities, activities, agents and core relations | [PROV-O](https://www.w3.org/TR/prov-o/), [PROV-JSON](https://www.w3.org/submissions/prov-json/) |
| Supabase RLS | Policies use row columns (not re-selecting the row by id) so INSERT … RETURNING works; privileged transitions in triggers; `security definer` helpers with fixed `search_path` | [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) |
| Supabase Storage | Private bucket, server-issued signed upload URLs and 60-second signed download URLs with download disposition; server-chosen object names | [Storage access control](https://supabase.com/docs/guides/storage/security/access-control) |
| Hybrid search | Reciprocal Rank Fusion (k = 60) over FTS and pgvector rankings instead of a fixed weighted sum; server-only | [Supabase hybrid search](https://supabase.com/docs/guides/ai/hybrid-search) |
| WCAG 2.2 | Target-size, focus visibility, non-drag alternatives (architecture map buttons/keyboard), text equivalents for graphs and metrics; axe checks with `wcag22aa` tags | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |
| Graph library | Custom accessible SVG map instead of `@xyflow/react`: the graphs are small DAGs, and keyboard/list equivalents were simpler without a new dependency | — |
| Solver | No OR-Tools service: enumeration stays within tens of combinations per Blueprint | — |

The test container ships a newer Playwright than its preinstalled browser; local E2E runs set `CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (CI installs its own browser).
