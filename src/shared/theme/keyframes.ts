import { parseNumber, parsePx, splitTopLevel } from './convert';

export type KeyframeValues = {
  opacity?: number;
  translateX?: number;
  translateY?: number;
  translateXPercent?: number;
  translateYPercent?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  blur?: number;
};

export type Keyframe = { offset: number; values: KeyframeValues };

const offsetKeywords: Record<string, number> = { from: 0, to: 1 };

function parseOffset(text: string): number {
  const keyword = offsetKeywords[text];
  if (keyword !== undefined) {
    return keyword;
  }
  const match = /^(\d*\.?\d+)%$/.exec(text);
  if (match?.[1] === undefined) {
    throw new Error(`'${text}' is not a keyframe offset`);
  }
  return Number(match[1]) / 100;
}

function applyTranslate(values: KeyframeValues, axis: 'X' | 'Y', argument: string): void {
  if (argument.endsWith('%')) {
    values[`translate${axis}Percent`] = parseNumber(argument.slice(0, -1));
  } else {
    values[`translate${axis}`] = parsePx(argument);
  }
}

function applyTransform(values: KeyframeValues, transform: string, variables: Record<string, string>): void {
  const expanded = transform.replace(/var\((--[a-z0-9-]+)\)/g, (_match, name: string) => {
    const value = variables[name];
    if (value === undefined) {
      throw new Error(`${name} is not a token`);
    }
    return value;
  });
  if (expanded === 'none') {
    return;
  }
  for (const match of expanded.matchAll(/([a-zA-Z0-9]+)\(([^)]*)\)/g)) {
    const [, name, argument = ''] = match;
    const args = argument.split(',').map((part) => part.trim());
    if (name === 'translateY') {
      applyTranslate(values, 'Y', args[0] ?? '0');
    } else if (name === 'translateX') {
      applyTranslate(values, 'X', args[0] ?? '0');
    } else if (name === 'translate3d') {
      applyTranslate(values, 'X', args[0] ?? '0');
      applyTranslate(values, 'Y', args[1] ?? '0');
    } else if (name === 'scale') {
      values.scale = parseNumber(args[0] ?? '1');
    } else if (name === 'scaleX') {
      values.scaleX = parseNumber(args[0] ?? '1');
    } else if (name === 'scaleY') {
      values.scaleY = parseNumber(args[0] ?? '1');
    } else {
      throw new Error(`${name}() is not a supported keyframe transform`);
    }
  }
}

function parseDeclarations(body: string, variables: Record<string, string>): KeyframeValues {
  const values: KeyframeValues = {};
  for (const declaration of splitTopLevel(body, ';')) {
    const colon = declaration.indexOf(':');
    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (property === 'opacity') {
      values.opacity = parseNumber(value);
    } else if (property === 'transform') {
      applyTransform(values, value, variables);
    } else if (property === 'filter') {
      const blur = /^blur\(([^)]*)\)$/.exec(value)?.[1];
      if (blur === undefined) {
        throw new Error(`'${value}' is not a supported keyframe filter`);
      }
      values.blur = parsePx(blur);
    } else {
      throw new Error(`${property} is not a supported keyframe property`);
    }
  }
  return values;
}

export function parseKeyframes(raw: string, variables: Record<string, string> = {}): Keyframe[] {
  const frames: Keyframe[] = [];
  for (const match of raw.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selector = '', body = ''] = match;
    const values = parseDeclarations(body, variables);
    for (const offset of selector.split(',').map((part) => parseOffset(part.trim()))) {
      frames.push({ offset, values });
    }
  }
  return frames.sort((first, second) => first.offset - second.offset);
}
