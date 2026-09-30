export function rightToLeftLayout(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
}
