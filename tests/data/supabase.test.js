import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/data/supabase/config.js', () => ({
  getSupabaseUrl: () => 'https://proj.supabase.co',
  getSupabaseAnonKey: () => 'anon',
  isSupabaseConfigured: () => true,
}));

import { loadSnapshot, replaceSnapshot } from '../../src/data/supabase/snapshot.js';

describe('snapshot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should assemble a store from rest rows', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const path = String(url);
      let body = [];
      if (path.includes('/groups')) {
        body = [{ id: 'g1', name: 'Work', position: 0 }];
      } else if (path.includes('/links')) {
        body = [{ id: 'l1', group_id: 'g1', url: 'https://a.example/', name: 'A', position: 0 }];
      } else if (path.includes('/link_tags')) {
        body = [{ link_id: 'l1', tag_id: 't1' }];
      } else if (path.includes('/tags')) {
        body = [{ id: 't1', name: 'Alpha', color_light: '#1c51ba', color_dark: '#2e6be5' }];
      }
      return new Response(JSON.stringify(body), { status: 200 });
    }));

    const store = await loadSnapshot();
    expect(store.groups[0]).toMatchObject({
      name: 'Work',
      links: [{ url: 'https://a.example/', name: 'A', tags: ['Alpha'] }],
    });
    expect(store.tags[0].name).toBe('Alpha');
  });

  it('should post a replace_collection payload', async () => {
    const fetchMock = vi.fn(async () => new Response('null', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await replaceSnapshot({
      groups: [{ name: 'Work', links: [{ url: 'https://a.example/', name: '', tags: [] }] }],
      tags: [],
    });
    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      payload: {
        groups: [{ name: 'Work', links: [{ url: 'https://a.example/', name: '', tags: [] }] }],
        tags: [],
      },
    });
  });
});
