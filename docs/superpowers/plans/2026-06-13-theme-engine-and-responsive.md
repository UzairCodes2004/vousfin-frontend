# Theme Engine + Responsive Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every color in the app flow from CSS variables so a Settings switcher can swap between 10 premium themes (8 dark, 2 light) with zero inconsistency, then make every module first-class on mobile and tablet.

**Architecture:** Single source of truth for color = CSS custom properties. `tailwind.config.js` token *values* point at `rgb(var(--token) / <alpha-value>)`; `index.css` `:root` holds the default (Nocturne) and each other theme is a `[data-theme="key"]` override block. A Zustand store persists the chosen theme to `localStorage` and sets `data-theme` on `<html>`; an inline head script applies it before first paint. Responsive work is systemic primitives (tables→cards, modals→sheets, touch targets, form collapse) plus a per-page audit at 375px and 768px.

**Tech Stack:** React 19, Vite, Tailwind CSS v3, Zustand (+persist), Recharts, react-hook-form.

**Companion spec:** `docs/superpowers/specs/2026-06-13-theme-engine-and-responsive-design.md` — contains the exact 10-theme palette table (§1.4), the derivation rule (§1.5), and the variable contract (§1.1/§1.3). This plan references those by section.

**Verification note (frontend/visual):** CSS-variable and layout work has no meaningful unit test. Each task verifies with: (a) `npm run build` succeeds, (b) ESLint clean on touched files, and (c) live preview screenshots at the relevant breakpoint/theme. The existing demo login is `muhammaduzair4114@gmail.com` / `Uzair123@`. Backend must run on :5000 (`npm run dev` in `vousfin-backend-main`); frontend via the preview server (autoPort).

**Global guardrail:** Token NAMES and utility-class NAMES never change (navy, charcoal, cyan, accent, emerald, gold, amber, text-primary/secondary/muted, positive, negative, glass, premium-card, btn-gradient, …). Only their VALUES move to variables. This preserves the 26k-line call surface.

---

## Phase 1 — Theme variable foundation (no visual change)

Goal: route Nocturne through variables. After this phase the app looks identical, but every Tailwind color token resolves through a CSS variable.

### Task 1: Define the Nocturne variable contract in `:root`

**Files:**
- Modify: `src/index.css` (the `@layer base { :root { … } }` block)

Store opacity-capable tokens as space-separated RGB channels; store intrinsically-translucent tokens as full values.

- [ ] **Step 1: Replace the `:root` block** with the full variable contract (Nocturne defaults). Convert each spec §1.4 Nocturne hex to "R G B" channels.

```css
:root {
  color-scheme: dark;
  /* RGB channels (consumed via rgb(var(--x) / <alpha>)) */
  --c-bg: 7 11 9;            /* #070B09 */
  --c-bg2: 13 20 17;         /* #0D1411 */
  --c-bg3: 10 16 13;         /* #0A100D */
  --c-text: 233 239 234;     /* #E9EFEA */
  --c-text2: 163 176 168;    /* #A3B0A8 */
  --c-text3: 108 122 113;    /* #6C7A71 */
  --c-accent: 61 220 151;    /* #3DDC97 */
  --c-accent2: 43 182 124;   /* #2BB67C */
  --c-on-accent: 6 35 26;    /* #06231A */
  --c-positive: 61 220 151;  /* #3DDC97 */
  --c-negative: 242 112 91;  /* #F2705B */
  --c-highlight: 212 169 78; /* #D4A94E */
  --sec-money-in: 61 220 151;
  --sec-money-out: 242 112 91;
  --sec-ledger: 212 169 78;
  --sec-autopilot: 111 232 180;   /* #6FE8B4 */
  --sec-intelligence: 224 177 75; /* #E0B14B */
  --sec-settings: 163 176 168;
  --chart-revenue: 61 220 151;
  --chart-expenses: 242 112 91;
  --chart-profit: 111 232 180;
  --chart-cash: 212 169 78;
  --chart-neutral: 108 122 113;
  /* Translucent tokens (used directly) */
  --c-border: rgba(233, 239, 234, 0.08);
  --c-border2: rgba(233, 239, 234, 0.16);
  --glass-panel: rgba(233, 239, 234, 0.045);
  --glass-hover: rgba(233, 239, 234, 0.07);
  /* Atmosphere (per-theme aurora radials + grain alpha) */
  --atmos-1: rgba(61, 220, 151, 0.075);
  --atmos-2: rgba(212, 169, 78, 0.05);
  --atmos-3: rgba(26, 82, 57, 0.16);
  --grain-alpha: 0.05;
  /* Legacy aliases kept for any direct var() consumers */
  --bg: rgb(var(--c-bg)); --bg2: rgb(var(--c-bg2)); --bg3: rgb(var(--c-bg3));
  --text: rgb(var(--c-text)); --text2: rgb(var(--c-text2)); --text3: rgb(var(--c-text3));
  --border: var(--c-border); --border2: var(--c-border2);
  --accent: rgb(var(--c-accent)); --accent2: rgb(var(--c-accent2));
  --gold: rgb(var(--c-highlight));
  --cyan: rgb(var(--c-accent)); --cyan2: rgb(var(--c-accent2));
  --emerald: rgb(var(--c-positive)); --emerald2: rgb(var(--c-accent2)); --emerald3: rgb(var(--chart-profit));
}
```

