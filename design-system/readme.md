# Generative Glass — Design System

> _"We exist to see the Church in every People Group and the Bible in every Language."_

**Generative Glass** is a glassmorphism-2.0 — "liquid glass" — design language for **unfoldingWord®**, a global ministry that equips local churches to translate the Bible into their own languages (Church-Centric Bible Translation, or CCBT). It is a product-surface companion to the unfoldingWord design system: the same brand — same palette, same typefaces, same logo, same voice — rendered as translucent glass rather than print-heritage blocks. Every surface is translucent frosted glass floating over a soft aurora field; every state change is a slow morph rather than a cut. Motion is organic and viscous: elements rise, connections draw, screens dissolve and reform.

## The brief and its evidence

**The design language came first.** It was specified directly: refined glassmorphism with medium-strong Gaussian blur, soft white hairline borders, inner highlights and edge refraction, multi-layered high-diffusion shadows, high radii, and a luminous almost-liquid quality — over out-of-focus pastel gradients, in an airy high-key palette. Motion was specified with the same precision: nothing snaps; elements morph, expand, contract and flow, with elastic easing, slight scale overshoot, drawing filaments, particle rings, and transitions that dissolve into blur and reform.

**The 30 frames illustrate that brief; they did not generate it.** They are a worked example of the language applied to one product, and they are how the abstract terms got pinned to numbers — "high radius" became 28px on cards and 22px on image wells, "medium-strong blur" became a five-step ladder from 8 to 64px. Where the brief and the frames agree, the value is well founded. Where the frames show only one instance of something the brief describes generally, the system follows the brief and notes the extrapolation.

What was supplied:

- A written specification of the visual language, its motion character, and its scene content.
- **30 stills from a motion piece** — mounted read-only at `glass-design/` (`scene00001.png` … `scene01451.png`, every 50th frame). They were also uploaded to `uploads/`; that duplicate copy has since been removed, since everything measurable had been extracted. The six frames the documentation cites are kept at `assets/reference/`, named for the screen each one documents.
- **SF Pro**, **Avenir** and **Avenir Next**, and **PT Serif** font binaries. SF Pro and Avenir were later replaced by **Inter** and **Nunito Sans** so the repository can be public; see Type below.
- The unfoldingWord brand palette, voice guidelines and master logo files.
- **unfoldingWord Brand Guidelines © 2026, section 05 — Our Visual Style Guide** (`assets/reference/uw-visual-guide.pdf`). Read directly, not secondhand: the palette, logo and typography rules below are checked against it.

What was not: no code, no Figma file, no component library. Six representative frames are kept in `assets/reference/`, named for the screen they document.

**So this is a construction from a specification, checked against imagery — not a code import.** Numeric values were measured off the frames at a 390pt device width and are close, not exact; anything that exists only mid-transition is approximated and flagged in place.

## Surfaces

The system is built to carry more than one medium. What exists today, and what each is for:

| Surface | Where | Status |
|---|---|---|
| **Mobile app** (Design System tab: "Example app") | `ui_kits/travel-assistant/`, `templates/glass-app-screen`, `templates/glass-night-screen` | Derived from the source frames — the reference implementation |
| **Desktop app** | `ui_kits/desktop-console/`, `templates/glass-desktop-shell` | Extrapolated: the same material at desktop density, built from **core primitives only** |
| **Presentations** | `slides/`, `templates/brand-deck` | Extrapolated: brand-surface slide language in Nunito Sans |
| **Motion graphics** | `motion/reel.html`, `tokens/motion.css`, `guidelines/motion-*.card.html` | Derived: a 29-second reel of the six-beat source flow, plus the tokens, keyframes and live specimens |

**Derived vs extrapolated matters.** The mobile surface and the motion reel trace to observed frames. The desktop and slide surfaces do not — they apply the same language to layouts the frames never showed. That is a legitimate use of a design language and exactly what one is for, but it is inference rather than evidence. If you have real desktop screens or a real deck, send them and I will correct these against the originals.

The desktop console is deliberately domain-neutral and imports nothing from the travel example. It exists to prove the material generalises: same fill ladder, same Ocean shadows, same Inspire accents, at 13px body text and tighter radii instead of 15px and full pills.

## The example product

