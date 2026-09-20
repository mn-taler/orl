import { describe, expect, it, vi } from 'vitest';
import { createTagChip, createTagField } from '../../src/ui/chips.js';

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

  it('should call onRemove when the X is clicked', () => {
    const onRemove = vi.fn();
    const chip = createTagChip({ name: 'Work' }, onRemove);
    chip.querySelector('.tag-chip-remove').click();
    expect(onRemove).toHaveBeenCalledWith('Work');
  });
});

describe('createTagField', () => {
  it('should render one chip per tag', () => {
    const field = createTagField([{ name: 'A' }, { name: 'B' }], () => {});
    expect(field.className).toBe('tag-field');
    expect(field.querySelectorAll('.tag-chip')).toHaveLength(2);
  });
});
