export function bindDisclosure(toggle, panel) {
  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });
}

export function fillSelect(select, values, selected) {
  const current = values.includes(selected) ? selected : '';
  select.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'All';
  select.appendChild(all);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value.toUpperCase();
    select.appendChild(option);
  });
  select.value = current;
  return current;
}

export function svgIcon(attrs, inner) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  Object.entries(attrs).forEach(([key, value]) => svg.setAttribute(key, value));
  svg.appendChild(inner);
  return svg;
}

export function createTreeArrow() {
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', '9 18 15 12 9 6');
  return svgIcon({
    class: 'tree-arrow',
    viewBox: '0 0 24 24',
    width: '16',
    height: '16',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  }, polyline);
}

export function createSelectCaret() {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M2.5 4.5L6 8l3.5-3.5');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  return svgIcon({
    class: 'tag-select-caret',
    viewBox: '0 0 12 12',
    width: '12',
    height: '12',
    'aria-hidden': 'true',
  }, path);
}

export function createEditIcon() {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.75');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  return svgIcon({
    viewBox: '0 0 24 24',
    width: '18',
    height: '18',
    'aria-hidden': 'true',
  }, path);
}

export function createTrashIcon(size = 18) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.75');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  return svgIcon({
    viewBox: '0 0 24 24',
    width: String(size),
    height: String(size),
    'aria-hidden': 'true',
  }, path);
}

export function createPlusIcon() {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M12 5v14M5 12h14');
  return svgIcon({
    class: 'tree-add-plus',
    viewBox: '0 0 24 24',
    width: '16',
    height: '16',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.5',
    'stroke-linecap': 'round',
    'aria-hidden': 'true',
  }, path);
}

export function createCloseIcon() {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M18 6L6 18M6 6l12 12');
  return svgIcon({
    viewBox: '0 0 24 24',
    width: '18',
    height: '18',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.5',
    'stroke-linecap': 'round',
    'aria-hidden': 'true',
  }, path);
}

export function createCheckIcon() {
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', '20 6 9 17 4 12');
  return svgIcon({
    viewBox: '0 0 24 24',
    width: '18',
    height: '18',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  }, polyline);
}

export function createTagRemoveIcon() {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M2 2l8 8M10 2L2 10');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.75');
  path.setAttribute('stroke-linecap', 'round');
  return svgIcon({
    viewBox: '0 0 12 12',
    width: '10',
    height: '10',
    'aria-hidden': 'true',
  }, path);
}
