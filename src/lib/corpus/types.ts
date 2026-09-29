import type { RowId } from '../burrito/flavors';
import type { Provenance } from '../domain/provenance';

export type Sourced = { readonly provenance: Provenance };

export type Direction = 'ltr' | 'rtl';

export type Reading = 'literal' | 'simplified' | 'original';

export type TextChoice = 'literal' | 'simplified';

export type CorpusKind =
  | Reading
  | 'notes'
  | 'wordLinks'
  | 'questions'
  | 'words'
  | 'academy'
  | 'stories'
  | 'storyNotes'
  | 'storyQuestions'
  | 'storyWordLinks'
  | 'movements'
  | 'audio'
  | 'images';

export type CorpusBurrito = {
  readonly root: string;
  readonly row: RowId;
  readonly publisher: string;
  readonly resource: string;
  readonly language: string;
  readonly tag: string;
  readonly commit: string;
  readonly bytes: number;
};

export type CorpusSource = {
  readonly pack: string;
  readonly burritos: readonly CorpusBurrito[];
};

export type LinkTarget =
  | { readonly kind: 'article'; readonly id: string }
  | { readonly kind: 'passage'; readonly reference: string }
  | { readonly kind: 'story'; readonly story: number };

export type Inline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'emphasis'; readonly children: readonly Inline[] }
  | { readonly kind: 'strong'; readonly children: readonly Inline[] }
  | { readonly kind: 'link'; readonly children: readonly Inline[]; readonly target?: LinkTarget };

export type Block =
  | { readonly kind: 'heading'; readonly level: number; readonly children: readonly Inline[] }
  | { readonly kind: 'paragraph'; readonly children: readonly Inline[] }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly (readonly Block[])[] }
  | { readonly kind: 'quote'; readonly children: readonly Block[] };

export type OriginalWord = {
  readonly content: string;
  readonly lemma: string;
  readonly strong: string;
  readonly occurrence: number;
  readonly occurrences: number;
};

export type Token =
  | {
      readonly kind: 'word';
      readonly index: number;
      readonly text: string;
      readonly original: readonly OriginalWord[];
    }
  | { readonly kind: 'text'; readonly text: string };

export type Verse = {
  readonly chapter: number;
  readonly verse: number;
  readonly through?: number;
  readonly text: string;
  readonly tokens: readonly Token[];
};

export type WordSpan = {
  readonly chapter: number;
  readonly verse: number;
  readonly tokens: readonly number[];
};

export type PassageText = Sourced & {
  readonly reading: Reading;
  readonly book: string;
  readonly bookName: string;
  readonly direction: Direction;
  readonly verses: readonly Verse[];
};

export type Note = Sourced & {
  readonly id: string;
  readonly reference: string;
  readonly quote: string;
  readonly occurrence: number;
  readonly blocks: readonly Block[];
  readonly support?: LinkTarget;
  readonly words: readonly WordSpan[];
};

export type WordLink = Sourced & {
  readonly id: string;
  readonly reference: string;
  readonly original: string;
  readonly occurrence: number;
  readonly article: string;
  readonly title?: string;
  readonly words: readonly WordSpan[];
};

export type Question = Sourced & {
  readonly id: string;
  readonly reference: string;
  readonly question: string;
  readonly response: string;
};

export type AudioClip = Sourced & {
  readonly book: string;
  readonly chapter: number;
  readonly path: string;
  readonly mimeType: string;
};

export type Passage = {
  readonly reference: string;
  readonly language: string;
  readonly text: PassageText;
  readonly availableTexts: readonly TextChoice[];
  readonly notes: readonly Note[];
  readonly wordLinks: readonly WordLink[];
  readonly questions: readonly Question[];
  readonly audio: readonly AudioClip[];
};

export type PassageOptions = { readonly language: string; readonly text?: TextChoice | 'original' };

export type ArticleKind = 'word' | 'academy';

export type Article = Sourced & {
  readonly id: string;
  readonly kind: ArticleKind;
  readonly title: string;
  readonly subtitle?: string;
  readonly blocks: readonly Block[];
  readonly related: readonly string[];
};

export type StoryImage = Sourced & { readonly name: string; readonly path: string };

export type Frame = Sourced & {
  readonly number: number;
  readonly text: string;
  readonly imageName?: string;
  readonly image?: StoryImage;
};

export type StoryNote = Sourced & {
  readonly id: string;
  readonly frame: number;
  readonly quote: string;
  readonly blocks: readonly Block[];
};

export type StoryQuestion = Sourced & {
  readonly id: string;
  readonly frame: number;
  readonly question: string;
  readonly response: string;
};

export type StoryWordLink = Sourced & {
  readonly id: string;
  readonly frame: number;
  readonly words: string;
  readonly article: string;
  readonly title?: string;
};

export type Story = Sourced & {
  readonly number: number;
  readonly language: string;
  readonly title: string;
  readonly direction: Direction;
  readonly frames: readonly Frame[];
  readonly bibleReference: string;
  readonly references: readonly string[];
  readonly notes: readonly StoryNote[];
  readonly questions: readonly StoryQuestion[];
  readonly wordLinks: readonly StoryWordLink[];
};

export type MovementSectionId =
  | 'key-idea'
  | 'creedal-verse'
  | 'summary'
  | 'observation'
  | 'translation'
  | 'discourse'
  | 'theological'
  | 'journal'
  | 'drafting'
  | 'checking'
  | 'conclusion';

export type MovementSection = {
  readonly id: MovementSectionId;
  readonly title: string;
  readonly blocks: readonly Block[];
};

export type Movements = Sourced & {
  readonly story: number;
  readonly language: string;
  readonly sections: readonly MovementSection[];
};

export type TitleKind = ArticleKind | 'story';

export type TitleHit = Sourced & {
  readonly kind: TitleKind;
  readonly title: string;
  readonly target: LinkTarget;
};

export type SearchResults = {
  readonly reference?: { readonly reference: string; readonly available: boolean };
  readonly titles: readonly TitleHit[];
};

export type FullTextHit = Sourced & { readonly target: LinkTarget; readonly snippet: string };

export type IndexCost = { readonly entries: number; readonly bytes: number };

export type IndexStatus = { readonly built: boolean; readonly entries: number; readonly bytes: number };

export type BookContents = { readonly code: string; readonly chapters: readonly number[] };

export type TextContents = Sourced & { readonly reading: Reading; readonly books: readonly BookContents[] };

export type ArticleEntry = { readonly id: string; readonly title: string };

export type Contents = {
  readonly language: string;
  readonly texts: readonly TextContents[];
  readonly words: readonly ArticleEntry[];
  readonly academy: readonly ArticleEntry[];
  readonly stories: readonly { readonly number: number; readonly title: string }[];
  readonly movements: readonly number[];
  readonly audio: readonly { readonly book: string; readonly chapter: number }[];
};

export type KindSummary = {
  readonly burritos: number;
  readonly items: number;
  readonly publishers: readonly string[];
};

export type CorpusSummary = Readonly<Partial<Record<CorpusKind, KindSummary>>>;
