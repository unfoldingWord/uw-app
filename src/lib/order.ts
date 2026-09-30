export function compareText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

const leadingPublisher = 'unfoldingWord';

export function comparePublishers(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  if (left === leadingPublisher) {
    return -1;
  }
  if (right === leadingPublisher) {
    return 1;
  }
  const folded = compareText(left.toLowerCase(), right.toLowerCase());
  return folded === 0 ? compareText(left, right) : folded;
}
