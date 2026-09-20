import { describe, expect, it, vi } from 'vitest';
import {
  applyDarkMode,
  clampLinkAmount,
  getLinkAmount,
  getOpenGroup,
  getOpenTags,
  resolveDarkMode,
  saveLinkAmount,
  saveOpenGroup,
  saveOpenTags,
} from '../../src/data/preferences.js';

describe('clampLinkAmount', () => {
  it('should clamp to 1-10 and default invalid values to 1', () => {
    expect(clampLinkAmount('4')).toBe(4);
    expect(clampLinkAmount('0')).toBe(1);
    expect(clampLinkAmount('99')).toBe(10);
    expect(clampLinkAmount('nope')).toBe(1);
  });
});

describe('saved preferences', () => {
  it('should store and read the link amount', () => {
    saveLinkAmount(7);
    expect(getLinkAmount()).toBe(7);
  });

  it('should store a group filter and clear it when empty', () => {
    saveOpenGroup('Work');
    expect(getOpenGroup()).toBe('Work');
    saveOpenGroup('');
    expect(getOpenGroup()).toBe('');
  });

  it('should store unique open tags as JSON and accept a legacy single tag', () => {
    saveOpenTags(['Work', 'Work', 'Home']);
    expect(getOpenTags()).toEqual(['Work', 'Home']);
    localStorage.removeItem('orl.openTag');
    localStorage.setItem('openTag', 'Solo');
    expect(getOpenTags()).toEqual(['Solo']);
    saveOpenTags([]);
    expect(localStorage.getItem('openTag')).toBeNull();
    expect(localStorage.getItem('orl.openTag')).toBeNull();
  });
});

describe('dark mode', () => {
  it('should use the stored value before the system preference', () => {
    localStorage.setItem('darkMode', 'false');
    expect(resolveDarkMode()).toBe(false);
    localStorage.setItem('darkMode', 'true');
    expect(resolveDarkMode()).toBe(true);
  });

  it('should fall back to the system preference', () => {
    vi.stubGlobal('matchMedia', (query) => ({
      matches: query.includes('light'),
      addEventListener() {},
    }));
    expect(resolveDarkMode()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('should toggle the document class and theme-color', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
    applyDarkMode(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(meta.content).toBe('#1a2c22');
    applyDarkMode(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(meta.content).toBe('#e4f6e9');
  });
});
