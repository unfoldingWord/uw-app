(() => {
  globalThis.__name = (target) => target;
  const harness = globalThis.uwQaHarness ?? {};
  globalThis.uwQaVariant = harness.variant;
  const zoom = Number(harness.textZoom ?? 1);
  const apply = () => {
    if (document.documentElement !== null) {
      document.documentElement.dir = harness.direction ?? 'ltr';
    }
    if (zoom !== 1 && document.head !== null && document.getElementById('uw-qa-text-zoom') === null) {
      const style = document.createElement('style');
      style.id = 'uw-qa-text-zoom';
      style.textContent = 'div[dir], input, textarea { zoom: ' + String(zoom) + '; }';
      document.head.appendChild(style);
    }
  };
  apply();
  document.addEventListener('DOMContentLoaded', apply);
})();