The source frames show a single application, and this system reconstructs it in full as `ui_kits/travel-assistant/`. **It is an example, not the point.** The system is the glass material, the token set and the core primitives; the travel assistant is the worked example that proves them at screen scale and gives consumers something real to read.

One product, one surface: an iOS concept app (390×844) where an AI travel assistant answers in *cards*, not paragraphs. The flow in the frames runs:

1. **Home** — morning greeting over a gradient blob field, floating flight card, composer.
2. **Flight expanded** — the card grows a destination photograph, cities and duration; a particle ring below it offers to continue.
3. **Chat** — the flight card recedes and dims, the assistant asks a question, the keyboard damps up.
4. **Branch** — the answer arrives as a photo card on a filament, which forks into two category tiles (Nature / Nightlife).
5. **Spot detail** — a full-bleed dark editorial screen for the chosen place.
6. **Map** — a near-black route overlay with glowing nodes, hairline roads and a stop list.

## Logo

The logo combines a stylized **book mark** — two curved, overlapping pages suggesting an open Bible turning a page — with the **unfoldingWord wordmark** (lowercase `u`, capital `W`, no space). The mark uses a vertical gradient from **Ocean** (`#014263`) at the top to **Inspire** (`#31ADE3`) at the bottom, with a darker right-hand page giving it depth.

**Lockups available** (`assets/logo/`):

- `logo-horizontal-color.png` — primary, full colour
- `logo-horizontal-reversed.png` — for use on dark and photographic backgrounds
- `logo-horizontal-black.png` / `logo-horizontal-white.png` — one-colour
- `logo-vertical-color.png` — stacked variant for square spaces
- `logo-mark-color.png` / `logo-mark-black.png` — mark-only (favicon, social avatar, watermark)

**Minimum sizes** (p46): horizontal logo never below 1.15″ (≈110px @ 96dpi); stacked never below 1″ (≈96px). The mark-only is fine smaller.

**One-colour use** (p47). The primary logo carries a gradient and overlapping colours in the icon, so it does not reduce to one colour. Where only one colour is possible, use the purpose-drawn one-colour logo — and only ever in **black, white, or Inspire**. No other one-colour treatment is permitted, including Ocean.

**Colour variations** (p48). Full colour goes on lighter backgrounds; white and reversed go on darker ones. Contrast is the deciding factor, not preference.

**Standing alone** (p49–50). Neither the wordmark by itself nor the mark by itself is a complete representation of the brand. Either may appear only where the full lockup is already present in the context — footers, watermarks, favicons, social avatars.

**What the guide does not specify.** There is no clear-space or exclusion-zone rule in section 05 — minimum size is the only spatial constraint given. Treat generous margin as house style, not brand law.

**On glass specifically.** The one rule this system adds: never place a lockup directly on an unblurred aurora field, where the field's own colour moves underneath it. Either sit it on a glass plate — `--glass-fill-2` with the standard hairline and inner top light — or on a flat brand surface (`--paper-100`, `--uw-ocean`). Under `data-theme="dark"` the reversed lockup replaces the full-colour one. See `guidelines/brand-logo-horizontal.card.html` and `guidelines/brand-logo-mark.card.html`.

### Colour, as specified

The five brand colours, verbatim from p51. Hex is authoritative for digital; Pantone and CMYK are carried here so print work stays consistent with the same source.

| Token | Name | Hex | Pantone C | CMYK |
| --- | --- | --- | --- | --- |
| `--uw-tech` | Tech | `#231F20` | Neutral Black C | 70 / 67 / 64 / 74 |
| `--uw-ocean` | Ocean | `#014263` | 7694 C | 100 / 73 / 38 / 26 |
| `--uw-inspire` | **Inspire** ⭐ | `#31ADE3` | 298 C | 68 / 13 / 0 / 0 |
| `--uw-cultivate` | Cultivate | `#70C9CC` | 630 C | 53 / 0 / 22 / 0 |
| `--uw-kindle` | Kindle | `#E59D33` | 7563 C | 9 / 42 / 92 / 0 |

Inspire is the primary brand colour — the guide marks it with an asterisk and nothing else. Every hue in this system derives from these five.

One discrepancy worth knowing: p51 lists Kindle's RGB as 230/157/52 but its hex as `#E59D33`, which is 229/157/51. The hex is what the digital system uses.

