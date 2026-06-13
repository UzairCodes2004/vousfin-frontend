# VousFin — Theme Engine + Responsive Optimization

Date: 2026-06-13
Status: Approved design → ready for implementation plan

## Goal

Two linked outcomes:

1. **Theme engine** — a switcher in Settings offering **10 premium fintech themes** (8 dark, 2 light). Switching retunes every module instantly with zero color/contrast/readability inconsistencies. Persisted per device.
2. **Responsive optimization** — make every module first-class on mobile and tablet.

User decisions (locked):
- Mix: **8 dark + 2 light**.
- Section accents (Money In/Out, etc.): **recolor per theme** (each theme harmonizes them).
- Persistence: **localStorage** (per device, no backend change).
- Sequence: **theme engine first**, then responsive.

## Why this approach

Color currently lives in three places: CSS variables in `src/index.css`, hardcoded hex in `tailwind.config.js`, and ~90 inline hex values across 13 component/util files. Multiple themes are impossible to keep consistent while color is scattered. The fix is a **single source of truth**: every color flows from CSS variables; a theme is just a set of variable values selected by `data-theme` on `<html>`. Because all classes/components resolve to the same variables, all 50 pages + rail + hubs + charts + modals retune in one repaint — that is the structural guarantee against inconsistency.

---

## Part 1 — Theme Engine

### 1.1 CSS variable contract

Every themeable color is a CSS variable. Color tokens that need Tailwind opacity shortcuts (`bg-accent/15`) are stored as **space-separated RGB channels** so Tailwind can compose `rgb(var(--token) / <alpha-value>)`. Border/overlay tokens that are intrinsically translucent are stored as full `rgba()` and used directly.

RGB-channel tokens (consumed via `rgb(var(--x) / <alpha>)`):
```
--c-bg          page canvas
--c-bg2         card surface
--c-bg3         elevated (sidebar, modal, sheet)
--c-text        primary text
--c-text2       secondary text
--c-text3       muted text
--c-accent      interactive accent
--c-accent2     accent pressed / gradient anchor
--c-on-accent   readable ink/text color ON the accent fill (dark for light accents, light for dark accents)
--c-positive    money in / success
--c-negative    money out / danger
--c-highlight   gold/foil/highlight (badges, hero ticks)
--sec-money-in
--sec-money-out
--sec-ledger
--sec-autopilot
--sec-intelligence
--sec-settings
--chart-revenue
--chart-expenses
--chart-profit
--chart-cash
--chart-neutral
```

Translucent tokens (used directly):
```
--c-border      hairline (≈ text @ 0.08–0.10 alpha, tuned per theme)
--c-border2     stronger hairline (≈ 0.16 alpha)
--glass-panel   subtle fill on surface
--glass-hover   hover fill
```

Accessibility rule: in every theme, `--c-text` on `--c-bg`/`--c-bg2` meets WCAG AA (≥ 4.5:1); `--c-text2` ≥ 4.5:1; `--c-text3`/muted ≥ 3:1; accents used for text/icons ≥ 3:1 on their surface. Each theme's values are chosen to satisfy this.

### 1.2 tailwind.config.js refactor

Token **names are unchanged** (navy, charcoal, cyan, accent, emerald, gold, amber, text-primary/secondary/muted, positive, negative, glass…) so all existing classes compile. Their **values** change from hex to variable references:

- `navy.DEFAULT → rgb(var(--c-bg) / <alpha-value>)`, `navy.2 → rgb(var(--c-bg2) / …)`, `charcoal → rgb(var(--c-bg3) / …)`
- `cyan`/`accent → rgb(var(--c-accent) / …)`, `.2 → --c-accent2`
- `emerald`/`positive → --c-positive`; `negative → --c-negative`
- `gold`/`amber → --c-highlight`
- `text.primary/secondary/muted → --c-text / --c-text2 / --c-text3`
- `borderColor.glass → var(--c-border)`, `glass-2 → var(--c-border2)`
- `backgroundColor.glass-panel → var(--glass-panel)`, `glass-hover → var(--glass-hover)`
- `boxShadow` keeps neutral dark/elevation but tuned to read on both light and dark (shadows are alpha-black, fine in both).

