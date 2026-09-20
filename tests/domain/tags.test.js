import { describe, expect, it } from 'vitest';
import { TAG_PALETTE } from '../../src/config.js';
import {
  createTagEntry,
  normalizeHexColor,
  normalizeOpenTags,
  normalizeTag,
  normalizeTagCatalogEntry,
  normalizeTags,
  rebuildTagCatalog,
  sameTagList,
  validateTag,
} from '../../src/domain/tags.js';
import { makeLink, makeStore } from '../helpers.js';

describe('normalizeTag / validateTag', () => {
  it('should accept letters and digits up to 128 characters', () => {
    expect(normalizeTag(' Work12 ')).toBe('Work12');
    expect(validateTag('Work12')).toBe('');
  });

  it('should reject empty, symbol, and overlong values', () => {
    expect(normalizeTag('')).toBe('');
    expect(normalizeTag('work-tag')).toBe('');
    expect(normalizeTag('a'.repeat(129))).toBe('');
    expect(validateTag('')).toBe('Please enter a tag');
    expect(validateTag('work-tag')).toBe('Use only letters and numbers');
    expect(validateTag('a'.repeat(129))).toBe('Tags can be at most 128 characters');
  });
});

describe('normalizeTags', () => {
  it('should split, trim, and drop duplicates and invalid parts', () => {
    expect(normalizeTags('Alpha, beta; Alpha, no-go')).toEqual(['Alpha', 'beta']);
    expect(normalizeTags(['Alpha', 'Alpha', 'bad!'])).toEqual(['Alpha']);
  });
});

describe('tag colors', () => {
  it('should normalize hex colors and ignore invalid values', () => {
    expect(normalizeHexColor('#2E6BE5')).toBe('#2e6be5');
    expect(normalizeHexColor('blue')).toBe('');
  });

  it('should not reuse a palette color until two other colors have been used', () => {
    const indexOf = (entry) => TAG_PALETTE.findIndex(
      (swatch) => swatch.light === entry.colorLight && swatch.dark === entry.colorDark
    );
    const assigned = [];
    for (let i = 0; i < 12; i += 1) {
      assigned.push(createTagEntry(`t${i}`, assigned));
    }
    assigned.forEach((entry) => {
      expect(indexOf(entry)).toBeGreaterThanOrEqual(0);
    });
    for (let i = 2; i < assigned.length; i += 1) {
      expect(indexOf(assigned[i])).not.toBe(indexOf(assigned[i - 1]));
      expect(indexOf(assigned[i])).not.toBe(indexOf(assigned[i - 2]));
    }
  });

  it('should keep an exact imported palette pair', () => {
    const swatch = TAG_PALETTE[3];
    const entry = createTagEntry('Work', [], {
      'color-light': swatch.light,
      'color-dark': swatch.dark,
    });
    expect(entry).toEqual({
      name: 'Work',
      colorLight: swatch.light,
      colorDark: swatch.dark,
    });
  });

  it('should rebuild the catalog from links and colorless imported names', () => {
    const store = makeStore([
      {
        name: 'Main',
        links: [makeLink('https://a.example', { tags: ['Alpha'] })],
      },
    ]);
    rebuildTagCatalog(store, ['Beta']);
    expect(store.tags.map((tag) => tag.name)).toEqual(['Alpha', 'Beta']);
    const paletteOf = (entry) => TAG_PALETTE.find(
      (swatch) => swatch.light === entry.colorLight && swatch.dark === entry.colorDark
    );
    expect(paletteOf(store.tags[0])).toBeTruthy();
    expect(paletteOf(store.tags[1])).toBeTruthy();
    expect(store.tags[0].colorLight).not.toBe(store.tags[1].colorLight);
  });

  it('should read catalog names from string or object forms', () => {
    expect(normalizeTagCatalogEntry('Work')?.name).toBe('Work');
    expect(normalizeTagCatalogEntry({ label: 'Home', 'color-light': TAG_PALETTE[0].light })?.name).toBe('Home');
    expect(normalizeTagCatalogEntry(null)).toBeNull();
  });
});

describe('open tag filters', () => {
  it('should parse arrays, JSON, and a legacy single tag', () => {
    expect(normalizeOpenTags(['Work', 'Home', 'bad!'])).toEqual(['Work', 'Home']);
    expect(normalizeOpenTags('["Work","Home"]')).toEqual(['Work', 'Home']);
    expect(normalizeOpenTags('Work')).toEqual(['Work']);
    expect(normalizeOpenTags('')).toEqual([]);
  });

  it('should compare tag lists by value', () => {
    expect(sameTagList(['A', 'B'], ['A', 'B'])).toBe(true);
    expect(sameTagList(['A', 'B'], ['B', 'A'])).toBe(false);
  });
});
