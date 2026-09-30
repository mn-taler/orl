import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/data/supabase/config.js', () => ({
  getSupabaseUrl: () => 'https://proj.supabase.co',
  getSupabaseAnonKey: () => 'anon',
  isSupabaseConfigured: () => true,
}));

import { supabaseRestAll } from '../../src/data/supabase/client.js';
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

  it('should include link tags from later pages', async () => {
    const firstPage = Array.from({ length: 1000 }, () => ({ link_id: 'l1', tag_id: 't1' }));
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      const path = String(url);
      const range = options?.headers?.Range || '';
      let body = [];
      let status = 200;
      let contentRange = null;
      if (path.includes('/groups')) {
        body = [{ id: 'g1', name: 'Work', position: 0 }];
      } else if (path.includes('/links')) {
        body = [{ id: 'l1', group_id: 'g1', url: 'https://a.example/', name: 'A', position: 0 }];
      } else if (path.includes('/link_tags')) {
        if (range.startsWith('0-')) {
          body = firstPage;
          status = 206;
          contentRange = '0-999/1001';
        } else {
          body = [{ link_id: 'l1', tag_id: 't2' }];
          status = 206;
          contentRange = '1000-1000/1001';
        }
      } else if (path.includes('/tags')) {
        body = [
          { id: 't1', name: 'Alpha', color_light: '#1c51ba', color_dark: '#2e6be5' },
          { id: 't2', name: 'Beta', color_light: '#1c9bba', color_dark: '#2ec1e5' },
        ];
      }
      return new Response(JSON.stringify(body), {
        status,
        headers: contentRange ? { 'Content-Range': contentRange } : undefined,
      });
    }));

    const store = await loadSnapshot();
    expect(store.groups[0].links[0].tags.at(-1)).toBe('Beta');
    expect(store.groups[0].links[0].tags).toHaveLength(1001);
  });

  it('should stop when Content-Range already covers every row', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ id: 'g1' }]), {
      status: 200,
      headers: { 'Content-Range': '0-0/1' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(supabaseRestAll('/groups?select=id')).resolves.toEqual([{ id: 'g1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should refuse a short read when Content-Range says more rows exist', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return new Response(JSON.stringify(Array.from({ length: 1000 }, (_, index) => ({ id: String(index) }))), {
          status: 206,
          headers: { 'Content-Range': '0-999/1001' },
        });
      }
      return new Response('', {
        status: 416,
        headers: { 'Content-Range': '*/1001' },
      });
    }));

    await expect(supabaseRestAll('/links?select=id')).rejects.toThrow('Could not load the full collection');
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
