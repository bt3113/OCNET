# Design system

The attached Oracnet reference sets the composition: fixed warm sidebar; strong global search; off-white canvas; rounded ivory cards; sand feature area; compact provider directory; category and use-case cards; editorial and footer bands. The supplied reference is not published in the repository.

Tokens live in `src/styles.css` (`:root` and Tailwind `@theme`). Google Sans Flex is used throughout the interface and feature headlines, as requested. Replace `--font-sans`/`--font-display` and font-face declarations to change typography. Canvas `#f8f7f4`, ink `#19191d`, soft border `#eceae5`, sand `#fbe9b9`, violet/peach/pink category colors. Cards use 16px radii with small soft shadows; buttons 10px. Primary controls have 44px minimum height. Spacing centers on 12/16/18/24/30px intervals.

Desktop navigation is 236px wide (214px on small desktop, 255px wide desktop). At 1100px the home provider rail moves into two columns. At 800px sidebar becomes a mobile dialog and bottom navigation. At 600px discovery and detail cards become single-column; category cards remain two-column; data tables become labelled record cards. Filters move into a dialog. Mobile navigation always provides explore/search, saved, compare, projects, and menu/account.

Shared primitives: ButtonLink, cards, badges, logos, breadcrumbs, tabs, pagination, skeletons, empty/error states, accessible Radix dialogs, search palette, comparison tray, galleries, table, contact modal, project wizard, stack visualizer, notifications, and messaging. Restrained hover lift, dialog transitions, and tray motion respect reduced-motion settings.

Artwork is original SVG illustration, not vendor screenshots. Demo logos use lettermarks. Evidence labels are part of the interface, not decorative claims.

## Build surfaces

Build cards add original warm UI concept covers, outcome-first titles, creator bylines and linked technology chips. Featured cards use a wider composition; discovery cards retain the ivory surface and thin border. The homepage preserves the fixed sidebar, strong search, warm sand palette and right-hand discovery rail. Creator profiles use restrained initial avatars; no invented review stars appear.

The architecture explorer uses a bounded scroll/pan canvas on desktop and an ordered list on mobile. Node detail cards expose role, evidence and alternatives. The publisher uses a compact step rail that wraps on smaller screens. Collections, offers and moderation reuse shared dialogs, buttons, tables and empty/error states. Reduced motion applies across both releases. New SVG previews are original illustrative UI, not screenshots of vendor products.
