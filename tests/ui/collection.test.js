import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from '../../src/config.js';
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

  it('should offer Add link and Add group when the collection is empty', () => {
    document.body.innerHTML = '<ul id="link-list"></ul><div id="collection-add"></div>';
    renderCollection(document.getElementById('link-list'), vi.fn());
    const labels = [...document.querySelectorAll('#collection-add .tree-add-group')].map(
      (button) => button.getAttribute('aria-label')
    );
    expect(labels).toEqual(['Add link', 'Add group']);
  });

  it('should keep Add link inside a collapsed group', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      groups: [{ name: 'Main', links: [{ url: 'https://a.example/' }] }],
      tags: [],
    }));
    document.body.innerHTML = '<ul id="link-list"></ul><div id="collection-add"></div>';
    renderCollection(document.getElementById('link-list'), vi.fn());

    const addLink = document.querySelector('#link-list [aria-label="Add link"]');
    const group = addLink.closest('.tree-children');
    expect(group.hidden).toBe(true);
    expect(document.querySelector('#collection-add [aria-label="Add link"]')).toBeNull();

    document.querySelector('#link-list .tree-toggle').click();
    expect(group.hidden).toBe(false);

    document.querySelector('#link-list .tree-toggle').click();
    expect(group.hidden).toBe(true);
  });
});
