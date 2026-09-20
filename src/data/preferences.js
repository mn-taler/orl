import {
  DARK_MODE_KEY,
  LINK_AMOUNT_KEY,
  MAX_LINK_AMOUNT,
  MIN_LINK_AMOUNT,
  OPEN_GROUP_KEY,
  OPEN_TAG_KEY,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
} from '../config.js';
import { normalizeOpenTags } from '../domain/tags.js';

export function prefersDarkMode() {
  if (!window.matchMedia) return true;
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return false;
  return true;
}

export function resolveDarkMode() {
  const stored = localStorage.getItem(DARK_MODE_KEY);
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
  localStorage.setItem(DARK_MODE_KEY, String(enabled));
}

export function clampLinkAmount(value) {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n)) return MIN_LINK_AMOUNT;
  return Math.min(MAX_LINK_AMOUNT, Math.max(MIN_LINK_AMOUNT, n));
}

export function getLinkAmount() {
  return clampLinkAmount(localStorage.getItem(LINK_AMOUNT_KEY));
}

export function saveLinkAmount(amount) {
  localStorage.setItem(LINK_AMOUNT_KEY, String(amount));
}

export function getOpenGroup() {
  return localStorage.getItem(OPEN_GROUP_KEY) || '';
}

export function saveOpenGroup(name) {
  if (name) localStorage.setItem(OPEN_GROUP_KEY, name);
  else localStorage.removeItem(OPEN_GROUP_KEY);
}

export function getOpenTags() {
  return normalizeOpenTags(localStorage.getItem(OPEN_TAG_KEY));
}

export function saveOpenTags(names) {
  const tags = [...new Set(normalizeOpenTags(names))];
  if (tags.length > 0) localStorage.setItem(OPEN_TAG_KEY, JSON.stringify(tags));
  else localStorage.removeItem(OPEN_TAG_KEY);
}
