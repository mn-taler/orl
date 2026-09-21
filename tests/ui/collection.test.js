import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderCollection } from '../../src/ui/collection.js';

describe('renderCollection', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should keep the list scroll position after a rerender', () => {
    document.body.innerHTML = '<ul id="link-list"></ul><div id="collection-add"></div>';
    const listEl = document.getElementById('link-list');
    renderCollection(listEl, vi.fn());
    listEl.scrollTop = 160;
    renderCollection(listEl, vi.fn());
    expect(listEl.scrollTop).toBe(160);
  });
});
