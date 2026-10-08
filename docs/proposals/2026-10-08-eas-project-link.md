# EAS project link and first release version

Status: approved through the decision in issue #44 and on PR #76 (2026-10-08).
`app.config.*` and `package.json` are shared roots (AGENTS.md rule 4), so this records what changed in them and why.
No rule is broken, so there is no entry in `docs/exceptions.md`.

## Problem

- **#44.** `.github/workflows/release.yml` runs `eas build --non-interactive`, which refuses a project with no
  `extra.eas.projectId`. The unfoldingWord Expo organization holds the project `@unfoldingword/uw-app`
  (id `047f36eb-f4b6-46a5-8668-ea6088f77d8f`). `eas init --id` cannot write to a dynamic `app.config.ts`, and
  with the id set by hand EAS rejects the config while its `slug` (`unfoldingword`) differs from the project's
  (`uw-app`) and while no `owner` names the organization (observed with `eas project:info`).
- The config and `package.json` said `1.0.0`, but the first tagged release is a pre-1.0 build.

## Change

- `app.config.ts`: `extra.eas.projectId` is `047f36eb-f4b6-46a5-8668-ea6088f77d8f`, `slug` is `uw-app` and
  `owner` is `unfoldingword`. `scheme` stays `unfoldingword`, so deep links do not change. `version` is `0.0.1`.
- `package.json` and the root of `package-lock.json`: `version` is `0.0.1`, matching the first tag `v0.0.1`.
- `README.md`: the release note names the linked project instead of the `eas init` step.
- `EXPO_TOKEN` is a repository secret set by a human; nothing is stored in the repository.

## Alternatives

- **Renaming the Expo project's slug to `unfoldingword`.** Keeps the config slug but changes a record owned by the
  Expo organization, outside this repository and its review.
- **A static `app.json` so `eas init` can write the id.** The config is computed from environment variables
  (installer build, locale gate) and plugins, so it stays dynamic.
- **Starting at `1.0.0`.** The milestone the PRD calls v1.0.0 is not yet reached; semantic versioning puts the
  first builds below 1.0.

## Rules affected

- Rule 4: `app.config.ts` and `package.json` are shared roots, changed here under the issue #44 decision.
- The "v1.0.0" in the PRD, ADRs and README names the release scope, not the build version, and is unchanged.
