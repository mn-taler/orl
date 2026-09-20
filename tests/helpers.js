export function makeLink(url, extras = {}) {
  return {
    url,
    name: extras.name || '',
    tags: extras.tags ? extras.tags.slice() : [],
  };
}

export function makeGroup(name, links = [], subgroups = []) {
  return { name, links, subgroups };
}

export function makeStore(groups, tags = []) {
  return {
    groups: groups.map((group) => ({
      name: group.name,
      links: group.links || [],
      subgroups: group.subgroups || [],
    })),
    tags,
  };
}
