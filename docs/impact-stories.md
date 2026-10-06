# Impact stories: what ships, what the feed must be, what comms must review

PA-6 asks for a small set of impact stories carried from unfoldingWord's website, fetched when online, cached
for offline, with at least one shipped in every release so the partner invitation (PA-2) never appears
without one. Words are in [`CONTEXT.md`](../CONTEXT.md). The code is `src/lib/partners/`.

Evidence labels: **checked** means read in this repository on 2026-09-29; **inference** means reasoned;
**open** means a person has to decide or supply it.

## Awaiting communications review before release

1. **The shipped story's body is a placeholder written by an agent**, not the website's text. The
   environment that built it could not reach unfoldingword.org, so the story was not read. The body in
   `shippedStories` (`src/lib/partners/stories.ts`) says only what the PRD and the story's address say:
   Jeremiah is part of a church-planting work in Chad, and the story is about Open Bible Stories translated
   into Chadian Arabic. It invents no names, places, events or quotes, and it points to the full account.
   Comms should replace it with the short body they want, in the brand's impact-story tone (reverent, human,
   grounded, centred on the people in the story).
   - Title: Jeremiah and the Occult King
   - Link: https://unfoldingword.org/africa/when-jeremiah-first-heard-that-his-chadian-church-planting/
   - Slug (journaled in `ImpactStoryOpened`): `jeremiah-and-the-occult-king`
2. **The security note is not the website's note.** PA-6 asks for the website's security note, verbatim.
   It was not available, so the shipped story's `securityNote` in `shippedStories` holds a placeholder written
   by an agent ("Names in this story are changed for security."). Comms must replace it with the website's
   note for this story, verbatim (issue #49). There is no fallback string: a story shows a security note only
   when its record carries one, and a feed story without `securityNote` shows none.
3. **The shipped story has no image.** PA-6 says each story has an image. None ships, because no image was
   available that is cleared for use (PRD section 12: no images of people in sensitive contexts). Comms
   should choose one to ship with the app and be referenced from the shipped story.

## The feed (open)

The feed address is not decided. The app reads `impactStoriesFeedUrl` in `src/lib/partners/stories.ts`,
today `https://unfoldingword.org/app/impact-stories.json` (**open**: an address the comms team must publish
or replace). The host is on the allowlist (`src/lib/network.ts`). The shape the app accepts (**checked** in
`parseFeed` and its tests):

```json
{
  "stories": [
    {
      "slug": "lower-case-words-with-hyphens",
      "title": "Up to 160 characters",
      "body": ["One to twelve paragraphs, each up to 2000 characters."],
      "link": "https://unfoldingword.org/...",
      "image": "https://unfoldingword.org/...",
      "securityNote": "Carried verbatim, up to 400 characters."
    }
  ]
}
```

- `link` and `image` must be https on unfoldingword.org; a story that is not is dropped.
- At most twenty stories are read. A slug seen twice keeps the first.
- The feed leads; a shipped story the feed does not carry stays after it. A feed story with a shipped
  story's slug replaces it.
- The image is downloaded beside (`partners/staging/`), then renamed over `partners/images/<slug>`, and
  shown from the phone offline.
- A feed that is not this shape fails with `partners.invalid-feed` and keeps the cached stories.
- Refresh is a command the screen calls when online (`partners.refresh()`), journaled as
  `ImpactStoriesRefreshStarted` and `ImpactStoriesRefreshed`, or a `Failure` with step `impact-stories`.

## The invitation schedule (inference where marked)

- **Region**: the United States when the Locale port's time zone is a US zone and its region is `US` or
  unknown (`src/lib/partners/region.ts`). No location permission. Both signals are needed, as PA-2 and
  decision 22 say: a US locale in another time zone is not the United States, a locale region outside the
  US vetoes a US time zone, and an unknown region does not veto (decision 97, **checked** in
  `PA-2.invitation-schedule.ts` and `partners.test.ts`).
- **First shown** on the fifth distinct day of use, counted from `AppOpened` days with the journal
  baseline, so dropped events do not reset it.
- **Dismissed**: hidden for ninety days from the dismissal, then due again on the same rule, as a new
  cycle (**inference**: "every three months" is read as ninety days after the leader dismissed it; the PRD
  does not say whether the three months run from the dismissal or from first showing).
- **Tapped**: counted (`InvitationTapped`, telemetry `invitationTaps`) and ends the cycle: `tap()` also
  journals `InvitationDismissed`, so the ninety days of quiet start from the tap (issue #56).
- **Never modal**: the service hands Home a card; nothing in the kernel can show it over content. That the
  screen renders it as a card is for the Home screen to prove (T10).
