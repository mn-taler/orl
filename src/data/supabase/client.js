import { getAccessToken } from '../../auth/session.js';
import { getSupabaseAnonKey, getSupabaseUrl } from './config.js';

export async function supabaseFetch(path, { method = 'GET', body, headers } = {}) {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) throw new Error('Supabase is not configured');

  const token = getAccessToken() || anon;
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
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
    const message = data?.error_description || data?.msg || data?.message || response.statusText;
    const error = new Error(message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function supabaseRest(path, options) {
  return supabaseFetch(`/rest/v1${path}`, options);
}

export async function supabaseRpc(name, payload) {
  return supabaseFetch(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    body: payload,
  });
}