- [ ] **Step 2: Update `body::before` (aurora) and `body::after` (grain) to use the atmosphere vars.**

```css
body::before {
  content: ''; position: fixed; inset: 0; z-index: -2; pointer-events: none;
  background:
    radial-gradient(900px 620px at 12% -8%, var(--atmos-1), transparent 62%),
    radial-gradient(720px 480px at 88% -6%, var(--atmos-2), transparent 58%),
    radial-gradient(1300px 860px at 50% 116%, var(--atmos-3), transparent 64%),
    rgb(var(--c-bg));
}
body::after {
  content: ''; position: fixed; inset: 0; z-index: 60; pointer-events: none;
  opacity: 0.5; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
}
```

- [ ] **Step 3: Build.** Run: `npm run build` — Expected: success.
- [ ] **Step 4: Commit.**
```bash
git add src/index.css
git commit -m "theme: define Nocturne CSS variable contract in :root"
```

### Task 2: Point Tailwind tokens at the variables

**Files:**
- Modify: `tailwind.config.js` (the `theme.extend.colors`, `borderColor`, `backgroundColor` blocks)

- [ ] **Step 1: Replace the color/border/background blocks** so names stay, values become variable refs.

```js
const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`
const ACCENT = { DEFAULT: withAlpha('--c-accent'), 2: withAlpha('--c-accent2'), soft: 'rgb(var(--c-accent) / 0.12)' }
const HL = { DEFAULT: withAlpha('--c-highlight'), 2: withAlpha('--c-highlight') }
// inside theme.extend:
colors: {
  navy: { DEFAULT: withAlpha('--c-bg'), 2: withAlpha('--c-bg2') },
  charcoal: { DEFAULT: withAlpha('--c-bg3') },
  cyan: ACCENT, accent: ACCENT, gold: HL,
  amber: { DEFAULT: withAlpha('--c-highlight'), 2: withAlpha('--c-highlight') },
  emerald: { DEFAULT: withAlpha('--c-positive'), 2: withAlpha('--c-accent2'), 3: withAlpha('--chart-profit') },
  positive: { DEFAULT: withAlpha('--c-positive'), muted: 'rgb(var(--c-positive) / 0.10)' },
  negative: { DEFAULT: withAlpha('--c-negative'), muted: 'rgb(var(--c-negative) / 0.10)' },
  text: { primary: withAlpha('--c-text'), secondary: withAlpha('--c-text2'), muted: withAlpha('--c-text3') },
  brand: { 50:withAlpha('--c-accent'),100:withAlpha('--c-accent'),200:withAlpha('--c-accent'),300:withAlpha('--c-accent'),400:withAlpha('--c-accent2'),500:withAlpha('--c-accent2'),600:withAlpha('--c-accent'),700:withAlpha('--c-accent2'),800:withAlpha('--c-accent2'),900:withAlpha('--c-accent2'),950:withAlpha('--c-bg') },
  surface: { DEFAULT: withAlpha('--c-bg2'), muted: withAlpha('--c-bg'), border: 'var(--c-border)' },
},
borderColor: { glass: 'var(--c-border)', 'glass-2': 'var(--c-border2)' },
backgroundColor: { 'glass-panel': 'var(--glass-panel)', 'glass-hover': 'var(--glass-hover)' },
```

- [ ] **Step 2: Keep `boxShadow`, `fontFamily`, `animation`, `borderRadius` as-is** (alpha-black shadows read on both light and dark).
- [ ] **Step 3: Build.** Run: `npm run build` — Expected: success.
- [ ] **Step 4: Verify Nocturne unchanged in preview.** Start backend + preview, log in, screenshot dashboard. Expected: visually identical to current Nocturne.
- [ ] **Step 5: Commit.**
```bash
git add tailwind.config.js
git commit -m "theme: point Tailwind color tokens at CSS variables"
```

### Task 3: Convert var-driven utility classes in `index.css`

**Files:**
- Modify: `src/index.css` (`@layer utilities` + keyframe color stops)

- [ ] **Step 1: Rewrite color literals in utilities to variables.** Specifically:
  - `.bg-glass` background → `var(--glass-panel)`, border → `var(--c-border)`.
  - `.premium-card` background gradient overlay stays white-alpha (works on both modes via low alpha); base → `rgb(var(--c-bg2))`; border → `var(--c-border)`; hover border → `var(--c-border2)`; hover glow ring → `rgb(var(--c-accent) / 0.07)`.
  - `.btn-gradient` background → `linear-gradient(180deg, rgb(var(--c-accent)), rgb(var(--c-accent2)))`; `color: rgb(var(--c-on-accent))`; shadow uses `rgb(var(--c-accent) / 0.5)`.
  - `.btn-outline` background `rgb(var(--c-text) / 0.03)`, border `var(--c-border2)`, color `rgb(var(--c-text2))`; hover border/color/bg use `--c-accent`.
  - `.text-gradient` → `linear-gradient(115deg, rgb(var(--c-highlight)), rgb(var(--c-accent2)))` (foil reads in every theme; for mono/azure themes it becomes a tasteful accent sheen).
  - `.gold-hairline::before` / `.jade-hairline::before` gradients → `rgb(var(--c-highlight) / …)` and `rgb(var(--c-accent) / …)`.
  - `.glass-panel` → background `rgb(var(--c-bg2) / 0.9)`, border `var(--c-border2)`.
  - `::selection` → `rgb(var(--c-accent) / 0.28)` / `color: rgb(var(--c-text))`.
  - Skeleton keyframe stops → `rgb(var(--c-text) / 0.05|0.09)`.
  - `.num` font/size unchanged.
- [ ] **Step 2: Build + preview Nocturne.** Run `npm run build`; screenshot dashboard + a button + a card. Expected: identical to current.
- [ ] **Step 3: Commit.**
```bash
git add src/index.css
git commit -m "theme: drive utility classes from CSS variables"
```

---

## Phase 2 — Migrate inline hex to variables

Goal: remove the ~90 hardcoded hex in 13 files so charts/widgets follow the theme. Verify Nocturne unchanged after each.

### Task 4: chartTheme + Recharts series

**Files:**
- Modify: `src/utils/chartTheme.js`

- [ ] **Step 1: Replace exports with variable strings** (SVG resolves `var()` live, so charts re-theme automatically):

```js
export const CHART_COLORS = {
  revenue:  'var(--chart-revenue, #3DDC97)',
  expenses: 'var(--chart-expenses, #F2705B)',
  profit:   'var(--chart-profit, #6FE8B4)',
  cash:     'var(--chart-cash, #D4A94E)',
  neutral:  'var(--chart-neutral, #6C7A71)',
}
export const GRID_PROPS = { strokeDasharray: '3 3', stroke: 'rgb(var(--c-text) / 0.06)', vertical: false }
export const AXIS_TICK = { fontSize: 11, fill: 'rgb(var(--c-text3))' }
export const AXIS_STYLE = { axisLine: false, tickLine: false }
export const TOOLTIP_WRAPPER = {
  contentStyle: { background: 'rgb(var(--c-bg2) / 0.95)', border: '1px solid var(--c-border2)', borderRadius: '12px', backdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 40px rgba(0,0,0,0.6)', padding: '10px 14px', fontSize: '12px' },
  labelStyle: { color: 'rgb(var(--c-text))', fontWeight: 700, marginBottom: '4px' },
  itemStyle:  { color: 'rgb(var(--c-text2))' },
}
export function kFmt(v){ const a=Math.abs(v); if(a>=1e6)return `${(v/1e6).toFixed(1)}M`; if(a>=1e3)return `${(v/1e3).toFixed(0)}K`; return String(Math.round(v)) }
```

- [ ] **Step 2: Note** — `var()` in Recharts `fill`/`stroke` props renders as SVG attributes and resolves live. Where a chart passes `entry.fill` into a CSS color (e.g. a tooltip dot `backgroundColor`), `var()` still resolves. No JS color math here.
- [ ] **Step 3: Build + preview** the dashboard charts in Nocturne. Expected: identical.
- [ ] **Step 4: Commit.** `git add src/utils/chartTheme.js && git commit -m "theme: chart colors from CSS variables"`

### Task 5: nav.config section accents → variables

**Files:**
- Modify: `src/components/layout/nav.config.js`

- [ ] **Step 1: Replace the hex accent constants** with CSS-var strings:

```js
const JADE = 'var(--sec-money-in)'
const CORAL = 'var(--sec-money-out)'
const GOLD = 'var(--sec-ledger)'
const MINT = 'var(--sec-autopilot)'
const CHAMP = 'var(--sec-intelligence)'
const MUTE = 'var(--sec-settings)'
```

- [ ] **Step 2: Verify** SectionRail/SectionHubPage apply `accent` via inline `style` (background/box-shadow/color) and via template strings like `` `${accent}1A` ``. Template-string alpha concatenation (`accent + '1A'`) BREAKS with `var()`. Fix those call sites to use `color-mix` or rgb alpha:
  - In `SectionRail.jsx`: replace `` `${accent}1F` ``, `` `${accent}59` ``, `` `0 0 10px ${accent}` `` etc. with `color-mix(in srgb, ${accent} 12%, transparent)`, `color-mix(in srgb, ${accent} 35%, transparent)`, and `0 0 10px ${accent}` (full-color glow is fine).
  - In `SectionHubPage.jsx`: replace `` `${accent}88` ``, `` `${accent}1A` ``, `` `${accent}33` ``, `` `${accent}14` ``, `` `${accent}99` `` with `color-mix(in srgb, ${accent} N%, transparent)` (88→53%, 1A→10%, 33→20%, 14→8%, 99→60%).
- [ ] **Step 3: Build + preview** Money In / Money Out / Ledger hubs + rail in Nocturne. Expected: identical (color-mix yields the same alpha).
- [ ] **Step 4: Commit.** `git add src/components/layout/nav.config.js src/components/layout/SectionRail.jsx src/pages/hub/SectionHubPage.jsx && git commit -m "theme: section accents from CSS variables"`

### Task 6: Dashboard widgets + remaining hex files

**Files (modify each, replacing hex with `var(--…)` or `rgb(var(--…))` / `color-mix`):**
- `src/components/dashboard/SmartKPIStrip.jsx` (8): the primary/secondary card `color` values `#3DDC97/#F2705B/#D4A94E/#6FE8B4` → `var(--chart-revenue)` etc.; alpha concat (`color + '1C'`) → `color-mix(in srgb, ${color} 11%, transparent)`; trend tints already use `text-positive/negative` classes.
- `src/components/dashboard/BusinessHealthWidget.jsx` (21): map score/zone hexes to `var(--c-positive)`, `var(--c-highlight)`, `var(--c-negative)`, `var(--c-text2)` per semantic; gauge arc strokes use the same.
- `src/components/dashboard/BusinessOutlookWidget.jsx` (8): same semantic mapping.
- `src/components/dashboard/ForecastWidget.jsx` (3), `ForecastExplanationCard.jsx` (4), `NeedsAttentionFeed.jsx` (4), `ReconciliationStatusWidget.jsx` (2): map status hexes (red/amber/green/blue) to `var(--c-negative)`, `var(--c-highlight)`, `var(--c-positive)`, `var(--c-accent)`.
- `src/components/charts/ForecastChart.jsx` (14): series/band/grid colors → `var(--chart-*)`, `rgb(var(--c-accent) / …)` for confidence bands, grid/axis from chartTheme.
- `src/pages/ai/AIForecastPage.jsx` (7): same chart-var mapping.
- `src/App.jsx` (4): Toaster `iconTheme` primary/secondary — these need concrete strings (react-hot-toast doesn't resolve `var()` in canvas-less SVG icon? it does set SVG fill, so `var()` works). Set `success.primary:'var(--c-positive)'`, `secondary:'var(--c-on-accent)'`; `error.primary:'var(--c-negative)'`, `secondary:'var(--c-bg3)'`. Toast container classes already use token classes.

- [ ] **Step 1:** Edit each file above per the mapping. For any JS conditional returning a color, return the `var()`/`color-mix` string.
- [ ] **Step 2: Grep check** — `rg "#[0-9A-Fa-f]{6}" src` should return only intentional non-theme cases (none expected in these files). Fix stragglers.
- [ ] **Step 3: Build + preview** dashboard (all widgets + forecast chart) and AI Forecast page in Nocturne. Expected: identical.
- [ ] **Step 4: Commit.** `git add -A && git commit -m "theme: migrate dashboard/forecast widget colors to variables"`

---

## Phase 3 — The 10 theme blocks

### Task 7: Add the 9 `[data-theme]` override blocks

**Files:**
- Modify: `src/index.css` (append a `@layer base` block after `:root`)

- [ ] **Step 1: Append one block per non-default theme.** For each theme in spec §1.4, convert every hex to "R G B" channels for the RGB tokens, set `--c-border`/`--c-border2`/`--glass-*` (dark = text-white alpha; light = ink alpha), set atmosphere (dark = accent/highlight low-alpha radials; light = near-zero radials + lower `--grain-alpha`), and derive `--sec-*`/`--chart-*` per spec §1.5 (each = its semantic source token). Also set `color-scheme: dark|light` and refresh the legacy aliases (`--accent`, `--gold`, etc.) — since aliases reference the same `--c-*`, they update automatically and need not be repeated.

Example (Midnight Sapphire — full, as the pattern to replicate for all 9):
```css
[data-theme="sapphire"] {
  color-scheme: dark;
  --c-bg: 8 12 22; --c-bg2: 15 22 38; --c-bg3: 11 17 32;
  --c-text: 230 236 245; --c-text2: 155 168 190; --c-text3: 102 114 138;
  --c-accent: 77 168 240; --c-accent2: 46 134 214; --c-on-accent: 4 22 43;
  --c-positive: 63 211 165; --c-negative: 242 112 91; --c-highlight: 124 196 255;
  --c-border: rgba(230,236,245,0.09); --c-border2: rgba(230,236,245,0.17);
  --glass-panel: rgba(230,236,245,0.05); --glass-hover: rgba(230,236,245,0.08);
  --atmos-1: rgba(77,168,240,0.10); --atmos-2: rgba(124,196,255,0.05); --atmos-3: rgba(20,50,90,0.20); --grain-alpha: 0.05;
  --sec-money-in: 63 211 165; --sec-money-out: 242 112 91; --sec-ledger: 124 196 255;
  --sec-autopilot: 77 168 240; --sec-intelligence: 124 196 255; --sec-settings: 155 168 190;
  --chart-revenue: 63 211 165; --chart-expenses: 242 112 91; --chart-profit: 77 168 240; --chart-cash: 124 196 255; --chart-neutral: 102 114 138;
}
```

Repeat for: `onyx`, `sapphire`, `aubergine`, `graphite`, `copper`, `teal`, `carbon` (dark) and `porcelain`, `sand` (light), using each theme's hex from spec §1.4 converted to channels, and §1.5 derivation. Light themes: `color-scheme: light`; `--c-border: rgba(<ink>,0.10)`, `--c-border2: rgba(<ink>,0.18)`; `--glass-panel: rgba(<ink>,0.04)`, `--glass-hover: rgba(<ink>,0.07)` where `<ink>` is the theme's text RGB; `--atmos-*` very low alpha; `--grain-alpha: 0.02`.

- [ ] **Step 2: Build.** Run `npm run build` — Expected: success.
- [ ] **Step 3: Temporary manual check** — in preview console, run `document.documentElement.dataset.theme='aubergine'` and screenshot dashboard; repeat for `porcelain` and `carbon`. Expected: cohesive recolor, readable text, visible borders. Reset to remove attr.
- [ ] **Step 4: Commit.** `git add src/index.css && git commit -m "theme: add 9 theme override blocks (8 dark + 2 light)"`

---

## Phase 4 — Switcher, store, persistence, no-flash boot

### Task 8: Theme registry + store

**Files:**
- Create: `src/theme/themes.js`
- Create: `src/stores/useThemeStore.js`

- [ ] **Step 1: Write the registry** (order + swatches for the UI; values mirror spec §1.4):
```js
export const THEMES = [
  { key:'nocturne', name:'Nocturne', group:'dark', sw:{bg:'#070B09',c:'#0D1411',a:'#3DDC97',p:'#3DDC97',n:'#F2705B',h:'#D4A94E'} },
  { key:'onyx', name:'Onyx Gold', group:'dark', sw:{bg:'#0B0B0C',c:'#141416',a:'#D4AF54',p:'#5BD0A0',n:'#E5736B',h:'#E8D6A0'} },
  { key:'sapphire', name:'Midnight Sapphire', group:'dark', sw:{bg:'#080C16',c:'#0F1626',a:'#4DA8F0',p:'#3FD3A5',n:'#F2705B',h:'#7CC4FF'} },
  { key:'aubergine', name:'Aubergine', group:'dark', sw:{bg:'#120D18',c:'#1B1424',a:'#C77DFF',p:'#54D6A0',n:'#F2708A',h:'#E0B0FF'} },
  { key:'graphite', name:'Graphite Amber', group:'dark', sw:{bg:'#0E0F11',c:'#17191C',a:'#E0A33E',p:'#57C98A',n:'#EF6F5B',h:'#F0C277'} },
  { key:'copper', name:'Copper Slate', group:'dark', sw:{bg:'#0E1216',c:'#161C22',a:'#D08A5C',p:'#57C99A',n:'#EE7361',h:'#E3AE84'} },
  { key:'teal', name:'Teal Abyss', group:'dark', sw:{bg:'#05121A',c:'#0B1E28',a:'#2DD4BF',p:'#3DDC97',n:'#F2705B',h:'#6FE6D6'} },
  { key:'carbon', name:'Carbon Mono', group:'dark', sw:{bg:'#0B0B0C',c:'#161618',a:'#E8E8EC',p:'#6FD08A',n:'#E87A72',h:'#B8B8BE'} },
  { key:'porcelain', name:'Porcelain', group:'light', sw:{bg:'#F5F6F8',c:'#FFFFFF',a:'#3B5BDB',p:'#18794E',n:'#C0392B',h:'#1E4FD0'} },
  { key:'sand', name:'Warm Sand', group:'light', sw:{bg:'#F3F0E8',c:'#FBFAF5',a:'#1E6A4A',p:'#1E7A4A',n:'#B3402A',h:'#B98A2F'} },
]
export const THEME_KEYS = THEMES.map(t => t.key)
export const DEFAULT_THEME = 'nocturne'
export function applyTheme(key){
  const k = THEME_KEYS.includes(key) ? key : DEFAULT_THEME
  const el = document.documentElement
  if (k === DEFAULT_THEME) el.removeAttribute('data-theme'); else el.dataset.theme = k
}
```

- [ ] **Step 2: Write the store** (persist key `vf-theme`):
```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyTheme, DEFAULT_THEME, THEME_KEYS } from '@/theme/themes'

export const useThemeStore = create(persist(
  (set) => ({
    theme: DEFAULT_THEME,
    setTheme: (key) => {
      const k = THEME_KEYS.includes(key) ? key : DEFAULT_THEME
      applyTheme(k)
      set({ theme: k })
    },
  }),
  { name: 'vf-theme', onRehydrateStorage: () => (state) => { if (state) applyTheme(state.theme) } },
))
```
- [ ] **Step 3: Build.** Run `npm run build` — Expected: success.
- [ ] **Step 4: Commit.** `git add src/theme/themes.js src/stores/useThemeStore.js && git commit -m "theme: registry + persisted theme store"`

### Task 9: No-flash boot + store init

**Files:**
- Modify: `index.html` (add a head script before the stylesheet link)
- Modify: `src/App.jsx` (ensure store applies on mount)

- [ ] **Step 1: Add the pre-paint script** in `index.html` `<head>` (before fonts/stylesheet):
```html
<script>
  (function(){
    try {
      var raw = localStorage.getItem('vf-theme');
      var key = raw ? (JSON.parse(raw).state || {}).theme : null;
      var valid = ['nocturne','onyx','sapphire','aubergine','graphite','copper','teal','carbon','porcelain','sand'];
      if (key && valid.indexOf(key) !== -1 && key !== 'nocturne') document.documentElement.setAttribute('data-theme', key);
    } catch (e) {}
  })();
</script>
```
- [ ] **Step 2: In `App.jsx`**, import the store and apply once on mount (keeps `<html>` in sync if storage was empty):
```js
import { useThemeStore } from '@/stores/useThemeStore'
// inside App(), alongside the existing dark-class effect:
const theme = useThemeStore((s) => s.theme)
useEffect(() => { useThemeStore.getState().setTheme(theme) }, [theme])
```
- [ ] **Step 3: Keep** the existing `document.documentElement.classList.add('dark')` effect (themes don't depend on it but `dark:` utilities might).
- [ ] **Step 4: Build + preview** — reload twice to confirm no flash; set a theme, hard-reload, confirm it persists with no white flash on light themes.
- [ ] **Step 5: Commit.** `git add index.html src/App.jsx && git commit -m "theme: no-flash boot + apply persisted theme on load"`

### Task 10: Appearance switcher card in Settings

**Files:**
- Create: `src/components/settings/AppearanceCard.jsx`
- Modify: `src/pages/business/BusinessSettings.jsx` (render `<AppearanceCard />` at the top of the page body)

- [ ] **Step 1: Write the card** — a `role="radiogroup"` grid of 10 live-preview tiles; selected ringed in accent:
```jsx
import { Check } from 'lucide-react'
import { THEMES } from '@/theme/themes'
import { useThemeStore } from '@/stores/useThemeStore'
import { cn } from '@/utils/cn'

export default function AppearanceCard() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  return (
    <div className="premium-card p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold text-text-primary">Appearance</h3>
      <p className="mt-1 text-[13px] text-text-secondary">Pick a theme. It applies instantly and is saved on this device.</p>
      <div role="radiogroup" aria-label="Theme" className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {THEMES.map((t) => {
          const active = t.key === theme
          return (
            <button
              key={t.key} role="radio" aria-checked={active} onClick={() => setTheme(t.key)}
              className={cn('group relative rounded-xl border p-2.5 text-left transition-all duration-200',
                active ? 'border-glass-2 ring-2 ring-accent/60' : 'border-glass hover:border-glass-2')}
              style={{ background: t.sw.bg }}
            >
              <div className="rounded-lg border p-2.5" style={{ background: t.sw.c, borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium" style={{ color: t.sw.a }}>Rs 3.28M</span>
                  {active && <Check className="h-3.5 w-3.5" style={{ color: t.sw.a }} />}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-5 flex-1 rounded-md" style={{ background: t.sw.a }} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.sw.p }} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.sw.n }} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.sw.h }} />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between px-0.5">
                <span className="text-[11px] font-medium" style={{ color: t.group === 'light' ? '#2A2620' : '#E9EFEA' }}>{t.name}</span>
                <span className="text-[9px] uppercase tracking-wider" style={{ color: t.group === 'light' ? '#6B6457' : '#8A8F83' }}>{t.group}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```
- [ ] **Step 2: Render it** at the top of `BusinessSettings.jsx`'s content (above the existing business form card). Import and place `<AppearanceCard />`.
- [ ] **Step 3: Build + preview** Settings; click through all 10 themes; confirm instant retune and the selected ring. Screenshot 3 (a dark, a light, mono).
- [ ] **Step 4: Commit.** `git add src/components/settings/AppearanceCard.jsx src/pages/business/BusinessSettings.jsx && git commit -m "theme: Appearance switcher card in Settings"`

### Task 11: Full theme sweep (consistency gate)

**Files:** none (verification only; fixes land in the relevant file if found)

- [ ] **Step 1:** For each of the 10 themes, in preview set the theme via the switcher and screenshot: dashboard, `/hub/money-in`, `/hub/ledger`, `/financial-reports/income-statement`, `/transactions`, the New Transaction modal, `/ai/forecast`.
- [ ] **Step 2:** For each screenshot confirm: primary text legible on surface; secondary/muted distinguishable; card borders visible; accent legible; positive/negative correct; no leftover hardcoded color; charts recolored. Log any failures.
- [ ] **Step 3:** Fix any failing token in the offending `[data-theme]` block (e.g. bump a `--sec-*` or `--c-text2` for contrast) or the stray hardcoded value. Re-verify that theme.
- [ ] **Step 4: Commit** any fixes. `git commit -m "theme: contrast/consistency fixes from full sweep"`

---

## Phase 5 — Responsive systemic primitives

### Task 12: DataTable stacked-card mode

**Files:**
- Modify: `src/components/tables/DataTable.jsx`

- [ ] **Step 1:** Add a `stackOnMobile` prop (default `true`). When set, the rendered `<table>` gets `className="… responsive-rows"` and each `<td>` gets a `data-label={column.header}` attribute so the existing `responsive-rows` CSS can show labels. Add CSS in `index.css` to render the `data-label` before the value on mobile:
```css
@media (max-width: 640px){
  table.responsive-rows tbody td::before{
    content: attr(data-label); color: rgb(var(--c-text3));
    font-size: 11px; font-weight: 600; margin-right: auto;
  }
}
```
- [ ] **Step 2: Build + preview** a DataTable-based page at 375px. Expected: rows stack into labeled cards, no horizontal overflow.
- [ ] **Step 3: Commit.** `git add src/components/tables/DataTable.jsx src/index.css && git commit -m "responsive: DataTable stacked card mode on mobile"`

### Task 13: Hand-rolled tables → responsive-rows

**Files (add `responsive-rows` class + `data-label` per `<td>`):** the ~24 table pages, prioritized: `pages/transactions/TransactionsList.jsx`, `pages/parties/{InvoicesListPage,BillsListPage,CustomersList,VendorsList,ReceivablesPage,PayablesPage}.jsx`, `pages/reports/{TrialBalancePage,GeneralLedgerPage,AgingReportPage,ComparativeReportPage}.jsx`, `components/reports/{IncomeStatementTable,BalanceSheetTable,CashFlowTable}.jsx`, `pages/reconciliation/BankReconciliationPage.jsx`, `pages/approvals/ApprovalsQueuePage.jsx`, `pages/procurement/{PurchaseOrdersPage,GoodsReceiptsPage}.jsx`, `pages/inventory/InventoryPage.jsx`, `pages/audit/ActivityTimelinePage.jsx`.

- [ ] **Step 1:** For each, locate the `<table>` and add `responsive-rows` to its className; add `data-label="<Column>"` to each `<td>`. Where a table is dense/numeric and stacking hurts, instead wrap in `table-scroll-container` (horizontal scroll) — choose per table (lists → stack; financial statements with aligned columns → scroll).
- [ ] **Step 2: Build + preview** each at 375px (batch the screenshots). Expected: no page-level horizontal overflow; content readable.
- [ ] **Step 3: Commit** in 2–3 logical batches. `git commit -m "responsive: stack/scroll list & report tables on mobile"`

### Task 14: Modal/sheet, touch targets, form collapse, scale

**Files:**
- Modify: `src/components/modals/Modal.jsx`, `src/components/forms/TransactionFormModal.jsx`, `src/components/invoice/{InvoiceEditor,BillEditor}.jsx`, `src/components/procurement/POEditor.jsx`, `src/layouts/DashboardLayout.jsx`

- [ ] **Step 1: Modal sheets** — confirm `Modal.jsx` uses `items-end sm:items-center`, `max-h-[90vh]`, sticky header/footer, scrollable body, full-width on mobile (`w-full sm:max-w-…`). Apply the same container pattern to the heavy editors if they render their own shell.
- [ ] **Step 2: Touch targets** — ensure icon-only buttons in list rows/toolbars/tabs/pagination are ≥ 40px tappable (`p-2`/`min-h-[40px]`). Adjust where smaller.
- [ ] **Step 3: Form collapse** — find multi-column grids in editors/settings (`grid-cols-2/3/4` without a `grid-cols-1` base) and prefix with `grid-cols-1 sm:` so they stack on mobile.
- [ ] **Step 4: Page scale** — in `DashboardLayout.jsx` confirm content padding steps (`px-4 sm:px-6 lg:px-8`) and that `max-w-7xl` + 68px rail leaves comfortable gutters at `md`.
- [ ] **Step 5: Build + preview** New Transaction modal + an editor at 375px; a multi-column settings form at 375px. Expected: usable sheets, stacked forms, adequate targets.
- [ ] **Step 6: Commit.** `git commit -m "responsive: modal sheets, touch targets, form collapse, spacing scale"`

---

## Phase 6 — Responsive page audit (375px + 768px)

### Task 15: Mobile/tablet audit sweep

**Files:** per-page fixes as found.

- [ ] **Step 1:** Walk the checklist (spec §2.3) in preview at 375 then 768: Dashboard, Transactions, Invoices/Bills lists+editors, Financial Reports (4 tables), Bank Reconciliation, Reconciliation Exceptions, Procurement (POs, GRNs, Procurement Dashboard, AP Workflow), Inventory, Customers/Vendors lists+details, Receivables/Payables, Approvals, Activity, Settings, Business Setup.
- [ ] **Step 2:** For each page confirm: no horizontal overflow; tables/cards readable; primary action reachable; modal/sheet usable; tap targets adequate. Fix issues in-page (stack grids, wrap tables, hide non-essential columns < 640px via `hidden sm:table-cell`, shrink hero paddings).
- [ ] **Step 3:** Spot-check 2–3 themes (a dark, a light, mono) at 375px on Dashboard + a list + a report to confirm theming and responsiveness compose.
- [ ] **Step 4: Build + lint** — `npm run build` (success) and `npx eslint <touched files>` (clean). Commit per logical batch. `git commit -m "responsive: page audit fixes (mobile + tablet)"`

---

## Self-review notes

- **Spec coverage:** §1.1/§1.3 contract → Tasks 1,3; §1.2 tailwind → Task 2; §1.4 palettes → Tasks 1,7; §1.5 derivation → Task 7; §1.6 inline-hex → Tasks 4–6; §1.7 store/UI/boot → Tasks 8–10; §1.8 theme verify → Task 11; §2.1 primitives → Tasks 12–14; §2.2 tablet + §2.3 audit → Task 15; §2.4 verify → Tasks 11,15.
- **Color-mix caveat:** `var()`-based accents cannot be string-concatenated with hex alpha suffixes (`accent + '1A'`). Every such call site in SectionRail/SectionHubPage/SmartKPIStrip is explicitly converted to `color-mix(in srgb, …)` (Tasks 5,6). `color-mix` is supported in all current evergreen browsers (Vite target).
- **No backend** changes; theme is client-only (localStorage key `vf-theme`).
- **Token/class names unchanged** throughout — preserves the existing call surface.
```
