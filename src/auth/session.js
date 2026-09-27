import { AUTH_PKCE_KEY, AUTH_SESSION_KEY } from '../config.js';
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from '../data/supabase/config.js';

let currentSession = null;

function readStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  if (!session) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    currentSession = null;
    return;
  }
  currentSession = session;
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function getSession() {
  return currentSession;
}

export function getAccessToken() {
  return currentSession?.access_token || '';
}

async function authFetch(path, { method = 'POST', body, token } = {}) {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  const headers = {
    apikey: anon,
    Authorization: `Bearer ${token || anon}`,
    'Content-Type': 'application/json',
  };
  const response = await fetch(`${url}/auth/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const error = new Error(data?.error_description || data?.msg || data?.message || 'Auth request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

function sessionFromTokenResponse(data) {
  if (!data?.access_token) return null;
  const expiresIn = Number(data.expires_in) || 3600;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || '',
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: data.user || currentSession?.user || null,
  };
}

function clearAuthParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.hash = '';
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, next || url.pathname);
}

function parseHashTokens(hash) {
  const params = new URLSearchParams((hash || '').replace(/^#/, ''));
  const access_token = params.get('access_token');
  if (!access_token) return null;
  const expiresIn = Number(params.get('expires_in')) || 3600;
  return {
    access_token,
    refresh_token: params.get('refresh_token') || '',
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: null,
  };
}

async function loadUser(session) {
  if (!session?.access_token) return session;
  try {
    const user = await authFetch('/user', { method: 'GET', token: session.access_token });
    session.user = user;
  } catch {
    /* keep tokens without profile */
  }
  return session;
}

async function refreshSession(session) {
  if (!session?.refresh_token) return null;
  const data = await authFetch('/token?grant_type=refresh_token', {
    body: { refresh_token: session.refresh_token },
  });
  const next = sessionFromTokenResponse(data);
  if (!next) return null;
  if (!next.user) next.user = session.user || null;
  return next;
}

function isExpired(session) {
  if (!session?.expires_at) return true;
  return session.expires_at <= Math.floor(Date.now() / 1000) + 60;
}

export async function initSession() {
  currentSession = readStoredSession();
  if (!isSupabaseConfigured()) return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    const verifier = sessionStorage.getItem(AUTH_PKCE_KEY) || '';
    sessionStorage.removeItem(AUTH_PKCE_KEY);
    const data = await authFetch('/token?grant_type=pkce', {
      body: { auth_code: code, code_verifier: verifier },
    });
    const session = await loadUser(sessionFromTokenResponse(data));
    writeStoredSession(session);
    clearAuthParams();
    return session;
  }

  const hashed = parseHashTokens(window.location.hash);
  if (hashed) {
    const session = await loadUser(hashed);
    writeStoredSession(session);
    clearAuthParams();
    return session;
  }

  if (!currentSession) return null;
  if (!isExpired(currentSession)) {
    if (!currentSession.user) {
      currentSession = await loadUser(currentSession);
      writeStoredSession(currentSession);
    }
    return currentSession;
  }

  try {
    const session = await loadUser(await refreshSession(currentSession));
    writeStoredSession(session);
    return session;
  } catch {
    writeStoredSession(null);
    return null;
  }
}

export async function signOut() {
  const token = currentSession?.access_token;
  writeStoredSession(null);
  sessionStorage.removeItem(AUTH_PKCE_KEY);
  if (!isSupabaseConfigured() || !token) return;
  try {
    await authFetch('/logout', { token });
  } catch {
    /* already signed out locally */
  }
}

export function redirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}
