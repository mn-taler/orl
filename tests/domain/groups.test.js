import { describe, expect, it } from 'vitest';
import { MAX_GROUPS } from '../../src/config.js';
import {
  addLinkToStore,
  createGroup,
  filterOpenLinks,
  findGroup,
  findLinkInStore,
  findOrCreateGroup,
  flattenLinks,
  isReservedGroupName,
  listOpenGroups,
  normalizeGroupName,
  deleteLinkFromStore,
  removeGroupFromStore,
  removeLinkFromStore,
  removeTagFromLinks,
  renameGroup,
  updateLinkInStore,
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

describe('createGroup', () => {
  it('should add a named empty group', () => {
    const store = sampleStore();
    const result = createGroup(store, '  Work  ');
    expect(result.error).toBeUndefined();
    expect(result.group).toEqual({ name: 'Work', links: [], subgroups: [] });
    expect(store.groups.map((group) => group.name)).toEqual(['Main', 'Home', 'Work']);
  });

  it('should reject empty, reserved, duplicate, and over-limit names', () => {
    const store = sampleStore();
    expect(createGroup(store, '   ').error).toBe('Please enter a group name');
    expect(createGroup(store, 'Tags').error).toBe('This name is reserved');
    expect(createGroup(store, 'main').error).toBe('Group already exists');
    expect(createGroup(store, 'Home').error).toBe('Group already exists');
    const full = makeStore(Array.from({ length: MAX_GROUPS }, (_, index) => (
      makeGroup(index === 0 ? 'Main' : `G${index}`)
    )));
    expect(createGroup(full, 'Extra').error).toBe('Too many groups');
  });

  it('should find an existing group without creating one', () => {
    const store = sampleStore();
    expect(findGroup(store, 'Home').name).toBe('Home');
    expect(findGroup(store, 'Missing').name).toBe('Main');
    expect(store.groups).toHaveLength(2);
  });
});

describe('addLinkToStore', () => {
  function editableStore() {
    return makeStore([
      makeGroup('Main', [
        makeLink('https://main.example/', { tags: ['Work'] }),
        makeLink('https://plain.example/'),
      ]),
      makeGroup('Home', [
        makeLink('https://home.example/', { tags: ['Home'] }),
      ]),
    ]);
  }

  it('should add a link to the chosen group', () => {
    const store = editableStore();
    const result = addLinkToStore(store, {
      url: 'https://new.example',
      name: 'New',
      tags: ['Work'],
      group: 'Home',
    });
    expect(result.error).toBeUndefined();
    expect(result.group.name).toBe('Home');
    expect(result.link).toEqual({
      url: 'https://new.example/',
      name: 'New',
      tags: ['Work'],
    });
    expect(findLinkInStore(store, 'https://new.example/')?.group.name).toBe('Home');
  });

  it('should reject an invalid or duplicate url and fill empty meta', () => {
    const store = editableStore();
    expect(addLinkToStore(store, {
      url: 'javascript:alert(1)',
      name: '',
      tags: [],
      group: 'Main',
    }).error).toBe('Please enter a valid URL');
    expect(addLinkToStore(store, {
      url: 'https://main.example',
      name: '',
      tags: [],
      group: 'Main',
    }).error).toBe('Link is already saved');
    const updated = addLinkToStore(store, {
      url: 'https://plain.example',
      name: 'Plain',
      tags: ['Work'],
      group: 'Main',
    });
    expect(updated.updated).toBe(true);
    expect(findLinkInStore(store, 'https://plain.example/')?.link).toEqual({
      url: 'https://plain.example/',
      name: 'Plain',
      tags: ['Work'],
    });
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

describe('updateLinkInStore', () => {
  function editableStore() {
    return makeStore([
      makeGroup('Main', [
        makeLink('https://main.example/', { tags: ['Work'] }),
        makeLink('https://plain.example/'),
      ]),
      makeGroup('Home', [
        makeLink('https://home.example/', { tags: ['Home'] }),
      ], [
        { name: 'Later', links: [makeLink('https://later.example/', { tags: ['Later'] })] },
      ]),
    ]);
  }

  it('should update name and tags in place', () => {
    const store = editableStore();
    const result = updateLinkInStore(store, 'https://plain.example/', {
      url: 'https://plain.example/',
      name: 'Plain',
      tags: ['Work'],
      group: 'Main',
    });
    expect(result.error).toBeUndefined();
    expect(result.link).toEqual({
      url: 'https://plain.example/',
      name: 'Plain',
      tags: ['Work'],
    });
    expect(findLinkInStore(store, 'https://plain.example/')?.group.name).toBe('Main');
  });

  it('should move a subgroup link when the group changes', () => {
    const store = editableStore();
    const result = updateLinkInStore(store, 'https://later.example/', {
      url: 'https://later.example/',
      name: '',
      tags: ['Later'],
      group: 'Main',
    });
    expect(result.group.name).toBe('Main');
    expect(findLinkInStore(store, 'https://later.example/')?.subgroup).toBeUndefined();
    expect(findLinkInStore(store, 'https://later.example/')?.group.name).toBe('Main');
  });

  it('should keep a subgroup link in place when the group stays the same', () => {
    const store = editableStore();
    updateLinkInStore(store, 'https://later.example/', {
      url: 'https://later.example/',
      name: 'Later link',
      tags: ['Later'],
      group: 'Home',
    });
    expect(findLinkInStore(store, 'https://later.example/')?.subgroup?.name).toBe('Later');
  });

  it('should reject an invalid url or a url that already exists', () => {
    const store = editableStore();
    expect(updateLinkInStore(store, 'https://plain.example/', {
      url: 'javascript:alert(1)',
      name: '',
      tags: [],
      group: 'Main',
    }).error).toBe('Please enter a valid URL');
    expect(updateLinkInStore(store, 'https://plain.example/', {
      url: 'https://home.example/',
      name: '',
      tags: [],
      group: 'Main',
    }).error).toBe('Link is already saved');
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

describe('renameGroup and removeGroupFromStore', () => {
  it('should rename a group and keep its links', () => {
    const store = sampleStore();
    const result = renameGroup(store, 'Home', '  Inbox  ');
    expect(result.error).toBeUndefined();
    expect(result.group.name).toBe('Inbox');
    expect(store.groups.map((group) => group.name)).toEqual(['Main', 'Inbox']);
    expect(result.group.links[0].url).toBe('https://home.example');
  });

  it('should reject empty, reserved, missing, and duplicate names', () => {
    const store = sampleStore();
    expect(renameGroup(store, 'Home', '   ').error).toBe('Please enter a group name');
    expect(renameGroup(store, 'Home', 'Tags').error).toBe('This name is reserved');
    expect(renameGroup(store, 'Home', 'main').error).toBe('Group already exists');
    expect(renameGroup(store, 'Missing', 'Work').error).toBe('Group not found');
  });

  it('should remove a group and all of its links', () => {
    const store = sampleStore();
    const result = removeGroupFromStore(store, 'Home');
    expect(result.error).toBeUndefined();
    expect(result.group.name).toBe('Home');
    expect(store.groups.map((group) => group.name)).toEqual(['Main']);
    expect(findLinkInStore(store, 'https://home.example')).toBeNull();
    expect(findLinkInStore(store, 'https://later.example')).toBeNull();
  });

  it('should reject a missing or reserved group', () => {
    const store = sampleStore();
    store.groups.push(makeGroup('Tags', [makeLink('https://tag.example')]));
    expect(removeGroupFromStore(store, 'Missing').error).toBe('Group not found');
    expect(removeGroupFromStore(store, 'Tags').error).toBe('Group not found');
    expect(store.groups.some((group) => group.name === 'Tags')).toBe(true);
  });
});

describe('deleteLinkFromStore', () => {
  it('should remove a link and reject a missing url', () => {
    const store = sampleStore();
    const result = deleteLinkFromStore(store, 'https://plain.example');
    expect(result.error).toBeUndefined();
    expect(result.group.name).toBe('Main');
    expect(findLinkInStore(store, 'https://plain.example')).toBeNull();
    expect(deleteLinkFromStore(store, 'https://missing.example').error).toBe('Link not found');
  });
});
