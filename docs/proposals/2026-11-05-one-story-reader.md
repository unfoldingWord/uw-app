# One story reader, with its shared pieces in `src/shared/story`

Status: approved by the requirements owner on 2026-11-05 ("start working on all of these"; decisions delegated
to the agent). Issues #96, #88, #89 and #97; part of #81.

## Problem

Open Bible Stories opened in two readers. Search, in-text links and Home's saved stories opened the Study story
screen (`/study/story/N`): every frame in a list, a bookmark, no audio, no frame navigation, no questions. Formation,
Groups, Training and Home's "continue" opened the Formation session (`/formation/session/foundations/N`): one frame
at a time with audio, study questions, movements and notes. Neither moved to another story, the study questions
showed as one block for the whole story, and a frame whose picture was not on the phone showed an unexplained
gradient. The prototype has one reader.

## Change

- **One reader, owned by Formation.** `src/features/formation/screens/parts/StoryReader.tsx` renders every story.
  Reading mode (`/formation/story/N`, optional `frame`) has no group position; group mode
  (`/formation/session/foundations/N`) is today's session. Search, links and Home's saved stories route to the
  reading mode with a frame anchor; Formation, Groups, Training and Home's "continue" route to the group mode. The
  Study story screen and `app/study/story/[number].tsx` are deleted. Routes may point anywhere; no service crosses
  a feature.
- **Shared story pieces** move to a new `src/shared/story/`: `PictureWell` (also used by the Formation tab's
  Foundations card), `FrameCard` and `FrameNavigation`. They take words as props and import nothing from a feature.
- **Story navigation (#88).** "Story N of 50" in the header opens the list of stories; at the first frame the
  previous-frame control becomes "Previous story", at the last frame the next-frame control becomes "Next story".
  In group mode a story the group is not at offers "Move {group} to this story?"; browsing writes no position.
- **Study questions per frame (#89).** The loader keeps a story's intro rows (`N:intro`, and `front:intro` on story
  1) with no frame. The reader shows the questions of the frame in view under the frame, and the story-level ones in
  their own card, wherever the outline shows study questions.
- **Pictures (#97).** When a frame names a picture the phone does not have, the picture well says so in place; when
  the Image Pack is in the catalog it offers "Download story pictures", which the Formation service starts with the
  same `packs.installFromCatalog(imagePackId)` that Languages → Extras uses.
- **Search anchor.** A story `LinkTarget` may carry a `frame`: links like `rc://*/obs/01/02` keep it, and the corpus
  names the first frame a full-text story hit matched.

## Alternatives

- **Keep the Study reader for reading, Formation for groups.** Rejected: two readers drift (they had already: one
  had audio, one had bookmarks), and #96 asks for one.
- **The reader in Study.** Rejected: group mode needs groups, notes, movements and the session writes, all owned by
  Formation; Study would have to reach into Formation's kernel module from its service.
- **Install the Image Pack with the first language.** Not implemented: it changes LA-3's "optional" and the first
  download size, an open product decision (see the PR).

## Rules affected

- Rule 4: `src/shared/story/` is a new folder in a shared root. It holds rendering only and imports no feature.
- Rule 2: unchanged. The reader's feature reaches the Image Pack install through its own service and the kernel,
  never through the Languages feature.
- No new durable value, event, port or dependency. Bookmarks keep their one writer (the bookmarks kernel module).