The legacy `brand`/`surface` ramps are repointed to the nearest semantic vars (or left as-is; they are rarely used). `darkMode:'class'` stays; the `dark` class on `<html>` is retained for any `dark:` utilities, but themes do not depend on it.

### 1.3 index.css refactor

- `:root` defines the **default theme (Nocturne)** values for all variables above.
- Each of the other 9 themes is `[data-theme="<key>"] { …overrides… }`.
- The aurora field (`body::before`) and grain (`body::after`) are rebuilt from variables so each theme's atmosphere matches (e.g. light themes use a near-zero/very subtle field; dark themes glow in their accent). A `--atmos` set of radial values per theme, or computed from `--c-accent`/`--c-highlight` with low alpha.
- Utility classes (`premium-card`, `btn-gradient`, `text-gradient`, `glass-panel`, hairlines) are rewritten to consume variables (e.g. `btn-gradient` background uses `--c-accent`/`--c-accent2`; its text uses `--c-on-accent` so light-accent themes get dark text and dark-accent themes get light text).

### 1.4 The 10 themes (base palettes)

Surfaces / text / accent / positive / negative / highlight (hex; converted to RGB channels in code). Section accents and chart series are **derived per theme** by the rule in 1.5.

Dark:
1. **Nocturne** (default): bg #070B09, bg2 #0D1411, bg3 #0A100D, text #E9EFEA, text2 #A3B0A8, text3 #6C7A71, accent #3DDC97, accent2 #2BB67C, positive #3DDC97, negative #F2705B, highlight #D4A94E, on-accent #06231A.
2. **Onyx Gold**: bg #0B0B0C, bg2 #141416, bg3 #101012, text #EDEAE3, text2 #A0998C, text3 #6E6A60, accent #D4AF54, accent2 #B8923A, positive #5BD0A0, negative #E5736B, highlight #E8D6A0, on-accent #1A1505.
3. **Midnight Sapphire**: bg #080C16, bg2 #0F1626, bg3 #0B1120, text #E6ECF5, text2 #9BA8BE, text3 #66728A, accent #4DA8F0, accent2 #2E86D6, positive #3FD3A5, negative #F2705B, highlight #7CC4FF, on-accent #04162B.
4. **Aubergine**: bg #120D18, bg2 #1B1424, bg3 #150F1D, text #EFE7F2, text2 #ADA0B6, text3 #76697E, accent #C77DFF, accent2 #A55AE0, positive #54D6A0, negative #F2708A, highlight #E0B0FF, on-accent #1F0A2E.
5. **Graphite Amber**: bg #0E0F11, bg2 #17191C, bg3 #121316, text #ECEDEF, text2 #9DA1A8, text3 #696D74, accent #E0A33E, accent2 #C2862A, positive #57C98A, negative #EF6F5B, highlight #F0C277, on-accent #241702.
6. **Copper Slate**: bg #0E1216, bg2 #161C22, bg3 #11161B, text #E9EDF0, text2 #98A4AE, text3 #647079, accent #D08A5C, accent2 #B26E42, positive #57C99A, negative #EE7361, highlight #E3AE84, on-accent #241208.
7. **Teal Abyss**: bg #05121A, bg2 #0B1E28, bg3 #08161E, text #E4EFF0, text2 #93AAB0, text3 #5E767C, accent #2DD4BF, accent2 #1FAE9C, positive #3DDC97, negative #F2705B, highlight #6FE6D6, on-accent #032420.
8. **Carbon Mono**: bg #0B0B0C, bg2 #161618, bg3 #101012, text #F0F0F2, text2 #9C9CA0, text3 #6A6A6E, accent #E8E8EC, accent2 #BFBFC5, positive #6FD08A, negative #E87A72, highlight #B8B8BE, on-accent #0B0B0C.