### Type, as specified

The guide names three faces and nothing more: **Avenir Black** for headings, **Avenir Book** for digital body, **PT Serif** for printed long-form. It gives no sizes, no tracking and no line heights — only a hierarchy example (p56) showing a tracked-out uppercase eyebrow above body copy. The numeric scale in this system is therefore measured off the source renders, not specified by brand. Avenir is a commercial Monotype face; this repository ships the brand guide's own designated fallback, Nunito Sans, under the SIL Open Font License.

### Angles and opacity layers

The guide's one compositional motif (p59) is angled blocks of brand colour laid over photography at **70% opacity**, with angles kept consistent across a design. **This system does not use it**, and that is deliberate: the unfoldingWord design system removed it at brand's request, and angled opaque wedges are the opposite of the glass material. Recorded here so the omission reads as a decision rather than an oversight.

### The wordmark in copy

- **The brand is always written `unfoldingWord`** — lowercase `u`, capital `W`, one word, no space. Never "Unfoldingword", "Unfolding Word", or "UnfoldingWord".
- **`unfoldingWord®`** — the registered trademark symbol appears in formal contexts. In running editorial copy it is typically dropped after first mention.
- "Generative Glass" is the name of this design language, not a product or a sub-brand. It never appears as a lockup and never sits beside the unfoldingWord logo as though it were a partner mark.

---

## Content fundamentals

**Voice.** Calm, second-person, and short. The product speaks to one named person and never about itself. There is no assistant persona, no "I", no "Let me help you with that" — the closest it gets is a question: *"Amelia, you just landed in Tokyo. What's first?"*

**Casing.** Sentence case everywhere, with two exceptions: category labels and place labels are uppercase at 9px with 0.14em tracking (`NATURE`, `NIGHTLIFE`, `VIEW SPOT`, `TOKYO SKYTREE`), and airport/flight codes stay as-is (`JFK`, `HND`, `FY8722`).

**Length.** Titles are two lines at most (*"Good morning, / Amelia"*, *"Best places / in Tokyo"*). Supporting copy is one sentence, never two: *"A relaxed route for your first day."* The longest string in the entire flow is the spot-detail body, and it is 12 words: *"Neon streets, quiet temples, and the city that never fully sleeps."*

**Suggestions** read like something a person would say out loud, not a menu item: *"Help me beat jet lag"*, *"Ramen spots nearby"*, *"Local etiquette tips for Japan"*, *"Tokyo beyond the guidebook"*. Verb-first or noun-phrase, never a question mark, never title case.

**Labels** are the shortest true thing. `Open`. `Route`. `Your flight today`. `Best places to visit`. `Wed, Apr 23`. `8 h 10m` (note the space before the `h`, and no space before the `m` — copied from the frames).

**No emoji anywhere.** No exclamation marks. No em-dashes. No product names in copy. Numbers are numerals, times are 24-hour (`22:30`, `06:20`) except the status bar, which is always `9:41`.

---

## Visual foundations

### Colour

Airy and high-key. The palette is four families:

- **unfoldingWord brand** (`--uw-inspire / ocean / tech / cultivate / kindle`) — the five source colours. Everything below is derived from them; no hue enters the system that is not traceable to one.

  Two elements are deliberately exempt, both because the source frames mandate them: the **assistant orb** on the home screen is a dark iridescent violet sphere (`Shell.jsx`), and the **airline mark** inside the flight card is a real carrier's livery (`BranchScreen.jsx`). Both read as rendered objects sitting on the glass rather than as UI chrome, so neither is rebranded. Everything else is.

  The brand is not a layer on top of the glass — it is the glass. `--ink-700` **is** Ocean, so body copy is literally a brand colour. Shadows are cast in Ocean rather than neutral grey. The paper neutrals are pulled toward Cultivate. The aurora blobs are the brand hues at pastel weight, close enough to still read as themselves through frosted surfaces. Focus glows are Inspire, active glows Cultivate. The night surfaces and the map are Ocean carried down to black. Wherever a neutral was close to a brand colour, it became that brand colour.
