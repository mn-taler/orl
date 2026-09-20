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
    option.textContent = value;
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
    width: '14',
    height: '14',
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
    width: '10',
    height: '10',
    'aria-hidden': 'true',
  }, path);
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