Light:
9. **Porcelain**: bg #F5F6F8, bg2 #FFFFFF, bg3 #FAFBFC, text #1A2230, text2 #5A6473, text3 #8A93A1, accent #3B5BDB, accent2 #2A45B8, positive #18794E, negative #C0392B, highlight #1E4FD0, on-accent #FFFFFF. (borders = ink @ low alpha)
10. **Warm Sand**: bg #F3F0E8, bg2 #FBFAF5, bg3 #F7F5EE, text #2A2620, text2 #6B6457, text3 #968D7C, accent #1E6A4A, accent2 #16573C, positive #1E7A4A, negative #B3402A, highlight #B98A2F, on-accent #FBFAF5.

For light themes, `--c-border`/`--c-border2` use ink (text color) at low alpha; aurora field is near-invisible; grain alpha is reduced.

### 1.5 Section + chart derivation rule (per theme)

To guarantee harmony, each theme derives its section/chart colors from its own palette:
- `--sec-money-in = positive`
- `--sec-money-out = negative`
- `--sec-ledger = highlight`
- `--sec-autopilot = accent`
- `--sec-intelligence = accent2` (or highlight if accent2 ≈ accent)
- `--sec-settings = text2`
- `--chart-revenue = positive`, `--chart-expenses = negative`, `--chart-profit = accent`, `--chart-cash = highlight`, `--chart-neutral = text3`

Each value is verified for ≥ 3:1 contrast on `--c-bg2`; if a derived hue fails on a given theme, that theme overrides the specific token with a tuned variant. (Carbon Mono, being monochrome, keeps positive/negative slightly chromatic so money direction stays legible.)

### 1.6 Inline-hex migration (13 files)

Replace hardcoded hex with `var(--…)` (or read computed values for JS-computed colors). Files: `App.jsx` (toaster), `utils/chartTheme.js`, `components/layout/nav.config.js` (section accents → reference the CSS vars by name string, consumed as `var(--sec-*)`), `pages/hub/SectionHubPage.jsx`, `components/dashboard/SmartKPIStrip.jsx`, `BusinessHealthWidget.jsx`, `BusinessOutlookWidget.jsx`, `ForecastWidget.jsx`, `ForecastExplanationCard.jsx`, `NeedsAttentionFeed.jsx`, `ReconciliationStatusWidget.jsx`, `components/charts/ForecastChart.jsx`, `pages/ai/AIForecastPage.jsx`.

- nav.config section accents become CSS-var references (e.g. `accent: 'var(--sec-money-in)'`) — SectionRail/SectionHub already apply `accent` via inline style, and `var()` works in inline `style`. SVG `fill`/`stroke` accept `var()` too, so Recharts series can be `var(--chart-revenue)`.
- For colors computed in JS (e.g. SmartKPIStrip conditional `color`), pass the variable string (`'var(--positive)'`) instead of hex; inline style + SVG accept it.
- `chartTheme.js` exports `var(--chart-*)` strings and var-based grid/axis/tooltip colors. (Recharts renders SVG, so `var()` resolves live and re-themes automatically.)

### 1.7 Theme store, switcher UI, no-flash boot

- `src/stores/useThemeStore.js` — Zustand + `persist` (key `vf-theme`), `{ theme, setTheme }`, default `'nocturne'`. `setTheme` writes `document.documentElement.dataset.theme`.
- `src/theme/themes.js` — the theme registry: `[{ key, name, group:'dark'|'light', swatch:{bg,bg2,accent,positive,negative,highlight} }]` for the switcher previews + ordering. (Actual color values live in CSS.)
- Boot: an inline script in `index.html` `<head>` reads `localStorage['vf-theme']` and sets `data-theme` before first paint (no flash). `App.jsx`/store hydration keeps it in sync.
- Switcher UI: new **Appearance** card at the top of `BusinessSettings.jsx` — responsive grid of 10 tiles, each a live mini-preview (surface + accent button + positive/negative/highlight dots + name + dark/light tag), selected tile ringed in `--c-accent`. Click → `setTheme(key)`; instant. Keyboard accessible (radspec: `role="radiogroup"`).

### 1.8 Verification (theme engine)

For each of the 10 themes, load the live preview and check: dashboard, a hub page, a report table, a list page, the transaction modal, the AI forecast chart. Confirm text contrast, accent legibility, borders visible, no leftover hardcoded color. Build + lint clean.

---

## Part 2 — Responsive optimization (mobile + tablet)

Systemic fixes land first (they cover most screens), then a per-page audit.

