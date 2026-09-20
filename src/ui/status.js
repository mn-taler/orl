import { getLinks, getStorageError } from '../domain/store.js';

const EMPTY_LIST_MESSAGE = 'No links saved yet';
const DAMAGED_LIST_MESSAGE = 'Saved data is damaged. New saves will replace it.';
const STATUS_DURATION_MS = 3000;
let listInfoTimeoutId = null;

function getListInfoEl() {
  return document.getElementById('list-info');
}

export function restoreListInfo(links) {
  const infoEl = getListInfoEl();
  if (getStorageError() === 'unreadable') {
    infoEl.textContent = DAMAGED_LIST_MESSAGE;
    infoEl.classList.remove('hidden');
    return;
  }
  if (links.length === 0) {
    infoEl.textContent = EMPTY_LIST_MESSAGE;
    infoEl.classList.remove('hidden');
  } else {
    infoEl.textContent = '';
    infoEl.classList.add('hidden');
  }
}

export function setListInfo(message) {
  const infoEl = getListInfoEl();
  if (listInfoTimeoutId) clearTimeout(listInfoTimeoutId);
  infoEl.textContent = message;
  infoEl.classList.remove('hidden');
  listInfoTimeoutId = setTimeout(() => {
    listInfoTimeoutId = null;
    restoreListInfo(getLinks());
  }, STATUS_DURATION_MS);
}
