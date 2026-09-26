# Use Case taxonomy

A controlled vocabulary of work. Buyers browse it; Solution Providers attach Builds to it; moderators keep it clean.

## Shape

Two levels of grouping, then the Use Case itself:

| Category | Subcategories (ids) |
| --- | --- |
| Customer Service | Inbound Enquiries (`cs-inbound-enquiries`), Bookings & Reservations (`cs-bookings`), Support (`cs-support`), Voice (`cs-voice`) |
| Sales | Lead Management (`sales-lead-management`) |
| Finance | Accounts Receivable (`fin-ar`), Accounts Payable (`fin-ap`) |
| Software Development | Coding & Change Management (`sd-coding`), Debugging & Reliability (`sd-debugging`), Documentation (`sd-documentation`) |
| Marketing | Content Creation (`mk-content`), Campaigns (`mk-campaigns`), Visual Content (`mk-visual`), Localization (`mk-localization`) |
| Operations | Document Processing (`ops-documents`), Internal Assistants & Automation (`ops-internal-tools`), Quality (`ops-quality`), Warehouse & Logistics (`ops-warehouse`), Facilities (`ops-facilities`) |
| Commerce | Online Store (`com-online-store`) |
| Data & Analytics | Reporting (`an-reporting`) |

Source: `src/data/taxonomy-seed.ts` (editorial, provenance `inferred`). Connected mode: `use_case_categories`.

## Writing a Use Case title

A Use Case is a piece of work, not an area or a product. `titleGuidance()` in `src/data/use-case-text.ts` applies these rules to proposals.

Blocking (the proposal cannot be submitted):

- fewer than 8 or more than 120 characters;
- emoji;
- a bare area such as “Finance”, “Marketing” or “AI”.

Advice (shown; moderation decides):

- longer than 80 characters;
- marketing claims (“best”, “revolutionary”, “10x”);
- exclamation marks or all capitals;
- the provider's own company name;
- repeated keywords.

A tidied suggestion (sentence case, punctuation noise removed) is offered but never applied silently.

Good: “Chase overdue invoices”, “Review supplier invoices before approval”, “Handle customer inquiries with voice agents”.
Not a Use Case: “Software development” (an area, so a category), “Grok for business” (a product), “AI automation” (too broad).

## Aliases

| Type | Shown? | Searchable? | Typical source |
| --- | --- | --- | --- |
| `preferred` | Yes (the title) | Yes | Editorial |
| `alternate` | Yes, as “also called” | Yes | Former titles, merged Use Cases |
| `hidden-search` | No | Yes | Common phrasing and jargon (“dunning”, “invoice chasing”) |
| `original-source` | No | Yes | A provider's proposal wording or a vendor's original wording |

Hidden and original-source labels match in search and in the publisher's suggestions, but the UI shows the matched Use Case title, never the hidden label.

## Suggestions (deterministic)

`suggestUseCases(text, {useCases, aliases})` scores each approved Use Case against the text:

1. exact label match (100), then prefix match (80);
2. token overlap on stemmed content words: 30 + 40 × coverage + 3 per shared token;
3. description overlap as a tie-break, or as a weak match (≥ 2 shared words) when nothing else matches;
4. aliases score slightly below titles; results under 30 are dropped.

No model is involved and the provider always chooses. The same function powers the publisher's “Suggested from your Build's description”, the combobox, duplicate warnings on proposals, and the moderator's “Possible existing matches”.

## Lifecycle

```
            ┌──────── map ─────────► existing Use Case (+ original-source alias)
proposal ───┼──── edit + approve ──► new Use Case (approved) + source + alias
 (pending)  └────── reject ────────► Build keeps its other Use Cases

approved ── merge ──► merged (mergedIntoId) + redirect + alternate alias
approved ── archive ► archived (hidden from discovery and the publisher)
```

- **States:** `approved`, `pending`, `merged`, `archived`, `rejected`. Only `approved` is public (`use_case_is_public()`; `published ⇒ approved` check constraint).
- **Mapping** links the Build to the chosen Use Case and keeps the provider's wording as an `original-source` alias.
- **Approval** creates the Use Case under the moderator's title and definition, records a `solution-provider` source with the original wording, and links the Build.
- **Merging** moves Build links (duplicates collapse, the primary stays first), sources and aliases; the old title becomes an `alternate` alias; the old slug redirects via `use_case_redirects`. Nothing is deleted.
- **Redirects** also cover retired broad areas (to a category page) and the old `/builds/xai-*` pages (to the matching Use Case).

In connected mode these run through admin-only `security definer` functions (`map_use_case_proposal`, `approve_use_case_proposal`, `reject_use_case_proposal`, `merge_use_cases`) that write `audit_events`. Direct writes to taxonomy tables are admin-only under RLS; providers can only insert or withdraw their own pending proposal for a Build they own.
