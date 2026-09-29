export type CubicBezier = readonly [number, number, number, number];

export type Border = { width: number; style: 'solid'; color: string };

export type ShadowLayer = {
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  spreadDistance: number;
  color: string;
  inset: boolean;
};

export type LegacyShadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export type Rgba = { red: number; green: number; blue: number; alpha: number };

const varReference = /var\((--[a-z0-9-]+)\)/g;

export function resolveReferences(
  name: string,
  table: Readonly<Record<string, string>>,
  trail: readonly string[] = [],
): string {
  const raw = table[name];
  if (raw === undefined) {
    throw new Error(`${[...trail, name].join(' -> ')} is not a token`);
  }
  if (trail.includes(name)) {
    throw new Error(`${[...trail, name].join(' -> ')} refers to itself`);
  }
  return raw.replace(varReference, (_match, reference: string) =>
    resolveReferences(reference, table, [...trail, name]),
  );
}

function fail(kind: string, value: string): never {
  throw new Error(`'${value}' is not a ${kind}`);
}

export function parsePx(value: string): number {
  const match = /^(-?\d*\.?\d+)(px)?$/.exec(value.trim());
  if (match?.[1] === undefined || (match[2] === undefined && Number(match[1]) !== 0)) {
    return fail('px length', value);
  }
  return Number(match[1]);
}

export function parseEm(value: string): number {
  const match = /^(-?\d*\.?\d+)em$/.exec(value.trim());
  return match?.[1] === undefined ? fail('em length', value) : Number(match[1]);
}

export function parseNumber(value: string): number {
  const trimmed = value.trim();
  return /^-?\d*\.?\d+$/.test(trimmed) ? Number(trimmed) : fail('number', value);
}

export function parseDurationMs(value: string): number {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value.trim());
  if (match?.[1] === undefined) {
    return fail('duration', value);
  }
  return match[2] === 's' ? Number(match[1]) * 1000 : Number(match[1]);
}

export function parseCubicBezier(value: string): CubicBezier {
  const match = /^cubic-bezier\(([^)]*)\)$/.exec(value.trim());
  const parts = match?.[1]?.split(',').map((part) => parseNumber(part)) ?? [];
  const [x1, y1, x2, y2] = parts;
  if (parts.length !== 4 || x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
    return fail('cubic-bezier easing', value);
  }
  return [x1, y1, x2, y2];
}

export function parsePercentFactor(value: string, functionName: string): number {
  const pattern = new RegExp(`^${functionName}\\((\\d*\\.?\\d+)%\\)$`);
  const match = pattern.exec(value.trim());
  return match?.[1] === undefined ? fail(`${functionName}() percentage`, value) : Number(match[1]) / 100;
}

export function parseTransformFunctions(value: string): Record<string, number> {
  const functions: Record<string, number> = {};
  for (const match of value.trim().matchAll(/([a-zA-Z]+)\(([^)]*)\)/g)) {
    const [, name, argument] = match;
    if (name === undefined || argument === undefined) {
      continue;
    }
    functions[name] = argument.trim().endsWith('px') ? parsePx(argument) : parseNumber(argument);
  }
  if (Object.keys(functions).length === 0) {
    return fail('transform', value);
  }
  return functions;
}

export function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of value) {
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    }
    if (character === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim() !== '') {
    parts.push(current.trim());
  }
  return parts;
}

export function parseBorder(value: string): Border {
  const [width, style, ...color] = splitTopLevel(value, ' ');
  if (width === undefined || style !== 'solid' || color.length !== 1 || color[0] === undefined) {
    return fail('border', value);
  }
  return { width: parsePx(width), style, color: color[0] };
}

function isColor(part: string): boolean {
  return /^(#|rgba?\()/.test(part);
}

export function parseShadow(value: string): ShadowLayer[] {
  if (value.trim() === 'none') {
    return [];
  }
  return splitTopLevel(value, ',').map((layer) => {
    const parts = splitTopLevel(layer, ' ');
    const color = parts.find(isColor);
    const inset = parts.includes('inset');
    const lengths = parts.filter((part) => part !== 'inset' && !isColor(part)).map(parsePx);
    const [offsetX, offsetY, blurRadius = 0, spreadDistance = 0] = lengths;
    if (color === undefined || offsetX === undefined || offsetY === undefined || lengths.length > 4) {
      return fail('box-shadow layer', layer);
    }
    return { offsetX, offsetY, blurRadius, spreadDistance, color, inset };
  });
}

export function parseRgba(value: string): Rgba {
  const hex = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
  if (hex?.[1] !== undefined) {
    const digits = hex[1];
    return {
      red: parseInt(digits.slice(0, 2), 16),
      green: parseInt(digits.slice(2, 4), 16),
      blue: parseInt(digits.slice(4, 6), 16),
      alpha: 1,
    };
  }
  const functional = /^rgba?\(([^)]*)\)$/.exec(value.trim());
  const channels = functional?.[1]?.split(',').map(parseNumber) ?? [];
  const [red, green, blue, alpha = 1] = channels;
  if (red === undefined || green === undefined || blue === undefined || channels.length > 4) {
    return fail('colour', value);
  }
  return { red, green, blue, alpha };
}

export function legacyShadow(layers: readonly ShadowLayer[]): LegacyShadow {
  const outset = layers.filter((layer) => !layer.inset);
  const form = outset[Math.min(1, outset.length - 1)];
  if (form === undefined) {
    return {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    };
  }
  const { red, green, blue, alpha } = parseRgba(form.color);
  return {
    shadowColor: `rgb(${red},${green},${blue})`,
    shadowOffset: { width: form.offsetX, height: form.offsetY },
    shadowOpacity: alpha,
    shadowRadius: form.blurRadius / 2,
    elevation: Math.round(form.offsetY),
  };
}

export function parseFontStack(value: string): string[] {
  return splitTopLevel(value, ',').map((family) => family.replace(/^["']|["']$/g, ''));
}

export type FontShorthand = { weight: number; size: number; lineHeight: number; stack: string[] };

export function parseFontShorthand(value: string): FontShorthand {
  const match = /^(\d+) (\d*\.?\d+px)\/(\d*\.?\d+) (.+)$/.exec(value.trim());
  if (
    match?.[1] === undefined ||
    match[2] === undefined ||
    match[3] === undefined ||
    match[4] === undefined
  ) {
    return fail('font shorthand', value);
  }
  return {
    weight: Number(match[1]),
    size: parsePx(match[2]),
    lineHeight: Number(match[3]),
    stack: parseFontStack(match[4]),
  };
}

export function blurIntensity(radiusPx: number, heaviestPx: number): number {
  if (heaviestPx <= 0) {
    return 0;
  }
  return Math.round((Math.min(radiusPx, heaviestPx) / heaviestPx) * 100);
}

export function camelCaseToken(name: string): string {
  return name.replace(/^--/, '').replace(/-([a-z0-9])/g, (_match, next: string) => next.toUpperCase());
}
