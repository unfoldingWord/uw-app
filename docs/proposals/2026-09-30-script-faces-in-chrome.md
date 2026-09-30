# Script faces in chrome and Formation text

Approved in issue #35 (the issue's fix is the decision).

## Problem

Only Study content picked a Noto script face (`contentText` in `src/features/study/screens/parts/script.ts`).
`ThemedText`, the glass button, chip and input, and the Line primitives in Settings, About and Formation used
the Inter stack with no script. React Native has no per-glyph fallback through a font stack, so in the ar, ur,
fa, hi, bn and my locales every label fell to the platform face, two Arabic faces shared a screen, and Urdu
chrome got the platform Naskh instead of Nastaliq (PRD 10.1, `--font-script-urdu`).

## Change

- `src/shared/theme/script.ts` holds the script logic for the whole app: `scriptOf` and `directionOf` (moved
  from Study), `localeScript(locale)`, `textSample(children)`, `uiText` and `uiFont` for chrome, and
  `contentText` for content. `src/features/study/screens/parts/script.ts` becomes a re-export so Study's
  imports stay unchanged.
- The theme carries the app locale (`ThemeOptions.locale`, `Theme.locale`, `ThemeProvider locale`). The root
  layout reads it through `createSettingsService(kernel).locale()` and the new `onLocale`, the same path the
  layout direction already takes, so no screen reads the kernel.
- Chrome picks the face from the characters it shows: an Arabic-script string is Noto Sans Arabic, or Noto
  Nastaliq Urdu when the app locale is Urdu; Devanagari, Bengali and Myanmar strings take their Noto face; a
  Latin string such as "unfoldingWord" stays in Inter in every locale. Children that are not text take the
  locale's script.
- Formation blocks go through `contentText` keyed on the content language, and inline emphasis and strong keep
  the script face.
- `withScript` now keeps the weight of a static face (a semibold title stayed at 400 in a script face).

## Alternatives

- Resolve every `theme.text` role with the locale script: English content under an Arabic app would be set in
  Noto Sans Arabic, which has no Latin letters.
- One script per screen from the locale only: language names in the language list and Latin names in an
  Arabic app would get the wrong face.

## Rules affected

Rule 4: `src/shared/theme`, `src/shared/glass`, `src/shared/ui` and `app/_layout.tsx` are shared roots. No
rule is broken: the locale reaches the root layout through a feature service, as the layout direction does.
