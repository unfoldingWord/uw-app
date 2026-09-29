import { stableJson } from '../json';
import type { Db, Files } from '../ports';
import { contentsOf } from './contents';
import { createLibrary } from './library';
import { assembleArticle, assembleMovements, assembleStory } from './reading';
import { loadEntries, loadTitles } from './tables';
import type { Article, Contents, Movements, Story } from './types';

export type CorpusView = {
  contents(language: string): Promise<Contents>;
  story(number: number, language: string): Promise<Story | undefined>;
  movements(story: number, language: string): Promise<Movements | undefined>;
  article(id: string, language: string): Promise<Article | undefined>;
};

export function corpusView(files: Files, db: Db): CorpusView {
  const library = createLibrary(files);
  const known = new Map<string, string>();

  const sync = async (): Promise<void> => {
    const entries = await loadEntries(db);
    const titles = await loadTitles(db);
    const current = new Set(entries.map((entry) => entry.root));
    const gone = [...known.keys()].filter((root) => !current.has(root));
    library.remove(gone);
    gone.forEach((root) => known.delete(root));
    const changed = entries.filter((entry) => known.get(entry.root) !== stableJson(entry));
    library.put(
      changed,
      titles.filter((title) => changed.some((entry) => entry.root === title.root)),
    );
    changed.forEach((entry) => known.set(entry.root, stableJson(entry)));
  };

  return {
    contents: async (language) => {
      await sync();
      return contentsOf(library, language);
    },
    story: async (number, language) => {
      await sync();
      return assembleStory(library, number, language);
    },
    movements: async (story, language) => {
      await sync();
      return assembleMovements(library, story, language);
    },
    article: async (id, language) => {
      await sync();
      return assembleArticle(library, id, language);
    },
  };
}
