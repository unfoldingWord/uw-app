repo: unfoldingWord/uw-app
branch: main
path: design-system

## Last sync
date: 2026-09-29T14:48:00Z
### Updated in this project
- Rebuilt the app prototype against docs/PRD.md: three tabs (Home, Study, Formation), Languages as a dialog, transfer, About, Settings.
- Added reduced-blur, partner-card and start-screen tweaks.
- Packaged the design system for commit under design-system/ (see HANDOFF.md).

### Changed in the repository, to carry back into the design project
- 2026-09-29: SF Pro and Avenir binaries removed for licensing; Inter (Display and text, 400 to 700) and Nunito Sans (variable) added under the SIL Open Font License. `tokens/fonts.css`, the standalone desktop styles, the brand type card (now `type-brand-nunito`), the adherence config and the manifest updated to match. The design project still declares SF Pro and Avenir until it is resynced.
- 2026-09-29: Noto script fallbacks added (Arabic, Nastaliq Urdu, Devanagari, Bengali, Myanmar) as variable files with unicode ranges, appended to every stack through `--font-script`; Noto Sans SC named without a binary.

## Screen map
| Screen | Built from |
|---|---|
| templates/uw-resources-app/UwResourcesApp.dc.html | docs/PRD.md sections 6, 7, 10; AGENTS.md section 6 |
