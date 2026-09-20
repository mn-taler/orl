import { describe, expect, it, vi } from 'vitest';
import { createOverflowTagRow, createTagChip, createTagField, layoutOverflowTags } from '../../src/ui/chips.js';

describe('createTagChip', () => {
  it('should render a static chip with palette colors', () => {
    const chip = createTagChip({
      name: 'Work',
      colorLight: '#1c51ba',
      colorDark: '#2e6be5',
    });
    expect(chip.className).toContain('tag-chip-static');
    expect(chip.textContent).toBe('Work');
    expect(chip.style.getPropertyValue('--tag-chip-light')).toBe('#1c51ba');
    expect(chip.querySelector('.tag-chip-remove')).toBeNull();
  });

  it('should ignore non-hex chip colors', () => {
    const chip = createTagChip({
      name: 'Work',
      colorLight: 'url(https://evil.example)',
      colorDark: 'red',
    });
    expect(chip.style.getPropertyValue('--tag-chip-light')).toBe('');
    expect(chip.style.getPropertyValue('--tag-chip-dark')).toBe('');
  });

  it('should call onRemove when the X is clicked', () => {
    const onRemove = vi.fn();
    const chip = createTagChip({ name: 'Work' }, onRemove);
    chip.querySelector('.tag-chip-remove').click();
    expect(onRemove).toHaveBeenCalledWith('Work');
  });
});

describe('createTagField', () => {
  it('should render one static chip per tag without a remove button', () => {
    const field = createTagField([{ name: 'A' }, { name: 'B' }]);
    expect(field.className).toBe('tag-field');
    expect(field.querySelectorAll('.tag-chip')).toHaveLength(2);
    expect(field.querySelectorAll('.tag-chip-static')).toHaveLength(2);
    expect(field.querySelector('.tag-chip-remove')).toBeNull();
  });
});

describe('layoutOverflowTags', () => {
  function mockWidth(el, width) {
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(el, 'offsetWidth', { configurable: true, value: width });
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ width });
  }

  it('should keep every chip when they all fit', () => {
    const row = createOverflowTagRow([{ name: 'A' }, { name: 'B' }]);
    document.body.appendChild(row);
    mockWidth(row, 200);
    [...row.querySelectorAll('.tag-chip')].forEach((chip) => mockWidth(chip, 40));
    expect(layoutOverflowTags(row)).toEqual({ visible: 2, hidden: 0 });
    expect(row.querySelector('.tree-link-tags-more').hidden).toBe(true);
    row.remove();
  });

  it('should hide overflow chips and show a +N count', () => {
    const row = createOverflowTagRow([{ name: 'Alpha' }, { name: 'Bravo' }, { name: 'Charlie' }]);
    document.body.appendChild(row);
    mockWidth(row, 100);
    [...row.querySelectorAll('.tag-chip')].forEach((chip) => mockWidth(chip, 50));
    const more = row.querySelector('.tree-link-tags-more');
    mockWidth(more, 24);
    expect(layoutOverflowTags(row)).toEqual({ visible: 1, hidden: 2 });
    expect(more.hidden).toBe(false);
    expect(more.textContent).toBe('+2');
    expect([...row.querySelectorAll('.tag-chip')].map((chip) => chip.hidden)).toEqual([false, true, true]);
    expect(layoutOverflowTags(row)).toEqual({ visible: 1, hidden: 2 });
    row.remove();
  });
});
