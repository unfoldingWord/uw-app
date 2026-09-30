(() => {
  const selector =
    '[role=button],[role=link],[role=switch],[role=checkbox],[role=radio],[role=tab],[role=menuitem],button,a[href],input,textarea,select';
  const nameOf = (element) => {
    const label = element.getAttribute('aria-label');
    if (label !== null && label.trim() !== '') {
      return label.trim();
    }
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy !== null) {
      const text = labelledBy
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ')
        .trim();
      if (text !== '') {
        return text;
      }
    }
    return (element.innerText ?? element.textContent ?? '').trim();
  };
  const controls = [];
  for (const element of document.querySelectorAll(selector)) {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (box.width === 0 || box.height === 0 || style.visibility === 'hidden' || style.display === 'none') {
      continue;
    }
    if (element.closest('[aria-hidden=true]') !== null) {
      continue;
    }
    const slopOf = (name) => 2 * Number(element.getAttribute(name) ?? 0);
    controls.push({
      role: element.getAttribute('role') ?? element.tagName.toLowerCase(),
      name: nameOf(element),
      width: Math.round(box.width + slopOf('data-touch-slop-h')),
      height: Math.round(box.height + slopOf('data-touch-slop-v')),
    });
  }
  const escaped = [];
  for (const element of document.querySelectorAll('div[dir]')) {
    const parent = element.parentElement;
    if (parent === null || element.closest('[aria-hidden=true]') !== null) {
      continue;
    }
    const inner = element.getBoundingClientRect();
    const outer = parent.getBoundingClientRect();
    if (inner.width === 0 || inner.height === 0) {
      continue;
    }
    const by = Math.max(
      outer.top - inner.top,
      inner.bottom - outer.bottom,
      outer.left - inner.left,
      inner.right - outer.right,
    );
    if (by > 1) {
      escaped.push({ text: (element.textContent ?? '').trim().slice(0, 40), by: Math.round(by) });
    }
  }
  return { controls, escaped, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
})();
