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
