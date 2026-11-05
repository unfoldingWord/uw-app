let openings = 0;

export function nextOpening(): string {
  openings += 1;
  return String(openings);
}

export function requestKey(reference: string | undefined, opening: string | undefined): string {
  return JSON.stringify([reference ?? null, opening ?? null]);
}
