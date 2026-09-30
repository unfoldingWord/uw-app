import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import { modes, shots, type Mode, type Shot } from './routes';
import { harnessMoment } from './seed';

const viewport = { width: 360, height: 800 };

const minimumTarget = 44;

const pinnedChromium = '/opt/pw-browsers/chromium';

const pageInit = readFileSync(join(import.meta.dirname, 'page-init.js'), 'utf8');

const pageAudit = readFileSync(join(import.meta.dirname, 'page-audit.js'), 'utf8');

const scrollToEnd = `for (const element of document.querySelectorAll('*')) {
  const overflow = getComputedStyle(element).overflowY;
  if ((overflow === 'auto' || overflow === 'scroll') && element.scrollHeight > element.clientHeight) {
    element.scrollTop = element.scrollHeight;
  }
}`;

export type ControlFinding = {
  readonly role: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
};

export type EscapeFinding = { readonly text: string; readonly by: number };

export type ShotResult = {
  readonly shot: string;
  readonly mode: Mode['name'];
  readonly file: string;
  readonly unnamed: readonly ControlFinding[];
  readonly small: readonly ControlFinding[];
  readonly escaped: readonly EscapeFinding[];
  readonly overflow: boolean;
  readonly errors: readonly string[];
};

export async function launchBrowser(): Promise<Browser> {
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM ?? (existsSync(pinnedChromium) ? pinnedChromium : undefined);
  return chromium.launch(executablePath === undefined ? {} : { executablePath });
}

async function settle(page: Page): Promise<void> {
  await page.waitForFunction('document.body.innerText.trim().length > 0', undefined, { timeout: 20000 });
  await page.evaluate('document.fonts.ready.then(() => undefined)');
  await page.waitForTimeout(1500);
}

async function shootOne(browser: Browser, origin: string, output: string, shot: Shot, mode: Mode) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: mode.scheme,
    reducedMotion: 'reduce',
    locale: mode.browserLocale,
    timezoneId: 'UTC',
  });
  await context.clock.setSystemTime(harnessMoment);
  const variant = shot.fresh === true ? mode.freshVariant : mode.variant;
  await context.addInitScript({
    content: `globalThis.uwQaHarness = ${JSON.stringify({
      variant,
      direction: mode.direction,
      textZoom: mode.textZoom ?? 1,
    })};\n${pageInit}`,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text().slice(0, 400));
    }
  });
  page.on('pageerror', (error) => errors.push(error.message.slice(0, 400)));
  await page.goto(`${origin}${shot.path}`);
  try {
    await settle(page);
  } catch (error) {
    errors.push(`did not render: ${String(error).slice(0, 200)}`);
  }
  if (shot.press !== undefined) {
    try {
      await page.getByRole('button', { name: shot.press, exact: true }).first().click({ timeout: 5000 });
      await page.waitForTimeout(1500);
    } catch (error) {
      errors.push(`could not press ${shot.press}: ${String(error).slice(0, 160)}`);
    }
  }
  if (shot.type !== undefined) {
    try {
      await page.getByRole('textbox').first().fill(shot.type, { timeout: 5000 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
    } catch (error) {
      errors.push(`could not type ${shot.type}: ${String(error).slice(0, 160)}`);
    }
  }
  if (shot.scroll === 'end') {
    await page.evaluate(scrollToEnd);
    await page.waitForTimeout(800);
  }
  const file = join(output, `${shot.name}--${mode.name}.png`);
  await page.screenshot({ path: file });
  const audit = (await page.evaluate(pageAudit)) as {
    controls: ControlFinding[];
    escaped: EscapeFinding[];
    overflow: boolean;
  };
  await context.close();
  return {
    shot: shot.name,
    mode: mode.name,
    file,
    unnamed: audit.controls.filter((item) => item.name === ''),
    small: audit.controls.filter((item) => item.width < minimumTarget || item.height < minimumTarget),
    escaped: audit.escaped,
    overflow: audit.overflow,
    errors,
  } satisfies ShotResult;
}

export async function shootAll(options: {
  origin: string;
  output: string;
  only?: readonly string[];
  modes?: readonly string[];
}): Promise<ShotResult[]> {
  mkdirSync(options.output, { recursive: true });
  const browser = await launchBrowser();
  const results: ShotResult[] = [];
  try {
    for (const mode of modes.filter(
      (item) => options.modes === undefined || options.modes.includes(item.name),
    )) {
      const chosen = shots.filter(
        (item) =>
          (options.only === undefined || options.only.includes(item.name)) &&
          (item.modes === undefined || item.modes.includes(mode.name)),
      );
      for (const shot of chosen) {
        results.push(await shootOne(browser, options.origin, options.output, shot, mode));
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(join(options.output, 'report.json'), JSON.stringify(results, null, 2));
  return results;
}
