import { afterEach, describe, expect, it, vi } from 'vitest';
import { setStatus } from '../../src/ui/status.js';

function mount() {
  document.body.innerHTML = `
    <button type="button" id="open-button" aria-label="OPEN">
      <img class="open-button-icon" alt="" />
      <span class="open-button-label" hidden></span>
    </button>
    <p id="tags-status" class="section-status" hidden></p>
    <p id="list-info" class="list-info"></p>
    <p id="settings-status" hidden></p>
  `;
}

describe('setStatus', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should overwrite the OPEN button text without touching COLLECTION', () => {
    mount();
    setStatus('open', 'No links saved', 'error');
    const open = document.getElementById('open-button');
    expect(open.querySelector('.open-button-icon').hidden).toBe(true);
    expect(open.querySelector('.open-button-label').hidden).toBe(false);
    expect(open.querySelector('.open-button-label').textContent).toBe('No links saved');
    expect(open.classList.contains('is-error')).toBe(true);
    expect(document.getElementById('list-info').textContent).toBe('');
  });

  it('should show a tag error on the TAGS status and not in COLLECTION', () => {
    mount();
    setStatus('tags', 'Tag is used by a link', 'error');
    const status = document.getElementById('tags-status');
    expect(status.textContent).toBe('Tag is used by a link');
    expect(status.hidden).toBe(false);
    expect(status.classList.contains('is-error')).toBe(true);
    expect(document.getElementById('list-info').textContent).toBe('');
  });

  it('should restore OPEN and TAGS status after the timeout', () => {
    mount();
    vi.useFakeTimers();
    setStatus('open', 'Popup blocked', 'error');
    setStatus('tags', 'Tag is used by a link', 'error');
    vi.advanceTimersByTime(3000);
    const open = document.getElementById('open-button');
    expect(open.querySelector('.open-button-icon').hidden).toBe(false);
    expect(open.querySelector('.open-button-label').hidden).toBe(true);
    expect(document.getElementById('tags-status').textContent).toBe('');
    expect(document.getElementById('tags-status').hidden).toBe(true);
    expect(document.getElementById('tags-status').classList.contains('is-error')).toBe(false);
  });

  it('should show collection messages on list-info', () => {
    mount();
    vi.useFakeTimers();
    setStatus('collection', 'Link added', 'success');
    expect(document.getElementById('list-info').textContent).toBe('Link added');
    expect(document.getElementById('list-info').classList.contains('is-success')).toBe(true);
  });
});
