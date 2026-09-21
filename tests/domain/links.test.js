import { describe, expect, it } from 'vitest';
import {
  displayLinkLabel,
  linkHasMeta,
  mergeLinkIntoList,
  normalizeLinkEntry,
  normalizeUrl,
  pickRandomLinks,
  serializeLink,
} from '../../src/domain/links.js';

describe('normalizeUrl / normalizeLinkEntry', () => {
  it('should add https, canonicalize, and read url aliases', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/');
    expect(normalizeLinkEntry('https://a.example')).toEqual({
      url: 'https://a.example/',
      name: '',
      tags: [],
    });
    expect(normalizeLinkEntry({ href: 'b.example', name: ' Beta ', tags: 'Work' })).toEqual({
      url: 'https://b.example/',
      name: 'Beta',
      tags: ['Work'],
    });
    expect(normalizeLinkEntry('')).toBeNull();
    expect(normalizeLinkEntry('javascript:alert(1)')).toBeNull();
  });
});

describe('serializeLink', () => {
  it('should store a bare URL when there is no meta', () => {
    expect(serializeLink({ url: 'https://a.example', name: '', tags: [] })).toBe('https://a.example');
  });

  it('should keep name and tags when present', () => {
    expect(serializeLink({ url: 'https://a.example', name: 'A', tags: ['Work'] })).toEqual({
      url: 'https://a.example',
      name: 'A',
      tags: ['Work'],
    });
  });
});

describe('mergeLinkIntoList', () => {
  it('should add, update empty entries, and leave existing meta alone', () => {
    const list = [];
    expect(mergeLinkIntoList(list, { url: 'https://a.example', name: '', tags: [] })).toBe('added');
    expect(mergeLinkIntoList(list, { url: 'https://a.example', name: 'A', tags: ['Work'] })).toBe('updated');
    expect(list[0]).toEqual({ url: 'https://a.example', name: 'A', tags: ['Work'] });
    expect(mergeLinkIntoList(list, { url: 'https://a.example', name: 'B', tags: ['Home'] })).toBe('exists');
    expect(list[0].name).toBe('A');
  });
});

describe('displayLinkLabel', () => {
  it('should prefer a name and hide https://www. for unnamed URLs', () => {
    expect(displayLinkLabel({ name: 'Docs', url: 'https://www.example.com/path' })).toBe('Docs');
    expect(displayLinkLabel({ name: '', url: 'https://www.example.com/path' })).toBe('example.com/path');
    expect(displayLinkLabel({ name: '  ', url: 'https://sadfsdf/' })).toBe('sadfsdf/');
    expect(displayLinkLabel({ name: '', url: 'http://www.foo.example/a' })).toBe('foo.example/a');
  });
});

describe('linkHasMeta', () => {
  it('should be true when a name or tags exist', () => {
    expect(linkHasMeta({ name: 'A', tags: [] })).toBe(true);
    expect(linkHasMeta({ name: '', tags: ['Work'] })).toBe(true);
    expect(linkHasMeta({ name: '', tags: [] })).toBe(false);
  });
});

describe('pickRandomLinks', () => {
  it('should return a unique subset and not mutate the source', () => {
    const list = ['a', 'b', 'c'];
    const picked = pickRandomLinks(list, 2);
    expect(picked).toHaveLength(2);
    expect(new Set(picked).size).toBe(2);
    expect(picked.every((item) => list.includes(item))).toBe(true);
    expect(list).toEqual(['a', 'b', 'c']);
    expect(pickRandomLinks(list, 10)).toHaveLength(3);
  });
});
