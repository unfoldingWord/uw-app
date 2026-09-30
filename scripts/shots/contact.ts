import { writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Browser } from 'playwright-core';
import { modes } from './routes';
import type { ShotResult } from './shoot';

const escapeHtml = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const page = (title: string, body: string): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; --ink: #231F20; --paper: #F4FAFB; --line: #D3E7EA; --accent: #014263; --warn: #E59D33; }
@media (prefers-color-scheme: dark) { :root { --ink: #EAF4F7; --paper: #0B1A24; --line: #1E3440; --accent: #70C9CC; } }
body { margin: 0; padding: 16px; font: 13px/1.4 system-ui, sans-serif; background: var(--paper); color: var(--ink); }
h1 { font-size: 18px; color: var(--accent); margin: 0 0 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
figure { margin: 0; }
figure img { width: 100%; border-radius: 12px; border: 1px solid var(--line); display: block; }
figcaption { margin-top: 4px; font-weight: 600; overflow-wrap: anywhere; }
.note { color: var(--warn); font-weight: 500; }
</style></head><body>${body}</body></html>`;

function figure(result: ShotResult): string {
  const notes = [
    result.errors.length > 0 ? `${result.errors.length} errors` : '',
    result.unnamed.length > 0 ? `${result.unnamed.length} unnamed` : '',
    result.small.length > 0 ? `${result.small.length} small targets` : '',
    result.escaped.length > 0 ? `${result.escaped.length} escaping text` : '',
    result.overflow ? 'overflows' : '',
  ].filter((note) => note !== '');
  const file = basename(result.file);
  return `<figure><a href="${file}"><img src="${file}" alt="${escapeHtml(`${result.shot} in ${result.mode}`)}"></a>
<figcaption>${escapeHtml(result.shot)} · ${escapeHtml(result.mode)}${
    notes.length > 0 ? `<br><span class="note">${escapeHtml(notes.join(', '))}</span>` : ''
  }</figcaption></figure>`;
}

export async function writeContactSheets(
  browser: Browser,
  output: string,
  results: readonly ShotResult[],
): Promise<readonly string[]> {
  const sections = modes
    .map((mode) => ({ mode, items: results.filter((item) => item.mode === mode.name) }))
    .filter((section) => section.items.length > 0);
  const all = sections
    .map(
      (section) =>
        `<h1>${escapeHtml(section.mode.name)}</h1><div class="grid">${section.items.map(figure).join('')}</div>`,
    )
    .join('');
  writeFileSync(join(output, 'index.html'), page('Screen contact sheet', all));
  const written: string[] = [join(output, 'index.html')];
  const context = await browser.newContext({ viewport: { width: 1000, height: 800 }, colorScheme: 'light' });
  try {
    for (const section of sections) {
      const name = `contact-${section.mode.name}`;
      const html = join(output, `${name}.html`);
      writeFileSync(
        html,
        page(
          `Contact sheet ${section.mode.name}`,
          `<h1>${escapeHtml(section.mode.name)}</h1><div class="grid">${section.items.map(figure).join('')}</div>`,
        ),
      );
      const tab = await context.newPage();
      await tab.goto(`file://${html}`);
      await tab.waitForLoadState('load');
      await tab.screenshot({ path: join(output, `${name}.png`), fullPage: true });
      await tab.close();
      written.push(join(output, `${name}.png`));
    }
  } finally {
    await context.close();
  }
  return written;
}
