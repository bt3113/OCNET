# Design system

The attached Oracnet reference sets the composition: fixed warm sidebar; strong global search; off-white canvas; rounded ivory cards; sand feature area; compact provider directory; category and use-case cards; editorial and footer bands. The supplied reference is not published in the repository.

Tokens live in `src/styles.css` (`:root` and Tailwind `@theme`). Google Sans Flex is used throughout the interface and feature headlines, as requested. Replace `--font-sans`/`--font-display` and font-face declarations to change typography. Canvas `#f8f7f4`, ink `#19191d`, soft border `#eceae5`, sand `#fbe9b9`, violet/peach/pink category colors. Cards use 16px radii with small soft shadows; buttons 10px. Primary controls have 44px minimum height. Spacing centers on 12/16/18/24/30px intervals.

Desktop navigation is 236px wide (214px on small desktop, 255px wide desktop). At 1100px the home provider rail moves into two columns. At 800px sidebar becomes a mobile dialog and bottom navigation. At 600px discovery and detail cards become single-column; category cards remain two-column; data tables become labelled record cards. Filters move into a dialog. Mobile navigation always provides explore/search, saved, compare, projects, and menu/account.

Shared primitives: ButtonLink, cards, badges, logos, breadcrumbs, tabs, pagination, skeletons, empty/error states, accessible Radix dialogs, search palette, comparison tray, galleries, table, contact modal, project wizard, stack visualizer, notifications, and messaging. Restrained hover lift, dialog transitions, and tray motion respect reduced-motion settings.

Artwork is original SVG illustration, not vendor screenshots. Demo logos use lettermarks. Evidence labels are part of the interface, not decorative claims.

## Build surfaces

Build cards add original warm UI concept covers, outcome-first titles, creator bylines and linked technology chips. Featured cards use a wider composition; discovery cards retain the ivory surface and thin border. The homepage preserves the fixed sidebar, strong search, warm sand palette and right-hand discovery rail. Creator profiles use restrained initial avatars; no invented review stars appear.

The architecture explorer uses a bounded scroll/pan canvas on desktop and an ordered list on mobile. Node detail cards expose role, evidence and alternatives. The publisher uses a compact step rail that wraps on smaller screens. Collections, offers and moderation reuse shared dialogs, buttons, tables and empty/error states. Reduced motion applies across both releases. New SVG previews are original illustrative UI, not screenshots of vendor products.

## Implementation intelligence surfaces

Same tokens and primitives; no second design system. Additions: evidence, freshness, rights and relationship badges (icon + text, never colour alone; demo-derived levels use a dashed border and “· demo”); an ILLUSTRATIVE notice; a `Drawer` primitive (Radix dialog as a right sheet on desktop, bottom sheet ≤700px) for provenance, claims, explanations, traces and mobile filters; requirement cards with INFERRED chips and Hard/Soft/Info segmented controls; candidate cards with component selectors, raw objective grids and supported trade-off labels; an SVG architecture map (solid = observed implementation, dashed = reference Blueprint slot, dashed amber edges = trust boundary) with zoom/pan/fit buttons, keyboard selection and a list view; comparison and trade-off tables that become labelled cards on mobile; PUBLIC / PRIVATE field tags in the contributor wizard. Motion is limited to drawers; `prefers-reduced-motion` disables it.

## Information architecture (progressive disclosure)

Patterns follow common solution-library and case-study layouts: summary first, detail on demand.

- **Navigation:** six primary destinations (Home, Find a solution, Implementations, Blueprints, Technologies, Implementers). “Browse more” and “Your workspace” are collapsible groups that open automatically when they contain the current page.
- **Demo labelling:** one persistent demo strip at the top of every page, plus a single “Illustrative” status chip per card. Cards no longer repeat several demo badges.
- **Cards:** context eyebrow (business · locations · region), title, summary, up to two observed results, then a footer with evidence status and cost. Freshness appears only when it is not current.
- **Detail pages:** hero with key facts and a single action panel, headline results (implementation records), then tabs (`TabbedSections` in `ui.tsx`) following the WAI-ARIA tabs pattern with arrow/Home/End keys. The active tab is stored as `?tab=`; legacy `#request`/`#evidence` anchors map to their tab.
  - Implementation record: Overview · Architecture · Results & cost · Evidence · Similar & next steps
  - Blueprint: Architecture (with version history and manifests) · Setup · Rights & trust · Related records
  - Use case: Implementations · Blueprints · What it needs · Technologies & implementers
- **Filters:** five primary filters are always visible; the rest sit under “More filters”, which opens automatically when one of them is active.
- **Solution Compiler:** a three-step stepper. After compiling, the requirement form collapses into a summary with “Edit requirement”; results lead with the feasible approaches, then trade-offs, exclusions and comparable businesses. The engine’s step log sits under “How this result was computed”.

Styles for these patterns live in `src/structure.css`.
