import { getAccessToken } from '../../auth/session.js';
import { getSupabaseAnonKey, getSupabaseUrl } from './config.js';

export async function supabaseFetch(path, { method = 'GET', body, headers, raw = false } = {}) {
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
    if (raw && response.status === 416) return { data: [], response };
    const message = data?.error_description || data?.msg || data?.message || response.statusText;
    const error = new Error(message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  if (raw) return { data, response };
  return data;
}

export async function supabaseRest(path, options) {
  return supabaseFetch(`/rest/v1${path}`, options);
}

const REST_PAGE_SIZE = 1000;
const REST_MAX_PAGES = 500;

function contentRangeTotal(header) {
  const match = String(header || '').match(/\/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function contentRangeEnd(header) {
  const match = String(header || '').match(/(\d+)-(\d+)\//);
  return match ? Number(match[2]) : null;
}

// PostgREST returns at most 1000 rows per response. Page until Content-Range is exhausted.
export async function supabaseRestAll(path) {
  const rows = [];
  let offset = 0;
  let total = null;

  for (let page = 0; page < REST_MAX_PAGES; page += 1) {
    const { data, response } = await supabaseFetch(`/rest/v1${path}`, {
      headers: {
        Range: `${offset}-${offset + REST_PAGE_SIZE - 1}`,
        Prefer: 'count=exact',
      },
      raw: true,
    });
    const range = response.headers.get('Content-Range');
    total = contentRangeTotal(range) ?? total;

    if (response.status === 416) {
      if (total == null || rows.length < total) throw new Error('Could not load the full collection');
      return rows;
    }

    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (total != null && rows.length >= total) return rows;
    if (batch.length === 0 || (total == null && batch.length < REST_PAGE_SIZE)) return rows;

    const next = contentRangeEnd(range);
    const nextOffset = next == null ? offset + batch.length : next + 1;
    if (nextOffset <= offset) throw new Error('Could not load the full collection');
    offset = nextOffset;
  }

  throw new Error('Could not load the full collection');
}

export async function supabaseRpc(name, payload) {
  return supabaseFetch(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    body: payload,
  });
}
