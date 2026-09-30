import { describe, expect, it } from 'vitest';
import { bindDisclosure, bindSectionToggle, fillSelect } from '../../src/ui/dom.js';

describe('fillSelect', () => {
  it('should add All plus the given values and keep a known selection', () => {
    const select = document.createElement('select');
    const current = fillSelect(select, ['Main', 'Work'], 'Work');
    expect(current).toBe('Work');
    expect([...select.options].map((option) => option.value)).toEqual(['', 'Main', 'Work']);
    expect([...select.options].map((option) => option.textContent)).toEqual(['All', 'MAIN', 'WORK']);
    expect(select.value).toBe('Work');
  });

  it('should fall back to All when the selection is gone', () => {
    const select = document.createElement('select');
    expect(fillSelect(select, ['Main'], 'Missing')).toBe('');
    expect(select.value).toBe('');
  });
});

describe('bindDisclosure', () => {
  it('should toggle hidden and aria-expanded', () => {
    const toggle = document.createElement('button');
    const panel = document.createElement('div');
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    bindDisclosure(toggle, panel);

    toggle.click();
    expect(panel.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    expect(panel.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('bindSectionToggle', () => {
  it('should add the header arrow and collapse the section body', () => {
    const toggle = document.createElement('button');
    const panel = document.createElement('div');
    toggle.setAttribute('aria-expanded', 'true');
    bindSectionToggle(toggle, panel);

    expect(toggle.querySelector('.tree-arrow')).toBeTruthy();
    toggle.click();
    expect(panel.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
