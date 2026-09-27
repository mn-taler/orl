import { AUTH_PKCE_KEY } from '../config.js';
import { getSupabaseUrl, isSupabaseConfigured } from '../data/supabase/config.js';
import { redirectUrl } from './session.js';

function base64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomVerifier() {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function challengeFrom(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export async function startGoogleSignIn() {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
  const verifier = randomVerifier();
  const challenge = await challengeFrom(verifier);
  sessionStorage.setItem(AUTH_PKCE_KEY, verifier);

  const url = new URL(`${getSupabaseUrl()}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', redirectUrl());
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  window.location.assign(url.toString());
}