- **Ink** (`--ink-900` → `--ink-200`) — Ocean pulled down to a near-black that still reads blue through frosted white. Pure black is never used on light surfaces.
- **Paper** (`--paper-000` → `--paper-400`) — the studio environment behind the glass.
- **Aurora** (`--aurora-lavender / peach / sky / lemon / blush / mint`) — heavily blurred pastel blobs that live *behind* glass and bleed through it. Each is a brand colour opened up: sky and lavender from Inspire and Ocean, mint from Cultivate, peach and lemon from Kindle. These are never used as a fill, a border, or a text colour.
- **Accents** — four uses in the whole flow, one brand colour each: `--accent-blue` (Inspire) on the seat badge, `--accent-deep` (Ocean) on links and the avatar, `--accent-warm` (Kindle) on the active map pin, `--accent-teal` (Cultivate) as the glow at the top of the map. `--accent-red` survives as a deprecated alias pointing at Kindle — uW has no red. That is the entire accent budget; treat any fifth use as a mistake.
- **Night** (`--night-900` → `--night-600`, `--night-map`) — the two dark screens.

Saturated colour only ever arrives via photography.

### Type

Set in **Inter Display / Inter** (SIL Open Font License; the source frames were SF Pro, and Inter is its open analogue: Display for 19px and up, Inter for text). Scale: hero 28/1.16 medium at −0.02em; card title 19/1.24 semibold at −0.015em; body 15; label 13 medium; caption 12; micro 10; overline 9 uppercase at 0.14em. Weights used: 400, 500, 600, 700 — nothing lighter than regular, nothing heavier than bold. Tracking is negative at display sizes and positive only on the overline.

Two families, two jobs. **Inter** is the product UI type: what every component renders, standing in for the SF Pro the source frames were set in. **Nunito Sans** is unfoldingWord's brand voice type, reserved for brand headlines, marketing surfaces and logo lockups; it is the brand guide's designated fallback for Avenir and ships as one variable file with a full weight axis, so `--font-brand` and `--font-brand-display` share a stack. Per the brand guide's Avenir roles: headings at 900 (the Black role), body at 400 (Book), subheadings at 500 uppercase in Inspire (Medium). `--font-brand-serif` is PT Serif, for long-form print body only. Do not mix the two families inside one surface: a product screen is Inter throughout, a brand page is Nunito Sans throughout.

The real binaries are in the system: eight weights (400/500/600/700 in both Inter Display and Inter) live in `assets/fonts/`, declared in `tokens/fonts.css`. `--font-core` leads with Display, `--font-text` with Text, `--font-numeric` is Display only. Apple's licence covers use on Apple platforms and design work for them — check it before shipping the binaries on a public site.

### Dark theme

The system ships a complete dark option in `tokens/theme-dark.css`. Put `data-theme="dark"` on `<html>` or on any subtree and every semantic alias re-points: text inverts to white/`--on-night-*`, the four-step glass fill ladder becomes smoked glass (`rgba(20,22,27,.42)` → `rgba(11,13,16,.92)`), white hairlines drop to 12% and 7%, the inner top light drops from 75% to 10%, shadows switch from navy to black at roughly four times the alpha, and the aurora goes subterranean — the same six blobs in teal, indigo and plum at low alpha over map black. Base palette tokens (`--ink-*`, `--paper-*`, `--night-*`) are never redefined; only the aliases move.

Components need no changes to go dark — they read the aliases. The accent blue lifts to `--accent-blue-soft` so it survives on near-black; red and teal hold. The UI kit's Dark toggle demonstrates the whole flow in both themes.

### Layout

18px screen gutter, 18px card padding, 10px between stacked glass surfaces, 8px between pills. Content is bottom-weighted: the home screen's greeting sits at the optical top third and the whole card stack is pinned to the bottom. Two elements are fixed: the status bar and the composer row. Suggestion pills deliberately bleed off both screen edges — they are a drifting field, not a grid.

### Glass

Four fill steps (`--glass-fill-1` .28 → `-4` .78 white) and five blur steps (8 → 64px), always with `saturate(160%)`. Every glass surface carries three things at once: a 0.5px white hairline border, an inset white top edge (`--inner-top`), and a faint prismatic sheen across the top-left/bottom-right diagonal (`--refraction`). Never stack more than two glass levels — in the frames it is always *glass over aurora*, not glass over glass.

