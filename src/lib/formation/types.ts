import type {
  Article,
  AudioClip,
  Block,
  Frame,
  MovementSection,
  MovementSectionId,
  Sourced,
  Story,
} from '../corpus/types';
import type { sessionMovements, tracks } from '../domain/events';
import type { PackId } from '../domain/pack';

export type Track = (typeof tracks)[number];

export type SessionMovementId = (typeof sessionMovements)[number];

export type Position = {
  readonly track: Track;
  readonly session: number;
  readonly movement?: SessionMovementId;
};

export type Group = {
  readonly id: string;
  readonly name: string;
  readonly position: Position;
};

export type Progress = {
  readonly track: Track;
  readonly done: number;
  readonly sessions: number;
  readonly fraction: number;
  readonly finished: boolean;
};

export type MovementCoverage = 'in-language' | 'not-in-language';

export type TrackSummary =
  | { readonly track: 'foundations'; readonly sessions: number; readonly movements: MovementCoverage }
  | { readonly track: 'training' | 'topics'; readonly sessions: number };

export type SessionMovement = {
  readonly id: SessionMovementId;
  readonly title: string;
  readonly blocks: readonly Block[];
  readonly questions: readonly string[];
};

export type FormationContent = Sourced & {
  readonly language: string;
  readonly keyIdea?: MovementSection;
  readonly creedalVerse?: MovementSection;
  readonly summary?: MovementSection;
  readonly movements: readonly SessionMovement[];
  readonly closing: readonly MovementSection[];
};

export type EnglishMovements =
  | { readonly state: 'off' }
  | { readonly state: 'shown'; readonly formation: FormationContent }
  | { readonly state: 'needs-download'; readonly language: string; readonly pack: PackId }
  | { readonly state: 'not-in-english' };

export type MovementLayer =
  | { readonly state: 'in-language'; readonly formation: FormationContent }
  | { readonly state: 'not-in-language'; readonly english: EnglishMovements };

export type OutlinePart = MovementSectionId | 'frames' | 'study-questions';

export type StoryAudio =
  { readonly state: 'not-available' } | { readonly state: 'available'; readonly clip: AudioClip };

export type FoundationsSession = {
  readonly track: 'foundations';
  readonly number: number;
  readonly language: string;
  readonly outline: readonly OutlinePart[];
  readonly story: Story;
  readonly play: { readonly frames: readonly Frame[]; readonly audio: StoryAudio };
  readonly movements: MovementLayer;
};

export type TrainingSession = {
  readonly track: 'training';
  readonly number: number;
  readonly language: string;
  readonly article: Article;
};

export type Session = FoundationsSession | TrainingSession;

export type SessionOptions = { readonly englishAlongside?: boolean };

export type NextSession = {
  readonly group: string;
  readonly position: Position;
  readonly title: string;
};
