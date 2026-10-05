# Themes

Weather Starter uses a CSS-custom-property theme system. Each theme defines two variables on `body[data-theme="<id>"]`:

- `--wx-bg` — the body background (multi-layer CSS gradient, `background-attachment: fixed`)
- `--wx-accent` — used for the selected map pin label and dot; should contrast against the light OSM basemap

Cards, text, and chrome are transparent white overlays (`bg-white/[0.08]`, `text-white`, `border-white/15`) and inherit the gradient automatically. A theme that needs to invert text requires a CSS-variable refactor of those Tailwind utilities across every component — none of the currently implemented themes do this.

Theme selection is persisted to `localStorage` under the key `wx-theme`.

---

## Implemented

### 1. Apple *(default)*

Steel-blue glassmorphism — the original design.

- **Gradient:** warm white highlight at top-right, blue-grey radial wash at bottom-left, steel-blue linear base (`#6f8aa8 → #5a7591 → #3c5066`)
- **Accent:** `#0284c7` (sky blue)
- **Vibe:** clean, calm, iOS Weather–adjacent

### 2. Aurora

Near-black with deep violet and emerald highlights.

- **Gradient:** emerald radial highlight at top-right (`rgba(52,211,153,0.14)`), deep violet wash at bottom-left (`rgba(109,40,217,0.5)`), near-black linear base (`#0d1b2a → #1a0640 → #071018`)
- **Accent:** `#34d399` (emerald)
- **Vibe:** northern lights, technical/dramatic

### 3. Sunset

Deep wine-red to burnt orange — dusk over the strait.

- **Gradient:** amber radial highlight at top-right, wine-red wash at bottom-left, linear base (`#7c1d4a → #9a2a30 → #c24a1a → #b84010`)
- **Accent:** `#f97316` (orange)
- **Vibe:** warm, lifestyle, travel-app energy

### 4. Ocean

Dark navy to midnight blue — deep water.

- **Gradient:** sky-blue radial highlight at top-right, deep-navy wash at bottom-left, linear base (`#03071e → #023e8a → #0077b6 → #005a8e`)
- **Accent:** `#38bdf8` (light blue)
- **Vibe:** maritime, calm, deep

### 5. Forest

Dark charcoal to forest green — Botanic Gardens at night.

- **Gradient:** emerald radial highlight at top-right, dark-green wash at bottom-left, linear base (`#0d1a0f → #1a3a1e → #2d5c3f → #1a3a1e`)
- **Accent:** `#4ade80` (lime-green)
- **Vibe:** nature, earthy, tropical

### 6. Midnight

Near-black monochrome — no colour, just depth.

- **Gradient:** subtle light-grey highlight at top-right (7% opacity), deep-charcoal wash at bottom-left, linear base (`#0f0f0f → #1a1a1a → #212121`)
- **Accent:** `#94a3b8` (cool grey)
- **Vibe:** noir, minimal, focus

### 7. Storm *(most recent)*

Near-black with electric yellow lightning and cold storm-blue — alert/dramatic.

- **Gradient:** electric-yellow radial highlight at top-right (`rgba(251,191,36,0.14)`), cold-blue wash at bottom-left (`rgba(96,165,250,0.22)`), central darkening mid-layer, near-black linear base (`#0e1018 → #141820 → #0c0e18`)
- **Accent:** `#fbbf24` (electric yellow)
- **Vibe:** high-alert, industrial, incoming weather warning

---

## Planned (from initial brainstorm)

Themes below are fully designed but not yet implemented. All dark-gradient themes (marked **D**) can be added with only `--wx-bg` + `--wx-accent` changes in `index.css` and a new entry in `themes.ts`. Light themes (marked **L**) additionally require refactoring Tailwind white-based utilities (`text-white`, `bg-white/[0.08]`, `border-white/15`) to CSS-variable–backed equivalents before they can render correctly.

| # | Name | Type | Key colours | Accent | Notes |
|---|---|---|---|---|---|
| 8 | **Tropical Storm** | D | `#111318` near-black, yellow + grey-blue accents | `#fbbf24` | Similar to Storm (#7); would benefit from a CSS rain-stripe texture overlay |
| 9 | **Paper & Ink** | **L** | Off-white parchment `#f7f3ee`, dark ink `#1a1a1a` | `#c2410c` (rust) | Full light mode; requires text-colour refactor |
| 10 | **Coral Reef** | **L** | Coral-to-aquamarine `#ff6b6b → #48dbfb` | `#ff6b6b` (coral) | Full light mode; vibrant/vacation energy |
| 11 | **Synthwave Grid** | D | Deep purple `#0d0221 → #3d0066`, neon cyan + magenta | `#00f5ff` (cyan) | Optional: CSS grid-line overlay on body for retro scan-line feel |
| 12 | **Overcast Minimal** | **L** | Cool grey `#e8e9ea → #d4d6d8`, pure white cards | `#2563eb` (blue) | Almost-light; cards need solid white treatment |
| 13 | **Sandstone Desert** | D | Ochre-to-terracotta `#7c4a1e → #c18a50 → #e8c99a` | `#c04f2e` (brick) | Warm, calm; gradient alone is sufficient |
| 14 | **Ice Shelf** | **L** | Cold blue-white `#e0f2fe → #bae6fd` | `#0369a1` (deep sky) | Near-light; glass cards would need opacity bump |
| 15 | **Cyberpunk Orange** | D | Black base, safety-orange `#ea580c` + yellow `#fbbf24` | `#ea580c` (orange) | High-contrast industrial; no texture needed |
| 16 | **Pastel Kawaii** | **L** | Soft pink-lavender `#fce7f3 → #ede9fe` | `#ec4899` (pink) | Full light mode; requires text-colour refactor |
| 17 | **Terminal Green** | D | Pure black `#000`, phosphor green `#00ff41` | `#00ff41` (green) | Dark, so no text-colour refactor needed — but `text-white` classes would read `#00ff41` only if mapped through a CSS var |
| 18 | **Retro Weather Map** | **L** | Aged parchment `#e8dcc8`, dashed card borders | `#c04f2e` (rust) | Light; needs border-style override in addition to text refactor |
| 19 | **Material You** | D/L | Dynamic tonal palette keyed to condition (blue=rain, orange=sun, grey=cloud) | dynamic | Requires runtime colour generation from condition string; medium complexity |
| 20 | **Glassmorphism Sunset** | D | Warm dusk `#6b21a8 → #be185d → #ea580c` | `#f59e0b` (amber) | Same card treatment as Apple; easiest next addition after Storm |

---

## Adding a new dark-gradient theme

1. Add the `ThemeId` to the union in `themes.ts` and push a new `{ id, label, swatch }` entry to `THEMES`.
2. Add a `[data-theme='<id>']` block to `index.css` defining `--wx-accent` and `--wx-bg`.
3. No component files need to change.

## Adding a light theme

Before any light theme works, every component that uses `text-white`, `bg-white/[0.08]`, and `border-white/15` needs those utilities replaced with CSS-variable–backed custom utilities (e.g. `text-wx-text`, `bg-wx-surface/[0.08]`, `border-wx-border/15`) defined via `theme.extend.colors` in `tailwind.config.ts`. That's a one-time refactor that unlocks all light themes simultaneously.
