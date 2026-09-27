create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_name_len check (char_length(name) between 1 and 64),
  constraint groups_not_reserved check (lower(name) <> 'tags')
);

create unique index groups_user_name on public.groups (user_id, lower(name));
create index groups_user_pos on public.groups (user_id, position);

create table public.links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  group_id   uuid not null references public.groups (id) on delete cascade,
  url        text not null,
  name       text not null default '',
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint links_url_len check (char_length(url) between 8 and 4096),
  constraint links_url_http check (url ~* '^https?://'),
  constraint links_name_len check (char_length(name) <= 200),
  constraint links_user_url unique (user_id, url)
);

create index links_user_group on public.links (user_id, group_id, position);

create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  color_light text not null,
  color_dark  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint tags_name_len check (char_length(name) between 1 and 128),
  constraint tags_name_pattern check (name ~ '^[A-Za-z0-9]+$'),
  constraint tags_color_light check (color_light ~* '^#[0-9a-f]{6}$'),
  constraint tags_color_dark check (color_dark ~* '^#[0-9a-f]{6}$')
);

create unique index tags_user_name on public.tags (user_id, name);

create table public.link_tags (
  user_id uuid not null references auth.users (id) on delete cascade,
  link_id uuid not null references public.links (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete restrict,
  primary key (link_id, tag_id)
);

alter table public.groups enable row level security;
alter table public.links enable row level security;
alter table public.tags enable row level security;
alter table public.link_tags enable row level security;

create policy groups_own on public.groups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy links_own on public.links
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy tags_own on public.tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy link_tags_own on public.link_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.replace_collection(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  group_row jsonb;
  link_row jsonb;
  tag_row jsonb;
  group_id uuid;
  link_id uuid;
  tag_id uuid;
  group_pos int := 0;
  link_pos int := 0;
  tag_name text;
  link_count int;
  group_count int;
  tag_count int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if jsonb_typeof(coalesce(payload->'groups', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(payload->'tags', '[]'::jsonb)) <> 'array' then
    raise exception 'invalid payload';
  end if;

  select coalesce(jsonb_array_length(payload->'groups'), 0) into group_count;
  select coalesce(jsonb_array_length(payload->'tags'), 0) into tag_count;
  select coalesce(sum(jsonb_array_length(coalesce(g->'links', '[]'::jsonb))), 0)
    into link_count
    from jsonb_array_elements(coalesce(payload->'groups', '[]'::jsonb)) as g;

  if group_count > 100 then
    raise exception 'too many groups';
  end if;
  if link_count > 5000 then
    raise exception 'too many links';
  end if;
  if tag_count > 1000 then
    raise exception 'too many tags';
  end if;

  delete from public.groups where user_id = uid;
  delete from public.tags where user_id = uid;

  for tag_row in
    select value from jsonb_array_elements(coalesce(payload->'tags', '[]'::jsonb))
  loop
    insert into public.tags (user_id, name, color_light, color_dark)
    values (
      uid,
      tag_row->>'name',
      lower(coalesce(tag_row->>'color_light', tag_row->>'color-light', '')),
      lower(coalesce(tag_row->>'color_dark', tag_row->>'color-dark', ''))
    );
  end loop;

  for group_row in
    select value from jsonb_array_elements(coalesce(payload->'groups', '[]'::jsonb))
  loop
    insert into public.groups (user_id, name, position)
    values (uid, group_row->>'name', group_pos)
    returning id into group_id;
    group_pos := group_pos + 1;
    link_pos := 0;

    for link_row in
      select value from jsonb_array_elements(coalesce(group_row->'links', '[]'::jsonb))
    loop
      insert into public.links (user_id, group_id, url, name, position)
      values (
        uid,
        group_id,
        case
          when jsonb_typeof(link_row) = 'string' then link_row #>> '{}'
          else coalesce(link_row->>'url', '')
        end,
        case
          when jsonb_typeof(link_row) = 'string' then ''
          else coalesce(link_row->>'name', '')
        end,
        link_pos
      )
      returning id into link_id;
      link_pos := link_pos + 1;

      for tag_name in
        select jsonb_array_elements_text(coalesce(link_row->'tags', '[]'::jsonb))
      loop
        select id into tag_id
        from public.tags
        where user_id = uid and name = tag_name;
        if tag_id is not null then
          insert into public.link_tags (user_id, link_id, tag_id)
          values (uid, link_id, tag_id)
          on conflict do nothing;
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;

revoke all on function public.replace_collection(jsonb) from public;
grant execute on function public.replace_collection(jsonb) to authenticated;
grant select, insert, update, delete on public.groups, public.links, public.tags, public.link_tags to authenticated;