Blur is used when a surface must float over content it does not own. It is never used decoratively on a flat background.

### Depth

Shadows are always multi-layer, wide, and near-neutral (`--shadow-rest` / `-card` / `-float`): a 1–4px contact shadow, a 14–22px form shadow, and a 40–120px ambient. There is no single hard drop shadow in the system. Dark screens use `--shadow-night`, which is the same idea at 45% black.

### Corners

Nothing has a sharp corner. Keys 6, small tiles 14, category tiles 18, image wells 22, cards 28, sheets 34, and everything interactive — buttons, inputs, chips, FABs, avatars — is a full pill.

### Cards

A card is: fill level 2, strong blur, 28px radius, 0.5px white border, `--shadow-card`, inner top light. Photo cards put the image in a 22px-radius well inset 10px from the card edge, *or* run it full-bleed with a bottom protection gradient (`rgba(10,22,40,0)` → `.92`). Text on imagery always sits on a gradient, never on a solid bar or a capsule.

### Motion

Organic and viscous. `--ease-liquid` (.22,1,.36,1) is the default; `--ease-swell` (.34,1.56,.64,1) adds the small overshoot on entry; `--ease-damp` for the keyboard and sheets; `--ease-flow` for path drawing. Durations run 140ms for micro-feedback up to **1100ms for a morph** — transitions are meant to be watched. Cards rise from a point with a blur-to-sharp reveal (`gg-rise`), floating elements breathe on a 6s loop (`gg-float`), particle rings pulse on 4.5s (`gg-breathe`), and the aurora drifts over 22s (`gg-drift`). Nothing snaps, nothing bounces hard, nothing fades linearly.

#### Choreography

Transitions are sequenced, not simultaneous. Every screen change in the source follows the same three-beat shape: **what is leaving softens, what connects draws, what arrives rises.** Nothing appears without something pointing at where it came from.

- **Home → flight expanded.** The card does not swap; it grows. Height and the photo well animate together over `--dur-morph` (600ms), the arc extends and the duration caption fades in behind it at `--dur-base`. The suggestion pills below slide down and out at `--dur-fast` with a blur, clearing room before the card finishes.
- **Flight → chat.** The flight card recedes: scale to ~0.94, opacity to ~0.5, blur 6px, all on `--ease-liquid`. Only once it has settled does the assistant line fade up. The keyboard is the only element in the system that uses `--ease-damp` — it slides 300px over `--dur-slow` and stops dead, no overshoot.
- **Chat → branch.** Three beats in order: the filament draws from the parent card downward (`gg-draw`, `--ease-flow`, ~700ms), then the destination card rises at its end (`gg-rise` with `--ease-swell`), then the two category tiles fork out from the filament's split, staggered ~90ms apart. Never all three at once.
- **Branch → spot.** The chosen tile expands to full bleed while everything else dissolves — siblings blur out and fade rather than sliding off. The tile's image scales from its crop to the hero crop over `--dur-morph`; the eyebrow and title fade in during the last third.
- **Spot → map.** A cross-dissolve through black, then the map roads draw with `gg-draw` while the place dots pop in staggered by distance from the user puck. The route list rises last.

#### Recoil

A press and its result are one motion, not two beats. The pressed surface squashes very slightly — `--recoil-squash` is a non-uniform `scaleX(1.014) scaleY(.962)`, so the glass reads as displaced rather than shrunk — over `--dur-recoil` (110ms), then rebounds past rest and settles on `--ease-settle` (.16,.84,.24,1). The morph it triggers starts on the same frame: `--delay-morph` is `0ms`. There is no handoff to perceive, because the two never separate — the squash is simply how the surface looks in the first tenth of a second of growing. Content inside an expanding surface arrives 120ms after the morph begins, rising a few pixels as it fades in.

The token exists so it can be dialed up deliberately (a deliberate two-beat acknowledgement, e.g. a destructive confirm), not as the default. Anything above about 60ms reads as two animations played back to back.

Use `--t-recoil` for the press and `--t-morph-after-recoil` for whatever it triggers; `gg-recoil` runs the squash-and-rebound alone for elements that acknowledge a tap without changing size. `guidelines/motion-recoil.card.html` is tappable and shows the timing.

