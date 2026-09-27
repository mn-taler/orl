import { startGoogleSignIn } from '../auth/google.js';
import { getSession } from '../auth/session.js';
import { getUseLocal, saveUseLocal } from '../data/preferences.js';
import { isSupabaseConfigured } from '../data/supabase/config.js';

export function needsSignIn() {
  return isSupabaseConfigured() && !getSession() && !getUseLocal();
}

export function applyAuthView() {
  const gate = needsSignIn();
  document.body.classList.toggle('is-signed-out', gate);
  const signInPage = document.getElementById('sign-in-page');
  const appShell = document.getElementById('app-shell');
  if (signInPage) signInPage.hidden = !gate;
  if (appShell) appShell.hidden = gate;
  document.body.classList.remove('is-booting');
}

export function enterLocalMode() {
  saveUseLocal(true);
  applyAuthView();
}

export function leaveLocalMode() {
  saveUseLocal(false);
  applyAuthView();
}

export function initSignIn({ setStatus, onUseLocal }) {
  applyAuthView();
  const googleButton = document.getElementById('google-sign-in-button');
  googleButton?.addEventListener('click', async () => {
    try {
      await startGoogleSignIn();
    } catch (error) {
      setStatus('settings', error.message || 'Could not start sign-in', 'error');
    }
  });

  const localButton = document.getElementById('use-local-button');
  localButton?.addEventListener('click', () => {
    enterLocalMode();
    onUseLocal?.();
  });
}
