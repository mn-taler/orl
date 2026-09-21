import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, TAG_PALETTE } from '../../src/config.js';
import { getStore } from '../../src/domain/store.js';
import { initTagsPanel } from '../../src/ui/tags-panel.js';

function mount() {
  document.body.innerHTML = `
    <button type="button" id="tags-toggle" aria-expanded="false" aria-controls="tags-panel">
      <h2>TAGS</h2>
    </button>
    <div id="tags-panel" hidden>
      <p id="tags-status" class="section-status" hidden></p>
      <div id="global-tag-list" hidden></div>
      <div id="tags-add"></div>
    </div>
  `;
}

describe('initTagsPanel', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should open a Name and Color editor with CANCEL and SAVE', () => {
    mount();
    const panel = initTagsPanel({ refreshAll: vi.fn(), setStatus: vi.fn() });
    panel.refresh();

    document.querySelector('#tags-add .tree-add-group').click();

    expect(document.getElementById('add-tag-name')).toBeTruthy();
    expect(document.getElementById('add-tag-color-toggle')).toBeTruthy();
    expect(document.getElementById('add-tag-color-label')?.textContent).toBe('Color');
    expect([...document.querySelectorAll('#tags-add .tree-link-action-bar button')].map((button) => button.textContent)).toEqual([
      'CANCEL',
      'SAVE',
    ]);
  });

  it('should save a tag from the editor and return to Add tag', () => {
    mount();
    const refreshAll = vi.fn(() => panel.refresh());
    const panel = initTagsPanel({ refreshAll, setStatus: vi.fn() });
    panel.refresh();

    document.querySelector('#tags-add .tree-add-group').click();
    document.getElementById('add-tag-name').value = 'Work';
    document.querySelector('#tags-add .tree-link-bar-save').click();

    expect(refreshAll).toHaveBeenCalled();
    expect(getStore().tags[0]).toMatchObject({
      name: 'Work',
      colorLight: TAG_PALETTE[0].light,
      colorDark: TAG_PALETTE[0].dark,
    });
    expect(document.getElementById('global-tag-list').textContent).toContain('Work');
    expect(document.querySelector('#tags-add .tree-add-group')?.getAttribute('aria-label')).toBe('Add tag');
  });

  it('should keep the editor open and report validation errors', () => {
    mount();
    const setStatus = vi.fn();
    const panel = initTagsPanel({ refreshAll: vi.fn(), setStatus });
    panel.refresh();

    document.querySelector('#tags-add .tree-add-group').click();
    document.querySelector('#tags-add .tree-link-bar-save').click();

    expect(setStatus).toHaveBeenCalledWith('tags', 'Please enter a tag', 'error');
    expect(document.getElementById('add-tag-name')).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('should close the editor on CANCEL without saving', () => {
    mount();
    const panel = initTagsPanel({ refreshAll: vi.fn(), setStatus: vi.fn() });
    panel.refresh();

    document.querySelector('#tags-add .tree-add-group').click();
    document.getElementById('add-tag-name').value = 'Work';
    document.querySelector('#tags-add .tree-link-bar-cancel').click();

    expect(document.getElementById('add-tag-name')).toBeNull();
    expect(document.querySelector('#tags-add .tree-add-group')).toBeTruthy();
    expect(getStore().tags).toEqual([]);
  });
});
