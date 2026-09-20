import {
  DARK_MODE_KEY,
  DARK_MODE_KEY_LEGACY,
  LINK_AMOUNT_KEY,
  LINK_AMOUNT_KEY_LEGACY,
  MAX_LINK_AMOUNT,
  MIN_LINK_AMOUNT,
  OPEN_GROUP_KEY,
  OPEN_GROUP_KEY_LEGACY,
  OPEN_TAG_KEY,
  OPEN_TAG_KEY_LEGACY,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
} from '../config.js';
import { normalizeOpenTags } from '../domain/tags.js';
import { readStoredValue, removeStoredValue, writeStoredValue } from './storage.js';

export function prefersDarkMode() {
  if (!window.matchMedia) return true;
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return false;
  return true;
}

export function resolveDarkMode() {
  const stored = readStoredValue(DARK_MODE_KEY, DARK_MODE_KEY_LEGACY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return prefersDarkMode();
}

export function applyDarkMode(enabled) {
  document.documentElement.classList.toggle('dark', enabled);
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = enabled ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
}

export function saveDarkMode(enabled) {
  writeStoredValue(DARK_MODE_KEY, String(enabled), DARK_MODE_KEY_LEGACY);
}

export function clampLinkAmount(value) {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n)) return MIN_LINK_AMOUNT;
  return Math.min(MAX_LINK_AMOUNT, Math.max(MIN_LINK_AMOUNT, n));
}

export function getLinkAmount() {
  return clampLinkAmount(readStoredValue(LINK_AMOUNT_KEY, LINK_AMOUNT_KEY_LEGACY));
}

export function saveLinkAmount(amount) {
  writeStoredValue(LINK_AMOUNT_KEY, String(amount), LINK_AMOUNT_KEY_LEGACY);
}

export function getOpenGroup() {
  return readStoredValue(OPEN_GROUP_KEY, OPEN_GROUP_KEY_LEGACY) || '';
}

export function saveOpenGroup(name) {
  if (name) writeStoredValue(OPEN_GROUP_KEY, name, OPEN_GROUP_KEY_LEGACY);
  else removeStoredValue(OPEN_GROUP_KEY, OPEN_GROUP_KEY_LEGACY);
}

export function getOpenTags() {
  return normalizeOpenTags(readStoredValue(OPEN_TAG_KEY, OPEN_TAG_KEY_LEGACY));
}

export function saveOpenTags(names) {
  const tags = [...new Set(normalizeOpenTags(names))];
  if (tags.length > 0) writeStoredValue(OPEN_TAG_KEY, JSON.stringify(tags), OPEN_TAG_KEY_LEGACY);
  else removeStoredValue(OPEN_TAG_KEY, OPEN_TAG_KEY_LEGACY);
}
