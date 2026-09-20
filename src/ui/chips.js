import { createTagRemoveIcon } from './dom.js';

export function createTagChip(tag, onRemove) {
  const entry = typeof tag === 'string' ? { name: tag } : tag;
  const chip = document.createElement('span');
  chip.className = onRemove ? 'tag-chip' : 'tag-chip tag-chip-static';
  if (entry.colorLight) chip.style.setProperty('--tag-chip-light', entry.colorLight);
  if (entry.colorDark) chip.style.setProperty('--tag-chip-dark', entry.colorDark);

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
