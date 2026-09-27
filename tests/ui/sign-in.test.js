import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sessionState = { session: null };

vi.mock('../../src/data/supabase/config.js', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseUrl: () => 'https://proj.supabase.co',
  getSupabaseAnonKey: () => 'anon',
}));

vi.mock('../../src/auth/session.js', () => ({
  getSession: () => sessionState.session,
}));

import { applyAuthView, enterLocalMode, needsSignIn } from '../../src/ui/sign-in.js';

function mount() {
  document.body.className = 'is-booting';
  document.body.innerHTML = `
    <div class="settings"></div>
    <section id="sign-in-page" hidden></section>
    <div id="app-shell"></div>
  `;
}

describe('sign-in gate', () => {
  beforeEach(() => {
    sessionState.session = null;
    mount();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.className = '';
  });

  it('should show the sign-in panel when configured and signed out', () => {
    expect(needsSignIn()).toBe(true);
    applyAuthView();
    expect(document.body.classList.contains('is-signed-out')).toBe(true);
    expect(document.body.classList.contains('is-booting')).toBe(false);
    expect(document.getElementById('sign-in-page').hidden).toBe(false);
    expect(document.getElementById('app-shell').hidden).toBe(true);
  });

  it('should show the app when local mode is chosen', () => {
    expect(needsSignIn()).toBe(true);
    enterLocalMode();
    expect(needsSignIn()).toBe(false);
    expect(document.body.classList.contains('is-signed-out')).toBe(false);
    expect(document.getElementById('sign-in-page').hidden).toBe(true);
    expect(document.getElementById('app-shell').hidden).toBe(false);
  });

  it('should show the app when a session exists', () => {
    sessionState.session = { access_token: 'token' };
    expect(needsSignIn()).toBe(false);
    applyAuthView();
    expect(document.body.classList.contains('is-signed-out')).toBe(false);
    expect(document.getElementById('sign-in-page').hidden).toBe(true);
    expect(document.getElementById('app-shell').hidden).toBe(false);
  });
});
