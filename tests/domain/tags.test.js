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

  it('should assign palette colors in order and reuse the least-used tone', () => {
    const assigned = [];
    for (let i = 0; i < 7; i += 1) {
      assigned.push(createTagEntry(`t${i}`, assigned));
    }
    expect(assigned[0]).toMatchObject({ colorLight: TAG_PALETTE[0].light, colorDark: TAG_PALETTE[0].dark });
    expect(assigned[5]).toMatchObject({ colorLight: TAG_PALETTE[5].light, colorDark: TAG_PALETTE[5].dark });
    expect(assigned[6]).toMatchObject({ colorLight: TAG_PALETTE[0].light, colorDark: TAG_PALETTE[0].dark });
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
    expect(store.tags[0]).toMatchObject({ colorLight: TAG_PALETTE[0].light, colorDark: TAG_PALETTE[0].dark });
    expect(store.tags[1]).toMatchObject({ colorLight: TAG_PALETTE[1].light, colorDark: TAG_PALETTE[1].dark });
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
