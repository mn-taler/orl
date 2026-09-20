import { afterEach, describe, expect, it, vi } from 'vitest';
import { setStatus } from '../../src/ui/status.js';

function mount() {
  document.body.innerHTML = `
    <button type="button" id="open-button">OPEN</button>
    <button type="button" id="add-link-button">ADD</button>
    <button type="button" id="global-tag-add">ADD</button>
    <p id="list-info" class="list-info"></p>
    <p id="settings-status" hidden></p>
  `;
}

describe('setStatus', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should overwrite the OPEN button text without touching ADD', () => {
    mount();
    setStatus('open', 'No links saved', 'error');
    expect(document.getElementById('open-button').textContent).toBe('No links saved');
    expect(document.getElementById('open-button').classList.contains('is-error')).toBe(true);
    expect(document.getElementById('add-link-button').textContent).toBe('ADD');
    expect(document.getElementById('list-info').textContent).toBe('');
  });

  it('should show a tag error on the TAGS ADD button and not in COLLECTION', () => {
    mount();
    setStatus('tags', 'Tag is used by a link', 'error');
    expect(document.getElementById('global-tag-add').textContent).toBe('Tag is used by a link');
    expect(document.getElementById('global-tag-add').classList.contains('is-error')).toBe(true);
    expect(document.getElementById('list-info').textContent).toBe('');
  });

  it('should restore OPEN and ADD labels after the timeout', () => {
    mount();
    vi.useFakeTimers();
    setStatus('add', 'Link added', 'success');
    setStatus('open', 'Popup blocked', 'error');
    setStatus('tags', 'Tag is used by a link', 'error');
    vi.advanceTimersByTime(3000);
    expect(document.getElementById('add-link-button').textContent).toBe('ADD');
    expect(document.getElementById('add-link-button').classList.contains('is-success')).toBe(false);
    expect(document.getElementById('open-button').textContent).toBe('OPEN');
    expect(document.getElementById('global-tag-add').textContent).toBe('ADD');
    expect(document.getElementById('global-tag-add').classList.contains('is-error')).toBe(false);
  });
});
