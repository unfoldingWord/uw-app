export type FieldSpan = { readonly top: number; readonly bottom: number };

export function keyboardOverlap(frameBottom: number | undefined, keyboardTop: number | undefined): number {
  if (frameBottom === undefined || keyboardTop === undefined) {
    return 0;
  }
  return Math.max(0, frameBottom - keyboardTop);
}

export function revealDistance(field: FieldSpan, keyboardTop: number, gap: number, frameTop: number): number {
  const covered = field.bottom - (keyboardTop - gap);
  return Math.max(0, Math.min(covered, field.top - frameTop));
}
