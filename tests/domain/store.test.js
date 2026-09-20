import { describe, expect, it, vi } from 'vitest';
import { MAX_LINKS, STORAGE_CORRUPT_KEY, STORAGE_KEY, STORAGE_KEY_LEGACY, TAG_PALETTE } from '../../src/config.js';
import { flattenLinks } from '../../src/domain/groups.js';
import {
  createEmptyStore,
  createExportPayload,
  getStorageError,
  getStore,
  importIncomingStore,
  normalizeStore,
  persistStore,
  pruneStore,
  serializeStore,
} from '../../src/domain/store.js';
import { makeGroup, makeLink, makeStore } from '../helpers.js';

describe('normalizeStore', () => {
  it('should create an empty Main store for null or invalid data', () => {
    expect(normalizeStore(null)).toEqual(createEmptyStore());
    expect(normalizeStore(12).groups[0].name).toBe('Main');
  });

  it('should import a legacy URL array into Main', () => {
    const store = normalizeStore(['example.com', 'https://b.example']);
    expect(store.groups[0].links.map((link) => link.url)).toEqual([
      'https://example.com/',
      'https://b.example/',
    ]);
  });

  it('should import { links } and top-level tags', () => {
    const store = normalizeStore({
      links: [{ url: 'https://a.example', tags: ['Work'] }],
      tags: ['Work', 'Home'],
    });
    expect(store.groups[0].links[0].tags).toEqual(['Work']);
    expect(store.tags.map((tag) => tag.name)).toEqual(['Work', 'Home']);
  });

  it('should import the grouped format and assign palette colors to colorless tags', () => {
    const store = normalizeStore({
      groups: [{
        name: 'Work',
        links: [{ url: 'https://a.example', tags: ['Alpha'] }],
        subgroups: [],
      }],
      tags: ['Alpha', 'Beta'],
    });
    expect(store.groups.map((group) => group.name)).toEqual(['Main', 'Work']);
    expect(store.tags.map((tag) => tag.name)).toEqual(['Alpha', 'Beta']);
    expect(TAG_PALETTE.some((swatch) => swatch.light === store.tags[0].colorLight)).toBe(true);
    expect(store.tags[0].colorLight).not.toBe(store.tags[1].colorLight);
  });
});

describe('pruneStore / serializeStore', () => {
  it('should move a reserved Tags group into Main and keep empty extras', () => {
    const store = makeStore([
      makeGroup('Work'),
      makeGroup('Tags', [makeLink('https://a.example')]),
    ]);
    pruneStore(store);
    expect(store.groups.map((group) => group.name)).toEqual(['Main', 'Work']);
    expect(store.groups[0].links[0].url).toBe('https://a.example');
  });

  it('should write kebab-case tag colors and omit empty link meta', () => {
    const store = makeStore(
      [makeGroup('Main', [makeLink('https://a.example'), makeLink('https://b.example', { name: 'B', tags: ['Work'] })])],
      [{ name: 'Work', colorLight: TAG_PALETTE[0].light, colorDark: TAG_PALETTE[0].dark }]
    );
    const serialized = serializeStore(store);
    expect(serialized.groups[0].links[0]).toBe('https://a.example');
    expect(serialized.groups[0].links[1]).toEqual({
      url: 'https://b.example',
      name: 'B',
      tags: ['Work'],
    });
    expect(serialized.tags[0]).toEqual({
      name: 'Work',
      'color-dark': TAG_PALETTE[0].dark,
      'color-light': TAG_PALETTE[0].light,
    });
  });
});

describe('persistence and import', () => {
  it('should round-trip through localStorage', () => {
    persistStore(normalizeStore(['https://a.example']));
    expect(getStore().groups[0].links[0].url).toBe('https://a.example/');
  });

  it('should return an empty store when localStorage holds invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(getStore()).toEqual(createEmptyStore());
    expect(getStorageError()).toBe('unreadable');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{not json');
    expect(localStorage.getItem(STORAGE_CORRUPT_KEY)).toBe('{not json');
  });

  it('should migrate a legacy key and keep data if a later persist fails', () => {
    localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(['https://a.example']));
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const store = getStore();
    expect(store.groups[0].links[0].url).toBe('https://a.example/');
    Storage.prototype.setItem = setItem;
  });

  it('should copy a readable legacy collection onto the namespaced key', () => {
    localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(['https://a.example']));
    expect(getStore().groups[0].links[0].url).toBe('https://a.example/');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('https://a.example/');
    expect(localStorage.getItem(STORAGE_KEY_LEGACY)).toBeNull();
  });

  it('should drop blocked and over-limit links on normalize', () => {
    const urls = Array.from({ length: MAX_LINKS + 1 }, (_, index) => `https://n${index}.example`);
    urls.push('https://localhost/admin', 'javascript:alert(1)');
    const store = normalizeStore(urls);
    expect(flattenLinks(store)).toHaveLength(MAX_LINKS);
    expect(flattenLinks(store).some((link) => link.url.includes('localhost'))).toBe(false);
  });

  it('should import new links, update empty ones, and skip existing meta', () => {
    const existing = normalizeStore({
      groups: [{
        name: 'Main',
        links: [
          { url: 'https://old.example' },
          { url: 'https://named.example', name: 'Keep' },
        ],
        subgroups: [],
      }],
    });
    const incoming = normalizeStore({
      groups: [{
        name: 'Work',
        links: [
          { url: 'https://old.example', name: 'Old', tags: ['A'] },
          { url: 'https://named.example', name: 'Nope' },
          { url: 'https://new.example' },
        ],
        subgroups: [],
      }],
    });
    const result = importIncomingStore(existing, incoming);
    expect(result).toEqual({ added: 1, updated: 1, skipped: 0, importedTagCount: 1 });
    expect(existing.groups.map((group) => group.name)).toEqual(['Main', 'Work']);
    expect(existing.groups[0].links[0]).toMatchObject({ name: 'Old', tags: ['A'] });
    expect(existing.groups[0].links[1].name).toBe('Keep');
  });

  it('should include an export timestamp', () => {
    persistStore(createEmptyStore());
    const payload = createExportPayload();
    expect(payload.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload.groups[0].name).toBe('Main');
  });
});
