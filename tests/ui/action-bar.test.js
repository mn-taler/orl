import { describe, expect, it, vi } from 'vitest';
import { createDeleteActionBar, createEditorActionBar } from '../../src/ui/action-bar.js';

describe('action bars', () => {
  it('should reuse CANCEL and SAVE for editors', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const bar = createEditorActionBar(onSave, onCancel);
    const buttons = [...bar.querySelectorAll('button')];
    expect(buttons.map((button) => button.textContent)).toEqual(['CANCEL', 'SAVE']);
    buttons[0].click();
    buttons[1].click();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should reuse Cancel and Delete for confirm', () => {
    const onDelete = vi.fn();
    const bar = createDeleteActionBar(onDelete, vi.fn());
    expect([...bar.querySelectorAll('button')].map((button) => button.textContent)).toEqual([
      'CANCEL',
      'DELETE',
    ]);
    bar.querySelector('.tree-link-bar-delete').click();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
