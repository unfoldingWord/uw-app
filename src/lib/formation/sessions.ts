import type { CorpusView } from '../corpus/view';
import type { MovementSection, MovementSectionId, Movements, Story } from '../corpus/types';
import { sessionMovements } from '../domain/events';
import { languagePackId } from '../domain/pack';
import { questionsOf } from './questions';
import type {
  EnglishMovements,
  FormationContent,
  FoundationsSession,
  MovementLayer,
  OutlinePart,
  Session,
  SessionMovement,
  SessionOptions,
  Track,
  TrackSummary,
  TrainingOutline,
  TrainingSession,
  TrainingUnit,
} from './types';

const englishLanguage = 'en';

const closingSections: readonly MovementSectionId[] = ['drafting', 'checking', 'conclusion'];

function sectionOf(movements: Movements, id: MovementSectionId): MovementSection | undefined {
  return movements.sections.find((section) => section.id === id);
}

function formationOf(movements: Movements): FormationContent {
  const sessionMovementsFound: SessionMovement[] = sessionMovements.flatMap((id) => {
    const section = sectionOf(movements, id);
    return section === undefined
      ? []
      : [{ id, title: section.title, blocks: section.blocks, questions: questionsOf(section.blocks) }];
  });
  const keyIdea = sectionOf(movements, 'key-idea');
  const creedalVerse = sectionOf(movements, 'creedal-verse');
  const summary = sectionOf(movements, 'summary');
  return {
    language: movements.language,
    provenance: movements.provenance,
    ...(keyIdea === undefined ? {} : { keyIdea }),
    ...(creedalVerse === undefined ? {} : { creedalVerse }),
    ...(summary === undefined ? {} : { summary }),
    movements: sessionMovementsFound,
    closing: closingSections.flatMap((id) => sectionOf(movements, id) ?? []),
  };
}

function outlineOf(formation: FormationContent | undefined, studyQuestions: boolean): OutlinePart[] {
  if (formation === undefined) {
    return ['frames', 'study-questions'];
  }
  const afterFrames: OutlinePart[] = studyQuestions ? ['frames', 'study-questions'] : ['frames'];
  const opening: OutlinePart[] = [];
  if (formation.keyIdea !== undefined) {
    opening.push('key-idea');
  }
  if (formation.creedalVerse !== undefined) {
    opening.push('creedal-verse');
  }
  if (formation.summary !== undefined) {
    opening.push('summary');
  }
  return [
    ...opening,
    ...afterFrames,
    ...formation.movements.map((movement) => movement.id),
    ...formation.closing.map((section) => section.id),
  ];
}

async function englishFor(
  view: CorpusView,
  story: number,
  options: SessionOptions,
): Promise<EnglishMovements> {
  if (options.englishAlongside !== true) {
    return { state: 'off' };
  }
  const english = await view.movements(story, englishLanguage);
  if (english !== undefined) {
    return { state: 'shown', formation: formationOf(english) };
  }
  const contents = await view.contents(englishLanguage);
  return contents.movements.length > 0
    ? { state: 'not-in-english' }
    : { state: 'needs-download', language: englishLanguage, pack: languagePackId(englishLanguage) };
}

async function foundationsSession(
  view: CorpusView,
  number: number,
  language: string,
  options: SessionOptions,
): Promise<FoundationsSession | undefined> {
  const story: Story | undefined = await view.story(number, language);
  if (story === undefined) {
    return undefined;
  }
  const own = await view.movements(number, language);
  const clip = await view.storyAudio(number, language);
  const layer: MovementLayer =
    own === undefined
      ? { state: 'not-in-language', english: await englishFor(view, number, options) }
      : { state: 'in-language', formation: formationOf(own) };
  const shown =
    layer.state === 'in-language'
      ? layer.formation
      : layer.english.state === 'shown'
        ? layer.english.formation
        : undefined;
  return {
    track: 'foundations',
    number,
    language,
    outline: outlineOf(shown, layer.state === 'not-in-language' && story.questions.length > 0),
    story,
    play: {
      frames: story.frames,
      audio: clip === undefined ? { state: 'not-available' } : { state: 'available', clip },
    },
    movements: layer,
  };
}

async function trainingSession(
  view: CorpusView,
  number: number,
  language: string,
): Promise<TrainingSession | undefined> {
  const entry = (await view.contents(language)).academy[number - 1];
  const article = entry === undefined ? undefined : await view.article(entry.id, language);
  return article === undefined ? undefined : { track: 'training', number, language, article };
}

export function assembleSession(
  view: CorpusView,
  track: Track,
  number: number,
  language: string,
  options: SessionOptions,
): Promise<Session | undefined> {
  if (!Number.isSafeInteger(number) || number < 1) {
    return Promise.resolve(undefined);
  }
  switch (track) {
    case 'foundations':
      return foundationsSession(view, number, language, options);
    case 'training':
      return trainingSession(view, number, language);
    case 'topics':
      return Promise.resolve(undefined);
  }
}

function manualOf(id: string): string {
  return id.split('/')[1] ?? '';
}

export async function trainingOutlineOf(view: CorpusView, language: string): Promise<TrainingOutline> {
  const contents = await view.contents(language);
  const units = new Map<string, TrainingUnit>();
  contents.academy.forEach((entry, index) => {
    const manual = manualOf(entry.id);
    const lesson = { number: index + 1, title: entry.title, id: entry.id };
    const unit = units.get(manual);
    if (unit !== undefined) {
      units.set(manual, { ...unit, lessons: [...unit.lessons, lesson] });
      return;
    }
    const title = contents.manuals.find((item) => item.manual === manual)?.title ?? manual;
    units.set(manual, { manual, title, lessons: [lesson] });
  });
  return { lessons: contents.academy.length, units: [...units.values()] };
}

export async function trackSummaries(view: CorpusView, language: string): Promise<TrackSummary[]> {
  const contents = await view.contents(language);
  const summaries: TrackSummary[] = [
    {
      track: 'foundations',
      sessions: contents.stories.length,
      movements: contents.movements.length > 0 ? 'in-language' : 'not-in-language',
    },
    { track: 'training', sessions: contents.academy.length },
    { track: 'topics', sessions: 0 },
  ];
  return summaries.filter((summary) => summary.track !== 'topics' || summary.sessions > 0);
}

export async function sessionTitle(
  view: CorpusView,
  track: Track,
  number: number,
  language: string,
): Promise<string | undefined> {
  if (track === 'foundations') {
    return (await view.contents(language)).stories.find((story) => story.number === number)?.title;
  }
  if (track === 'training') {
    return (await view.contents(language)).academy[number - 1]?.title;
  }
  return undefined;
}

export async function sessionCount(view: CorpusView, track: Track, language: string): Promise<number> {
  const contents = await view.contents(language);
  return track === 'foundations'
    ? contents.stories.length
    : track === 'training'
      ? contents.academy.length
      : 0;
}
