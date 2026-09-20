import { describe, expect, it } from 'vitest';
import {
  filterOpenLinks,
  findLinkInStore,
  findOrCreateGroup,
  flattenLinks,
  isReservedGroupName,
  listOpenGroups,
  normalizeGroupName,
  removeLinkFromStore,
  removeTagFromLinks,
} from '../../src/domain/groups.js';
import { makeGroup, makeLink, makeStore } from '../helpers.js';

function sampleStore() {
  return makeStore([
    makeGroup('Main', [
      makeLink('https://main.example', { tags: ['Work'] }),
      makeLink('https://plain.example'),
    ]),
    makeGroup('Home', [
      makeLink('https://home.example', { tags: ['Home', 'Work'] }),
    ], [
      { name: 'Later', links: [makeLink('https://later.example', { tags: ['Later'] })] },
    ]),
  ]);
}

describe('group names', () => {
  it('should map empty, main, and reserved names to Main', () => {
    expect(normalizeGroupName('')).toBe('Main');
    expect(normalizeGroupName('main')).toBe('Main');
    expect(normalizeGroupName('Tags')).toBe('Main');
    expect(normalizeGroupName('Work')).toBe('Work');
    expect(normalizeGroupName('x'.repeat(80))).toBe('x'.repeat(64));
    expect(isReservedGroupName(' tags ')).toBe(true);
  });
});

describe('find, flatten, and mutate', () => {
  it('should create groups, find links in subgroups, and flatten them', () => {
    const store = sampleStore();
    expect(findOrCreateGroup(store, 'Work').name).toBe('Work');
    expect(flattenLinks(store).map((link) => link.url)).toEqual([
      'https://main.example',
      'https://plain.example',
      'https://home.example',
      'https://later.example',
    ]);
    expect(findLinkInStore(store, 'https://later.example')?.subgroup?.name).toBe('Later');
  });

  it('should remove a tag from every link and a url from every group', () => {
    const store = sampleStore();
    removeTagFromLinks(store, 'Work');
    expect(flattenLinks(store).every((link) => !link.tags.includes('Work'))).toBe(true);
    removeLinkFromStore(store, 'https://later.example');
    expect(findLinkInStore(store, 'https://later.example')).toBeNull();
  });
});

describe('filterOpenLinks', () => {
  it('should return every link when no group or tags are selected', () => {
    const urls = filterOpenLinks(sampleStore(), '', []).map((link) => link.url);
    expect(urls).toHaveLength(4);
  });

  it('should limit to one group including its subgroups', () => {
    const urls = filterOpenLinks(sampleStore(), 'Home', []).map((link) => link.url);
    expect(urls).toEqual(['https://home.example', 'https://later.example']);
  });

  it('should keep links that have any of the selected tags', () => {
    const urls = filterOpenLinks(sampleStore(), '', ['Later', 'Work']).map((link) => link.url);
    expect(urls).toEqual([
      'https://main.example',
      'https://home.example',
      'https://later.example',
    ]);
  });

  it('should intersect group and tag filters', () => {
    const urls = filterOpenLinks(sampleStore(), 'Home', ['Work']).map((link) => link.url);
    expect(urls).toEqual(['https://home.example']);
  });

  it('should list only groups that actually have links', () => {
    const store = sampleStore();
    store.groups.push(makeGroup('Empty'));
    expect(listOpenGroups(store).map((group) => group.name)).toEqual(['Main', 'Home']);
  });
});
