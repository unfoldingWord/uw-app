import { fontFaces, type FontName } from './faces';

export type Script = 'arabic' | 'urdu' | 'devanagari' | 'bengali' | 'myanmar';

export type FontWeightName = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export type ResolvedFont = {
  fontFamily: FontName;
  fontWeight?: FontWeightName;
  fontStyle?: 'normal' | 'italic';
};

export const scriptFamilies: Record<Script, string> = {
  arabic: 'Noto Sans Arabic',
  urdu: 'Noto Nastaliq Urdu',
  devanagari: 'Noto Sans Devanagari',
  bengali: 'Noto Sans Bengali',
  myanmar: 'Noto Sans Myanmar',
};

type Face = (typeof fontFaces)[number];

function weightRange(face: Face): [number, number] {
  const [low, high = low] = face.weight.split(' ').map(Number);
  return [low ?? 400, high ?? 400];
}

function isVariable(face: Face): boolean {
  const [low, high] = weightRange(face);
  return low !== high;
}

function clampedWeight(weight: number, [low, high]: [number, number]): FontWeightName {
  const clamped = Math.min(high, Math.max(low, weight, 100), 900);
  return String(Math.round(clamped / 100) * 100) as FontWeightName;
}

function distance(face: Face, weight: number): number {
  const [low, high] = weightRange(face);
  return weight < low ? low - weight : weight > high ? weight - high : 0;
}

export function shippedFamilies(): string[] {
  return [...new Set(fontFaces.map((face) => face.family))];
}

export function fontFor(
  stack: readonly string[],
  weight: number,
  options: { script?: Script; italic?: boolean } = {},
): ResolvedFont | undefined {
  const style = options.italic === true ? 'italic' : 'normal';
  const families = options.script === undefined ? stack : [scriptFamilies[options.script], ...stack];
  for (const family of families) {
    const candidates = fontFaces.filter((face) => face.family === family);
    if (candidates.length === 0) {
      continue;
    }
    const styled = candidates.filter((face) => face.style === style);
    const pool = styled.length > 0 ? styled : candidates;
    const [best] = [...pool].sort((first, second) => distance(first, weight) - distance(second, weight));
    if (best === undefined) {
      continue;
    }
    const resolved: ResolvedFont = { fontFamily: best.name };
    if (isVariable(best)) {
      resolved.fontWeight = clampedWeight(weight, weightRange(best));
    }
    if (best.style === 'italic') {
      resolved.fontStyle = 'italic';
    }
    return resolved;
  }
  return undefined;
}