Two rules hold across all of them: a particle ring precedes anything that is about to expand (it is the system's "loading" and its "tap here" at once), and a card never moves and changes size in different curves — position and scale share one ease so the motion reads as a single body of liquid.

Everything above is written into `tokens/motion.css` as tokens and keyframes; `guidelines/motion-in-play.card.html` runs the four loops live.

### States

- **Hover** — lift 1px, brighten 4%, and on icon buttons add the soft white glow (`--glow-focus`). Never a darker colour, never a border change.
- **Press** — scale to 0.972. No colour change.
- **Focus** — a diffuse white glow, not a hard ring.
- **Disabled** — does not appear in the source; use 40% opacity and document it if you need one.

### Imagery

Muted jewel tones, cinematic, cool-to-neutral grade: cherry blossom against a blue-grey Fuji, teal-and-crimson neon Tokyo, a blue-hour city skyline. No grain, no duotone, no illustration, no iconographic art. Photos are always cropped portrait or 16:9 inside a rounded well and always sit under a gradient when they carry text. Four extracted from the frames live in `assets/img/`.

---

## Iconography

**The source contains no icon set** — the frames are renders, so every glyph is baked into a pixel. What is observable: all icons are **stroke-only, ~1.7px, round caps and joins, on a 24px grid**, monochrome, and never filled, never boxed, never coloured. The glyphs that actually appear are mic, plus, chevron-left, chevron-right, navigation (send / route), bookmark, minimize-corners, a crescent moon (overnight flight), and an up-right arrow in the tile corner. The keyboard uses the iOS system shift and delete glyphs.

> **Icon substitution — please confirm.** No extractable icon assets exist, so the system ships **Lucide** (MIT, lucide.dev) outlines, which match the observed stroke weight and cap style. They are inlined in `components/icons/Icon.jsx` — 16 glyphs, no CDN dependency. If you own a real icon set, send it and I will replace the map.

**Logo mark as icon.** The mark from `assets/logo/logo-mark-color.png` is the brand's most-used "icon" — favicon, social avatar, watermark on imagery, and standalone glyph in footers. On glass it sits on a `--glass-fill-2` plate rather than directly on the aurora.

Emoji are never used. Unicode characters are used as icons in exactly one place: the degree sign in `28°`. Airline marks are the only pictorial exception, and they appear as a small circular badge, never inline with text.

---

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | Root entry — `@import` list only. Consumers link this one file. |
| `tokens/` | `fonts` · `colors` · `typography` · `spacing` · `radius` · `elevation` · `glass` · `motion` · `theme-dark` |
| `components/glass/` | GlassSurface, GlassButton, GlassIconButton, GlassInput, GlassChip, DotRing, Filament, AuroraField, StatusBar |
| `components/icons/` | Icon (28 Lucide glyphs) |
| `ui_kits/travel-assistant/` | Mobile: six-screen click-through recreation — see its own README |
| `ui_kits/travel-assistant/components/` | The example app's own components: `travel/` (Avatar, WeatherPill, RouteArc, FlightCard, SuggestionPill, DestinationCard, CategoryTile) and `night/` (SpotHero, NightActionBar, RouteList, MapCanvas) |
| `ui_kits/desktop-console/` | Desktop: sidebar, toolbar, list and inspector, built from core primitives only |
| `templates/glass-app-screen/` | Template: a 390×844 glass app screen composed from the published components |
| `templates/glass-night-screen/` | Template: the same app screen under `data-theme="dark"` |
| `templates/glass-desktop-shell/` | Template: a 1360×840 desktop window — sidebar, toolbar, content area, inspector rail |
| `templates/brand-deck/` | Template: the five-slide presentation |
| `thumbnail.html` | The system's tile on the project homepage |
| `guidelines/` | Foundation specimen cards (Colors, Type, Glass, Spacing, Motion, Brand) |
| `assets/logo/` | The seven unfoldingWord master lockups — horizontal (colour / reversed / black / white), vertical, mark (colour / black) |
| `assets/fonts/` | Inter and Inter Display (400/500/600/700 each), Nunito Sans (one variable file, 200–1000), PT Serif (4 styles), and five Noto script fallbacks (Arabic, Nastaliq Urdu, Devanagari, Bengali, Myanmar, one variable file each); every family SIL Open Font License, licence texts beside the files |
| `assets/img/` | Photography extracted from the frames |
| `assets/reference/` | Six annotated source frames |
| `slides/` | Example presentation — five slide types plus `deck.html` (print/export source) |
| `SKILL.md` | Agent-Skills entry point |

### Components

The inventory splits in two. **Reach for the core layer for any product**; treat the example layer as a worked demonstration of the material — read it to see how the primitives combine, copy from it freely, but do not assume a consumer needs a `FlightCard`.

**Core — the material and its primitives.** Product-agnostic; this is the system. Everything under `components/`:
`GlassSurface`, `GlassButton`, `GlassIconButton`, `GlassInput`, `GlassChip`, `DotRing`, `Filament`, `AuroraField` (the ambient backdrop every glass screen needs), `StatusBar` (device chrome) in `components/glass/`, and `Icon` in `components/icons/`.

**Example app — an AI travel assistant.** These carry a product domain, so they live *with* the example that uses them, under `ui_kits/travel-assistant/components/`, not in the system's component library:
`Avatar`, `WeatherPill`, `RouteArc`, `FlightCard`, `SuggestionPill`, `DestinationCard`, `CategoryTile` (`…/components/travel/`), and the dark-surface set `SpotHero`, `NightActionBar`, `RouteList`, `MapCanvas` (`…/components/night/`). They are still compiled into the bundle and reachable on the namespace — the location signals intent, not availability.

The rule of thumb: if it is in `components/`, it is the system and you should use it. If it is under `ui_kits/`, it is a worked example — read it for pattern, not for parts. The example layer is also where domain naming lives — nothing in `components/glass/` mentions flights, maps or destinations.

Each has a sibling `.d.ts` (props contract) and `.prompt.md` (what & when, usage, variants).

### Slides

`slides/` holds an example presentation in the brand's slide language: title, section divider, metrics, two-column and quote. Each slide is a standalone 1280×720 HTML file registered as a card; `slides/deck.html` concatenates all five for viewing, printing and PowerPoint export. `slides/deck.css` carries the shared chrome.

Slides are **brand surfaces**, so they set in Nunito Sans throughout — 900 for headlines, 500 uppercase in Inspire for eyebrows, 400 for body — while product UI stays on Inter. Headlines use `--font-brand-display`; since Nunito Sans is a single variable family the two brand tokens now resolve identically, and the display token is kept so a future face with separate display cuts slots in without touching call sites. Any 800/900 type in this system must use the display token. The aurora field is the default background; section dividers invert to the Ocean-black night surface with `data-theme="dark"`. Glass cards on slides use the same `--glass-fill-2` + strong blur + Ocean shadow recipe as the app.

### Intentional additions

- **`Icon`** — the source defines no icon component, but every screen needs glyphs. Added as a thin wrapper over a fixed Lucide map so consumers never inline path data.
- **`AuroraField`** — the background is a material, not a screen; extracting it keeps the aurora consistent and prevents each screen re-rolling its own gradient.

Everything else maps one-to-one onto something visible in the frames.

## Open questions

1. ~~Real brand name, wordmark and app icon~~ — resolved: the unfoldingWord master lockups are in `assets/logo/`.
2. ~~Licensed typeface~~ — resolved twice: SF Pro was supplied, then replaced by Inter (SIL Open Font License) on 2026-09-29 so the public repository redistributes nothing it may not.
3. An icon set, if one exists.
   Type is fully resolved and fully redistributable: Inter, Nunito Sans and PT Serif are all in `assets/fonts/`, each under the SIL Open Font License with its licence text beside it (`Inter-OFL.txt`, `NunitoSans-OFL.txt`, `PTSerif-OFL.txt`). Scripts they do not cover fall to Noto families at the end of every stack, per glyph: Noto Sans Arabic, Noto Nastaliq Urdu, Noto Sans Devanagari, Noto Sans Bengali and Noto Sans Myanmar ship as variable files (about 3.4 MB together, each with its OFL text); Noto Sans SC is named in the stack but not shipped, since it is 18 MB and both platforms provide a CJK system face. `--font-script` carries the list; `--font-script-urdu` puts Nastaliq first for the Urdu locale.
4. Whether the product has surfaces beyond this one flow (settings, onboarding, account) — none are shown.
