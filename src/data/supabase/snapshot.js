import { supabaseRest, supabaseRpc } from './client.js';

function snapshotPayload(store) {
  return {
    groups: (store.groups || []).map((group) => ({
      name: group.name,
      links: (group.links || []).map((link) => ({
        url: link.url,
        name: link.name || '',
        tags: Array.isArray(link.tags) ? link.tags : [],
      })),
    })),
    tags: (store.tags || []).map((tag) => ({
      name: tag.name,
      color_light: tag.colorLight || tag['color-light'] || '',
      color_dark: tag.colorDark || tag['color-dark'] || '',
    })),
  };
}

export async function loadSnapshot() {
  const [groups, links, tags, linkTags] = await Promise.all([
    supabaseRest('/groups?select=id,name,position&order=position.asc'),
    supabaseRest('/links?select=id,group_id,url,name,position&order=position.asc'),
    supabaseRest('/tags?select=id,name,color_light,color_dark'),
    supabaseRest('/link_tags?select=link_id,tag_id'),
  ]);

  const tagsById = new Map((tags || []).map((tag) => [tag.id, tag.name]));
  const tagsByLink = new Map();
  for (const row of linkTags || []) {
    const name = tagsById.get(row.tag_id);
    if (!name) continue;
    const list = tagsByLink.get(row.link_id) || [];
    list.push(name);
    tagsByLink.set(row.link_id, list);
  }

  const groupsById = new Map();
  const storeGroups = (groups || []).map((group) => {
    const item = { name: group.name, links: [] };
    groupsById.set(group.id, item);
    return item;
  });

  for (const link of links || []) {
    const group = groupsById.get(link.group_id);
    if (!group) continue;
    group.links.push({
      url: link.url,
      name: link.name || '',
      tags: tagsByLink.get(link.id) || [],
    });
  }

  return {
    groups: storeGroups,
    tags: (tags || []).map((tag) => ({
      name: tag.name,
      colorLight: tag.color_light,
      colorDark: tag.color_dark,
    })),
  };
}

export async function replaceSnapshot(store) {
  await supabaseRpc('replace_collection', { payload: snapshotPayload(store) });
}
