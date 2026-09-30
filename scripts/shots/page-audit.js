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
    controls.push({
      role: element.getAttribute('role') ?? element.tagName.toLowerCase(),
      name: nameOf(element),
      width: Math.round(box.width),
      height: Math.round(box.height),
    });
  }
  return { controls, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
})();
