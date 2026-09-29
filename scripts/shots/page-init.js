(() => {
  globalThis.__name = (target) => target;
  const harness = globalThis.uwQaHarness ?? {};
  globalThis.uwQaVariant = harness.variant;
  const apply = () => {
    if (document.documentElement !== null) {
      document.documentElement.dir = harness.direction ?? 'ltr';
    }
  };
  apply();
  document.addEventListener('DOMContentLoaded', apply);
})();
