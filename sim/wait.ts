export async function until(condition: () => boolean, turns = 1000): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) {
    if (condition()) {
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error(`the condition did not hold within ${turns} turns`);
}
