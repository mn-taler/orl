import { normalizeHexColor } from '../domain/tags.js';
import { createTagRemoveIcon } from './dom.js';

export function createTagChip(tag, onRemove) {
  const entry = typeof tag === 'string' ? { name: tag } : tag;
  const chip = document.createElement('span');
  chip.className = onRemove ? 'tag-chip' : 'tag-chip tag-chip-static';
  const light = normalizeHexColor(entry.colorLight);
  const dark = normalizeHexColor(entry.colorDark);
  if (light) chip.style.setProperty('--tag-chip-light', light);
  if (dark) chip.style.setProperty('--tag-chip-dark', dark);

  const name = document.createElement('span');
  name.className = 'tag-chip-name';
  name.textContent = entry.name;
  chip.appendChild(name);

  if (typeof onRemove !== 'function') return chip;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'tag-chip-remove';
  removeBtn.setAttribute('aria-label', `Remove tag ${entry.name}`);
  removeBtn.appendChild(createTagRemoveIcon());
  removeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(entry.name);
  });
  chip.appendChild(removeBtn);
  return chip;
}

export function createTagField(tags, onRemove) {
  const field = document.createElement('div');
  field.className = 'tag-field';
  tags.forEach((tag) => field.appendChild(createTagChip(tag, onRemove)));
  return field;
}

const overflowRows = new Set();
let overflowFrame = 0;
let resizeBound = false;

function chipWidth(el) {
  return el.offsetWidth || el.getBoundingClientRect().width;
}

function rowGap(row) {
  const styles = getComputedStyle(row);
  return Number.parseFloat(styles.columnGap || styles.gap) || 4;
}

function chipsWidth(widths, count, gap) {
  return widths.slice(0, count).reduce((sum, width, index) => (
    sum + width + (index > 0 ? gap : 0)
  ), 0);
}

export function layoutOverflowTags(row) {
  const chips = [...row.querySelectorAll('.tag-chip')];
  const more = row.querySelector('.tree-link-tags-more');
  if (!more) return { visible: chips.length, hidden: 0 };

  chips.forEach((chip) => {
    chip.hidden = false;
  });

  const available = row.clientWidth;
  if (!chips.length) {
    more.hidden = true;
    more.textContent = '';
    return { visible: 0, hidden: 0 };
  }
  if (available <= 0) {
    const tries = Number(row.dataset.overflowTries || 0);
    if (tries < 8) {
      row.dataset.overflowTries = String(tries + 1);
      requestAnimationFrame(() => layoutOverflowTags(row));
    }
    return { visible: chips.length, hidden: 0 };
  }
  row.dataset.overflowTries = '0';

  const gap = rowGap(row);
  const widths = chips.map(chipWidth);
  const allWidth = chipsWidth(widths, chips.length, gap);
  if (allWidth <= available + 0.5) {
    more.hidden = true;
    more.textContent = '';
    more.removeAttribute('title');
    more.removeAttribute('aria-label');
    return { visible: chips.length, hidden: 0 };
  }

  more.hidden = false;
  more.textContent = `+${chips.length}`;
  const moreWidth = chipWidth(more);

  let count = chips.length;
  while (count > 1) {
    const hiddenCount = chips.length - count;
    const extra = hiddenCount > 0 ? gap + moreWidth : 0;
    if (chipsWidth(widths, count, gap) + extra <= available + 0.5) break;
    count -= 1;
  }

  const hiddenCount = chips.length - count;
  chips.forEach((chip, index) => {
    chip.hidden = index >= count;
  });
  more.hidden = hiddenCount <= 0;
  more.textContent = hiddenCount > 0 ? `+${hiddenCount}` : '';
  if (hiddenCount > 0) {
    const hiddenNames = chips.slice(count).map((chip) => chip.textContent.trim());
    more.title = hiddenNames.join(', ');
    more.setAttribute('aria-label', `${hiddenCount} more tags`);
  } else {
    more.removeAttribute('title');
    more.removeAttribute('aria-label');
  }

  return { visible: count, hidden: hiddenCount };
}

function scheduleOverflowLayout() {
  if (overflowFrame) return;
  overflowFrame = requestAnimationFrame(() => {
    overflowFrame = 0;
    overflowRows.forEach((row) => {
      if (!row.isConnected) overflowRows.delete(row);
      else layoutOverflowTags(row);
    });
  });
}

function bindOverflowResize() {
  if (resizeBound || typeof window === 'undefined') return;
  resizeBound = true;
  window.addEventListener('resize', scheduleOverflowLayout);
}

export function createOverflowTagRow(tags) {
  const row = document.createElement('div');
  row.className = 'tree-link-tags';
  (tags || []).forEach((tag) => row.appendChild(createTagChip(tag)));

  const more = document.createElement('span');
  more.className = 'tree-link-tags-more';
  more.hidden = true;
  row.appendChild(more);

  overflowRows.add(row);
  bindOverflowResize();
  scheduleOverflowLayout();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (row.isConnected) layoutOverflowTags(row);
    });
    const parent = row.parentElement;
    if (!parent || typeof ResizeObserver !== 'function') return;
    let lastWidth = parent.clientWidth;
    const observer = new ResizeObserver(() => {
      if (!row.isConnected) {
        observer.disconnect();
        return;
      }
      const width = parent.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      layoutOverflowTags(row);
    });
    observer.observe(parent);
  });
  return row;
}
