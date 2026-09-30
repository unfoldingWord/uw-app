import { referenceValues } from './referenceValues';

export type RingPoint = { x: number; y: number; opacity: number };

export function dotRingPoints(size: number, rings: number, dots: number): RingPoint[] {
  const { innerBand, innerDensity, bandTwist, fade } = referenceValues.dotRing;
  const points: RingPoint[] = [];
  const steps = Math.max(1, rings - 1);
  for (let ring = 0; ring < rings; ring += 1) {
    const reach = (size / 2) * (innerBand + (1 - innerBand) * (ring / steps));
    const count = Math.round(dots * (innerDensity + (1 - innerDensity) * (ring / steps)));
    for (let dot = 0; dot < count; dot += 1) {
      const angle = (dot / count) * Math.PI * 2 + ring * bandTwist;
      points.push({
        x: size / 2 + Math.cos(angle) * reach,
        y: size / 2 + Math.sin(angle) * reach,
        opacity: fade + (1 - fade) * (1 - ring / rings),
      });
    }
  }
  return points;
}

export function filamentPath(height: number, width: number, branch: boolean): string {
  const { branchInset, bend, straightWidth } = referenceValues.filament;
  const span = branch ? width : straightWidth;
  const middle = span / 2;
  if (!branch) {
    return `M 1 0 L 1 ${height}`;
  }
  const [out, back] = bend;
  const curve = (end: number): string =>
    `M ${middle} 0 C ${middle} ${height * out}, ${end} ${height * back}, ${end} ${height}`;
  return `${curve(branchInset)} ${curve(span - branchInset)}`;
}
