# Generative Glass design system for the unfoldingWord app

This folder is the design system referenced in docs/PRD.md section 10. It is the source of truth for tokens, glass primitives and the app mockup. Commit it as-is under `design-system/`.

## What is here

- `styles.css` and `tokens/`: colour, type, spacing, radius, elevation, glass, motion and dark-theme tokens. Port these into the app's theme module; token names are the contract (`--glass-fill-2`, `--shadow-card`, `--ease-liquid`).
- `components/glass/` and `components/icons/`: the core primitives (GlassSurface, GlassButton, GlassIconButton, GlassInput, GlassChip, DotRing, Filament, AuroraField, StatusBar, Icon). Each has a `.d.ts` props contract and a `.prompt.md` usage note. Web React source; treat as the reference for the React Native equivalents named in AGENTS.md section 6.
- `templates/uw-resources-app/UwResourcesApp.dc.html`: the clickable prototype of the app per the PRD. Screens: onboarding (ON-1..4), Home (HO-1..8), Study passage view, catalog, article reader and search (ST-1..10), Formation tracks, groups and five-movement session with language fallback (FO-1..6), Languages dialog and storage (LA-1..7), transfer with resource selection (SH-1..3), share sheet (SH-4..5), About this library with impact story and three links (PA-1..6), Settings (SE-1). Tweaks: theme, reduced-blur mode, US partner card, start screen.
- `assets/logo/`, `assets/fonts/`: master lockups and type binaries. Every font is SIL Open Font License (Inter, Nunito Sans, PT Serif, and Noto script fallbacks for Arabic, Urdu, Devanagari, Bengali and Myanmar) with its licence text beside it, so the binaries may be redistributed here and embedded in the app on both platforms. Chinese uses the platform's CJK face.
- `guidelines/`, `motion/`, `slides/`, `ui_kits/`: specimen cards, the motion reel, brand slides and the worked examples.
- `readme.md`: the full system documentation.

## Open design questions the app team owns

See PRD 10.3: reduced-blur mode on low-end Android.
