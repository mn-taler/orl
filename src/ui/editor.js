import { TAGS_GROUP } from '../config.js';
import { findOrCreateGroup, findLinkInStore } from '../domain/groups.js';
import { linkHasMeta, normalizeLinkEntry } from '../domain/links.js';
import { getStore, saveStore } from '../domain/store.js';
import { createTagEntry, validateTag } from '../domain/tags.js';
import { createTagChip } from './chips.js';
import { expandGroup } from './collection.js';
import { bindDisclosure } from './dom.js';

export function initEditor({ refreshCollection, setListInfo }) {
  const addLinkButton = document.getElementById('add-link-button');
  const linkInput = document.getElementById('link-input');
  const linkGroupInput = document.getElementById('link-group');
  const linkNameInput = document.getElementById('link-name');
  const draftTagList = document.getElementById('draft-tag-list');
  const tagInput = document.getElementById('tag-input');
  const addTagButton = document.getElementById('add-tag-button');
  const tagEditorError = document.getElementById('tag-editor-error');
  const linkInfoToggle = document.getElementById('link-info-toggle');
  const linkInfoPanel = document.getElementById('link-info-panel');

  let draftTags = [];

  bindDisclosure(linkInfoToggle, linkInfoPanel);

  const setTagEditorError = (message) => {
    tagEditorError.textContent = message || '';
  };

  const colorsForDraftTags = (names) => {
    const assigned = getStore().tags.map((tag) => ({ ...tag }));
    return names.map((name) => {
      const existing = assigned.find((tag) => tag.name === name);
      if (existing) return existing;
      const entry = createTagEntry(name, assigned);
      assigned.push(entry);
      return entry;
    });
  };

  const renderDraftTags = () => {
    draftTagList.innerHTML = '';
    colorsForDraftTags(draftTags).forEach((tag) => {
      draftTagList.appendChild(createTagChip(tag, () => {
        draftTags = draftTags.filter((item) => item !== tag.name);
        renderDraftTags();
        setTagEditorError('');
      }));
    });
    draftTagList.hidden = draftTags.length === 0;
  };

  const addDraftTag = () => {
    const raw = tagInput.value;
    const error = validateTag(raw);
    if (error) {
      setTagEditorError(error);
      return;
    }
    const tag = raw.trim();
    if (draftTags.includes(tag)) {
      setTagEditorError('Tag is already added');
      return;
    }
    draftTags.push(tag);
    tagInput.value = '';
    setTagEditorError('');
    renderDraftTags();
  };

  addTagButton.addEventListener('click', addDraftTag);

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDraftTag();
    }
  });

  const clearLinkForm = () => {
    linkInput.value = '';
    linkNameInput.value = '';
    draftTags = [];
    tagInput.value = '';
    setTagEditorError('');
    renderDraftTags();
  };

  addLinkButton.addEventListener('click', () => {
    const incoming = normalizeLinkEntry({
      url: linkInput.value,
      name: linkNameInput.value,
      tags: draftTags.slice(),
    });
    if (!incoming) {
      setListInfo('Please enter a valid URL');
      return;
    }
    const store = getStore();
    const existing = findLinkInStore(store, incoming.url);
    if (existing) {
      if (!linkHasMeta(existing.link) && linkHasMeta(incoming)) {
        existing.link.name = incoming.name;
        existing.link.tags = incoming.tags.slice();
        saveStore(store);
        expandGroup(existing.group.name);
        if (incoming.tags.length > 0) expandGroup(TAGS_GROUP);
        clearLinkForm();
        refreshCollection();
        setListInfo('Link updated');
        return;
      }
      setListInfo('Link is already saved');
      return;
    }
    const group = findOrCreateGroup(store, linkGroupInput.value);
    group.links.push(incoming);
    saveStore(store);
    expandGroup(group.name);
    if (incoming.tags.length > 0) expandGroup(TAGS_GROUP);
    clearLinkForm();
    refreshCollection();
    setListInfo('Link added');
  });

  [linkInput, linkGroupInput, linkNameInput].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addLinkButton.click();
    });
  });
}
