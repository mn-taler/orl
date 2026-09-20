import { MAX_LINKS } from '../config.js';
import { findLinkInStore, findOrCreateGroup, flattenLinks } from '../domain/groups.js';
import { linkHasMeta, normalizeLinkEntry } from '../domain/links.js';
import { getStore, saveStoreSafe } from '../domain/store.js';
import { expandGroup } from './collection.js';
import { bindDisclosure } from './dom.js';
import { bindTagMultiSelect } from './tag-select.js';

export function initEditor({ refreshAll, setStatus }) {
  const addLinkButton = document.getElementById('add-link-button');
  const linkInput = document.getElementById('link-input');
  const linkGroupInput = document.getElementById('link-group');
  const linkNameInput = document.getElementById('link-name');
  const linkInfoToggle = document.getElementById('link-info-toggle');
  const linkInfoPanel = document.getElementById('link-info-panel');
  const draftTagToggle = document.getElementById('draft-tag-toggle');
  const draftTagMenu = document.getElementById('draft-tag-menu');

  bindDisclosure(linkInfoToggle, linkInfoPanel);

  const draftTags = bindTagMultiSelect({
    toggle: draftTagToggle,
    menu: draftTagMenu,
    emptyLabel: 'None',
  });

  const refresh = () => {
    draftTags.refresh(getStore().tags, draftTags.getSelected());
    if (linkInfoPanel.hidden) draftTags.close();
  };

  const clearLinkForm = () => {
    linkInput.value = '';
    linkNameInput.value = '';
    draftTags.refresh(getStore().tags, []);
  };

  addLinkButton.addEventListener('click', () => {
    const incoming = normalizeLinkEntry({
      url: linkInput.value,
      name: linkNameInput.value,
      tags: draftTags.getSelected(),
    });
    if (!incoming) {
      setStatus('add', 'Please enter a valid URL', 'error');
      return;
    }
    const store = getStore();
    const existing = findLinkInStore(store, incoming.url);
    if (existing) {
      if (!linkHasMeta(existing.link) && linkHasMeta(incoming)) {
        existing.link.name = incoming.name;
        existing.link.tags = incoming.tags.slice();
        const error = saveStoreSafe(store);
        if (error) {
          setStatus('add', error, 'error');
          return;
        }
        expandGroup(existing.group.name);
        clearLinkForm();
        refreshAll();
        setStatus('add', 'Link updated', 'success');
        return;
      }
      setStatus('add', 'Link is already saved', 'error');
      return;
    }
    if (flattenLinks(store).length >= MAX_LINKS) {
      setStatus('add', 'Collection is full', 'error');
      return;
    }
    const group = findOrCreateGroup(store, linkGroupInput.value);
    group.links.push(incoming);
    const error = saveStoreSafe(store);
    if (error) {
      setStatus('add', error, 'error');
      return;
    }
    expandGroup(group.name);
    clearLinkForm();
    refreshAll();
    setStatus('add', 'Link added', 'success');
  });

  linkInfoToggle.addEventListener('click', () => {
    if (linkInfoPanel.hidden) draftTags.close();
  });

  [linkInput, linkGroupInput, linkNameInput].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addLinkButton.click();
    });
  });

  return { refresh };
}
