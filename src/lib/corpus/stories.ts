import { formatReference, parseReference } from '../domain/reference';

export type ParsedFrame = { readonly number: number; readonly text: string; readonly imageName?: string };

export type ParsedStory = {
  readonly number: number;
  readonly title: string;
  readonly frames: readonly ParsedFrame[];
  readonly bibleReference: string;
  readonly references: readonly string[];
};

const storyPath = /^content\/(\d{2})\.md$/;
const imageLine = /^!\[[^\]]*\]\(([^)\s]+)[^)]*\)\s*$/;
const titleLine = /^#\s+(.*)$/;
const referenceLine = /^_(.+)_$/;
const numberedTitle = /^\d+\.\s*/;

export function storyNumberOf(path: string): number | undefined {
  const match = storyPath.exec(path);
  const story = Number(match?.[1]);
  return match !== null && story >= 1 && story <= 50 ? story : undefined;
}

export function imageNameOf(url: string): string | undefined {
  const name = url.split(/[?#]/)[0]?.split('/').at(-1);
  return name === undefined || name === '' ? undefined : name;
}

function referencesIn(line: string): string[] {
  const listed = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line;
  return listed.split(/[;,]/).flatMap((part) => {
    const parsed = parseReference(part.trim());
    return parsed.ok ? [formatReference(parsed.reference)] : [];
  });
}

export function storyTitle(markdown: string): string {
  const line = markdown.split('\n').find((candidate) => titleLine.test(candidate.trim()));
  return (titleLine.exec(line?.trim() ?? '')?.[1] ?? '').replace(numberedTitle, '').trim();
}

export function parseStory(number: number, markdown: string): ParsedStory {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const frames: ParsedFrame[] = [];
  let paragraphs: string[] = [];
  let lineBuffer: string[] = [];
  let imageName: string | undefined;
  let started = false;
  let bibleReference = '';

  const flushParagraph = (): void => {
    if (lineBuffer.length > 0) {
      paragraphs.push(lineBuffer.join(' ').trim());
      lineBuffer = [];
    }
  };
  const flushFrame = (): void => {
    flushParagraph();
    if (started && (paragraphs.length > 0 || imageName !== undefined)) {
      const text = paragraphs.join('\n\n');
      frames.push(
        imageName === undefined
          ? { number: frames.length + 1, text }
          : { number: frames.length + 1, text, imageName },
      );
    }
    paragraphs = [];
    imageName = undefined;
  };

  for (const raw of lines) {
    const line = raw.trim();
    const image = imageLine.exec(line);
    if (image) {
      flushFrame();
      started = true;
      const name = imageNameOf(image[1] ?? '');
      imageName = name;
      continue;
    }
    if (titleLine.test(line)) {
      continue;
    }
    const reference = referenceLine.exec(line);
    if (reference && started) {
      flushFrame();
      bibleReference = (reference[1] ?? '').trim();
      started = false;
      continue;
    }
    if (line === '') {
      flushParagraph();
      continue;
    }
    if (!started) {
      started = true;
    }
    lineBuffer.push(line);
  }
  flushFrame();
  return {
    number,
    title: storyTitle(markdown),
    frames,
    bibleReference,
    references: referencesIn(bibleReference),
  };
}
