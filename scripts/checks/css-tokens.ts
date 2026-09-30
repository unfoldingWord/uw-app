export type FontFaceDeclaration = {
  family: string;
  file: string;
  weight: string;
  style: string;
  stretch: string | undefined;
  unicodeRange: string | undefined;
};

export type TokenCss = {
  root: Record<string, string>;
  dark: Record<string, string>;
  reducedMotion: Record<string, string>;
  keyframes: Record<string, string>;
  fontFaces: FontFaceDeclaration[];
};

type Block = { selector: string; body: string };

function normalizeCssValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function topLevelBlocks(css: string): Block[] {
  const blocks: Block[] = [];
  let depth = 0;
  let selectorStart = 0;
  let bodyStart = 0;
  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];
    if (character === '{') {
      if (depth === 0) {
        bodyStart = index + 1;
      }
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        blocks.push({
          selector: normalizeCssValue(css.slice(selectorStart, bodyStart - 1)),
          body: css.slice(bodyStart, index),
        });
        selectorStart = index + 1;
      }
    } else if (character === ';' && depth === 0) {
      selectorStart = index + 1;
    }
  }
  return blocks;
}

function declarations(body: string): [string, string][] {
  const result: [string, string][] = [];
  let depth = 0;
  let start = 0;
  const flush = (end: number): void => {
    const text = body.slice(start, end);
    const colon = text.indexOf(':');
    if (colon > 0) {
      result.push([normalizeCssValue(text.slice(0, colon)), normalizeCssValue(text.slice(colon + 1))]);
    }
  };
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    } else if (character === ';' && depth === 0) {
      flush(index);
      start = index + 1;
    }
  }
  flush(body.length);
  return result;
}

function customProperties(body: string): Record<string, string> {
  return Object.fromEntries(declarations(body).filter(([name]) => name.startsWith('--')));
}

function unquote(value: string): string {
  return value.replace(/^['"]|['"]$/g, '');
}

function fontFace(body: string): FontFaceDeclaration {
  const properties = Object.fromEntries(declarations(body));
  const source = properties['src'] ?? '';
  const file = /url\(["']?([^"')]+)["']?\)/.exec(source)?.[1] ?? '';
  return {
    family: unquote(properties['font-family'] ?? ''),
    file: file.split('/').pop() ?? '',
    weight: properties['font-weight'] ?? '',
    style: properties['font-style'] ?? 'normal',
    stretch: properties['font-stretch'],
    unicodeRange: properties['unicode-range'],
  };
}

function assign(target: Record<string, string>, source: Record<string, string>, scope: string): void {
  for (const [name, value] of Object.entries(source)) {
    if (name in target && target[name] !== value) {
      throw new Error(`${name} is declared twice in ${scope} with different values`);
    }
    target[name] = value;
  }
}

const reducedMotionQuery = '@media (prefers-reduced-motion:reduce)';

const atStatement = /(^|[;}])\s*(@[a-z-]+[^{;}]*);/g;

function refuseAtStatements(css: string): void {
  const found = [...css.matchAll(atStatement)].map((match) => match[2]?.trim());
  if (found.length > 0) {
    throw new Error(
      `unrecognized at-rule ${found[0] ?? ''}; the tokens check reads only @font-face, @keyframes and ${reducedMotionQuery}`,
    );
  }
}

function isKnownAtRule(selector: string): boolean {
  return selector === '@font-face' || selector.startsWith('@keyframes ') || selector === reducedMotionQuery;
}

export function parseTokenCss(files: string[]): TokenCss {
  const parsed: TokenCss = { root: {}, dark: {}, reducedMotion: {}, keyframes: {}, fontFaces: [] };
  for (const file of files) {
    const css = stripComments(file);
    refuseAtStatements(css.replace(/\{[^{}]*\}/g, '{}'));
    for (const block of topLevelBlocks(css)) {
      if (block.selector.startsWith('@') && !isKnownAtRule(block.selector)) {
        throw new Error(
          `unrecognized at-rule ${block.selector}; the tokens check reads only @font-face, @keyframes and ${reducedMotionQuery}`,
        );
      }
      if (block.selector === ':root') {
        assign(parsed.root, customProperties(block.body), ':root');
      } else if (block.selector === '[data-theme="dark"]') {
        assign(parsed.dark, customProperties(block.body), '[data-theme="dark"]');
      } else if (block.selector === '@font-face') {
        parsed.fontFaces.push(fontFace(block.body));
      } else if (block.selector.startsWith('@keyframes ')) {
        parsed.keyframes[block.selector.slice('@keyframes '.length)] = normalizeCssValue(block.body);
      } else if (block.selector === reducedMotionQuery) {
        for (const inner of topLevelBlocks(block.body)) {
          if (inner.selector === ':root') {
            assign(parsed.reducedMotion, customProperties(inner.body), 'prefers-reduced-motion');
          }
        }
      }
    }
  }
  return parsed;
}

export type RecordComparison = { missing: string[]; extra: string[]; mismatched: string[] };

export function compareRecords(
  expected: Record<string, string>,
  actual: Record<string, string>,
): RecordComparison {
  const missing = Object.keys(expected).filter((name) => !(name in actual));
  const extra = Object.keys(actual).filter((name) => !(name in expected));
  const mismatched = Object.keys(expected)
    .filter((name) => name in actual && actual[name] !== expected[name])
    .map((name) => `${name}: tokens say '${expected[name]}', theme says '${actual[name]}'`);
  return { missing, extra, mismatched };
}