### 2.1 Systemic primitives

- **Tables → stacked cards < 640px.** The `responsive-rows` CSS exists; apply it to the ~24 hand-rolled `<table>` pages and add a card/stacked mode to `components/tables/DataTable.jsx`. Wrap any wide table in `table-scroll-container` to kill horizontal page overflow.
- **Modals → bottom sheets on mobile.** `Modal.jsx` already does `items-end sm:items-center` + sheet util; verify the heavy editors (`TransactionFormModal`, `InvoiceEditor`, `BillEditor`, `POEditor`) are usable as sheets (sticky header/footer, scroll body, full-height on small screens).
- **Touch targets ≥ 44px** on interactive controls in list rows, toolbars, tabs, pagination.
- **Forms** collapse multi-column grids (`grid-cols-2/3/4`) to single column < 640px; inputs full-width; selects/date pickers tap-friendly.
- **Typography/spacing scale**: page padding and heading sizes step down on small screens; long figures stay `tabular-nums` and never overflow.

### 2.2 Tablet (≈768px)

Audit two-column layouts that cram at `md`: dashboard intelligence grid, report tables, procurement dashboard, AP workflow board, party detail pages. Adjust breakpoints (e.g. push some `md:grid-cols-2` to `lg:`), ensure the 68px rail + content has comfortable gutters.

### 2.3 Page audit checklist (heaviest first)

Dashboard, Transactions list, Invoices/Bills lists + editors, Financial Reports (income/balance/cash-flow/trial-balance tables), Bank Reconciliation, Reconciliation Exceptions, Procurement (POs, Goods Receipts, Procurement Dashboard, AP Workflow), Inventory, Customers/Vendors lists + details, Receivables/Payables, Approvals, Activity timeline, Settings pages, Business Setup wizard.

For each: no horizontal overflow; tables/cards readable; primary action reachable; modal/sheet usable; tap targets adequate; verified at 375px and 768px in live preview.

### 2.4 Verification (responsive)

Live preview at 375 (mobile) and 768 (tablet) for the audit list; confirm no overflow, readable tables, usable forms/modals; spot-check 2–3 themes at mobile width to confirm theming + responsiveness compose. Build + lint clean.

---

## Architecture / units

- `src/theme/themes.js` — theme registry (keys, names, groups, swatch colors). One purpose: list/describe themes for the UI.
- `src/stores/useThemeStore.js` — persisted current theme + setter. One purpose: state + apply.
- `src/index.css` — variable definitions + per-theme blocks + var-driven utilities. One purpose: the visual contract.
- `tailwind.config.js` — token names → variables. One purpose: bridge classes to variables.
- `components/settings/AppearanceCard.jsx` (new) — the switcher UI. One purpose: pick a theme.
- `index.html` head script — pre-paint theme application. One purpose: no-flash boot.
- `components/tables/DataTable.jsx` — gains a stacked card mode. One purpose: responsive tabular data.

## Phasing (for the plan)

- **Phase 1 — Theme foundation:** variable contract in index.css (Nocturne values), tailwind.config.js → vars, var-driven utilities. Verify Nocturne unchanged. (No visual change expected.)
- **Phase 2 — Inline-hex migration:** convert the 13 files + chartTheme + nav.config to vars. Verify Nocturne unchanged.
- **Phase 3 — The 10 themes:** add 9 `[data-theme]` blocks + section/chart derivations + atmosphere per theme.
- **Phase 4 — Switcher + persistence:** theme store, registry, Appearance card in Settings, no-flash boot. Verify switching across all 10 + heavy modules.
- **Phase 5 — Responsive systemic:** tables→cards, DataTable card mode, modal sheets, touch targets, form collapse, typography scale.
- **Phase 6 — Responsive page audit:** walk the checklist at 375/768; fix per-page issues; spot-check themes × mobile.

Each phase ends with build + lint clean and live-preview verification. Phases 1–4 deliver the theme engine; 5–6 deliver responsive.

## Non-goals

- No backend changes (theme is client-only).
- No new module/feature behavior; this is presentation + layout only.
- No renaming of existing Tailwind token names or utility classes (preserves the 26k-line surface).
