-- CURRENT_ROLE is a PostgreSQL SQL expression, so an unquoted reference to
-- current_role resolves to the database role (authenticated), not the PL/pgSQL
-- variable holding the signed CMS role. Replace the three affected functions
-- using a non-keyword variable. CREATE OR REPLACE preserves their grants and
-- SECURITY INVOKER keeps the existing row-level and idle-session policies.
-- Apply after migration 05; do not rerun the original schema migrations.

create or replace function public.save_article(
  p_article_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_subtitle text,
  p_slug text,
  p_kind public.article_kind,
  p_category_id uuid,
  p_content jsonb,
  p_seo jsonb,
  p_tags text[]
)
returns table (id uuid, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cms_role_value text := public.cms_role();
  existing public.articles%rowtype;
  saved public.articles%rowtype;
  clean_tag text;
  tag_slug text;
  tag_id uuid;
begin
  if auth.uid() is null or cms_role_value not in ('owner', 'editor', 'contributor') then
    raise exception using errcode = '42501', message = 'CMS access is required.';
  end if;
  if length(trim(p_title)) > 160 or length(trim(p_subtitle)) > 240 then
    raise exception using errcode = '22023', message = 'Headline or subtitle is too long.';
  end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'The article slug is invalid.';
  end if;
  if jsonb_typeof(p_content) <> 'object' or p_content ->> 'type' <> 'doc' then
    raise exception using errcode = '22023', message = 'The article content document is invalid.';
  end if;
  if p_seo is null or jsonb_typeof(p_seo) <> 'object' then
    raise exception using errcode = '22023', message = 'The SEO settings are invalid.';
  end if;
  if coalesce(jsonb_array_length(to_jsonb(p_tags)), 0) > 20 then
    raise exception using errcode = '22023', message = 'An article can have at most 20 tags.';
  end if;

  if p_article_id is null then
    insert into public.articles (
      title, subtitle, slug, kind, category_id, author_id, content, status
    ) values (
      trim(p_title),
      trim(p_subtitle),
      p_slug,
      p_kind,
      p_category_id,
      auth.uid(),
      p_content,
      'draft'
    )
    returning * into saved;
  else
    select * into existing
    from public.articles
    where articles.id = p_article_id
    for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'Article not found.';
    end if;
    if p_expected_updated_at is null or existing.updated_at <> p_expected_updated_at then
      raise exception using errcode = '40001', message = 'ARTICLE_CONFLICT';
    end if;
    if cms_role_value = 'contributor'
      and (existing.author_id <> auth.uid() or existing.status not in ('draft', 'in_review')) then
      raise exception using errcode = '42501', message = 'Contributors can only edit their own drafts.';
    end if;

    update public.articles
    set title = trim(p_title),
        subtitle = trim(p_subtitle),
        slug = p_slug,
        kind = p_kind,
        category_id = p_category_id,
        content = p_content
    where articles.id = p_article_id
    returning * into saved;
  end if;

  insert into public.article_seo (
    article_id,
    seo_title,
    meta_description,
    canonical_url,
    primary_keyword,
    secondary_keywords,
    internal_linking_notes,
    indexing_enabled
  ) values (
    saved.id,
    nullif(trim(p_seo ->> 'seo_title'), ''),
    nullif(trim(p_seo ->> 'meta_description'), ''),
    nullif(trim(p_seo ->> 'canonical_url'), ''),
    nullif(trim(p_seo ->> 'primary_keyword'), ''),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(p_seo -> 'secondary_keywords', '[]'::jsonb))),
      '{}'::text[]
    ),
    coalesce(p_seo ->> 'internal_linking_notes', ''),
    coalesce((p_seo ->> 'indexing_enabled')::boolean, false)
  )
  on conflict (article_id) do update
  set seo_title = excluded.seo_title,
      meta_description = excluded.meta_description,
      canonical_url = excluded.canonical_url,
      primary_keyword = excluded.primary_keyword,
      secondary_keywords = excluded.secondary_keywords,
      internal_linking_notes = excluded.internal_linking_notes,
      indexing_enabled = excluded.indexing_enabled,
      updated_at = now();

  delete from public.article_tags where article_id = saved.id;
  foreach clean_tag in array coalesce(p_tags, '{}'::text[]) loop
    clean_tag := trim(clean_tag);
    if clean_tag = '' then continue; end if;
    tag_slug := trim(both '-' from regexp_replace(lower(clean_tag), '[^a-z0-9]+', '-', 'g'));
    if tag_slug = '' then continue; end if;
    insert into public.tags (name, slug)
    values (clean_tag, tag_slug)
    on conflict (name) do update set name = excluded.name
    returning tags.id into tag_id;
    insert into public.article_tags (article_id, tag_id)
    values (saved.id, tag_id)
    on conflict do nothing;
  end loop;

  return query select saved.id, saved.updated_at;
end
$$;

create or replace function public.transition_article(
  p_article_id uuid,
  p_target_status public.article_status,
  p_scheduled_at timestamptz default null
)
returns public.articles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cms_role_value text := public.cms_role();
  existing public.articles%rowtype;
  changed public.articles%rowtype;
begin
  if auth.uid() is null or cms_role_value not in ('owner', 'editor', 'contributor') then
    raise exception using errcode = '42501', message = 'CMS access is required.';
  end if;

  select * into existing
  from public.articles
  where articles.id = p_article_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Article not found.';
  end if;

  if cms_role_value = 'contributor' then
    if existing.author_id <> auth.uid()
      or existing.status <> 'draft'
      or p_target_status <> 'in_review' then
      raise exception using errcode = '42501', message = 'Contributors can only submit their own drafts for review.';
    end if;
  elsif cms_role_value not in ('owner', 'editor') then
    raise exception using errcode = '42501', message = 'Editor access is required.';
  end if;

  if p_target_status = 'scheduled' then
    if existing.status not in ('approved', 'scheduled')
      or p_scheduled_at is null
      or p_scheduled_at <= now() then
      raise exception using errcode = '22023', message = 'Choose a future publication time for an approved article.';
    end if;
  elsif p_target_status = 'published' then
    if existing.status not in ('approved', 'scheduled', 'published')
      or (existing.status = 'scheduled' and existing.scheduled_at > now()) then
      raise exception using errcode = '22023', message = 'Approve the article before publishing; scheduled articles publish at their scheduled time.';
    end if;
  elsif p_target_status = 'approved' then
    if existing.status not in ('in_review', 'approved') then
      raise exception using errcode = '22023', message = 'Only articles in review can be approved.';
    end if;
  elsif p_target_status = 'in_review' then
    if existing.status not in ('draft', 'in_review') then
      raise exception using errcode = '22023', message = 'Only drafts can be submitted for review.';
    end if;
  elsif p_target_status = 'draft' then
    if existing.status not in ('in_review', 'approved', 'scheduled', 'published', 'archived') then
      raise exception using errcode = '22023', message = 'This article cannot be returned to draft.';
    end if;
  elsif p_target_status = 'archived' then
    if existing.status not in ('draft', 'in_review', 'approved', 'published') then
      raise exception using errcode = '22023', message = 'This article cannot be archived.';
    end if;
  else
    raise exception using errcode = '22023', message = 'Unsupported article status transition.';
  end if;

  update public.articles
  set status = p_target_status,
      review_status = p_target_status,
      scheduled_at = case when p_target_status = 'scheduled' then p_scheduled_at else null end,
      published_at = case
        when p_target_status = 'published' then coalesce(existing.published_at, now())
        else existing.published_at
      end,
      archived_at = case
        when p_target_status = 'archived' then now()
        else null
      end,
      is_indexable = case
        when p_target_status = 'published' then coalesce(
          (select article_seo.indexing_enabled
           from public.article_seo
           where article_seo.article_id = existing.id),
          false
        )
        else false
      end
  where articles.id = p_article_id
  returning * into changed;

  return changed;
end
$$;

create or replace function public.set_article_editorial_context(
  p_article_id uuid,
  p_expected_updated_at timestamptz,
  p_media_id uuid,
  p_open_graph_media_id uuid,
  p_restaurant_id uuid,
  p_neighborhood_id uuid,
  p_is_sponsored boolean
)
returns table(id uuid, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cms_role_value text := public.cms_role();
  existing public.articles%rowtype;
  saved public.articles%rowtype;
begin
  if auth.uid() is null or cms_role_value not in ('owner', 'editor', 'contributor') then
    raise exception using errcode = '42501', message = 'CMS access is required.';
  end if;

  select * into existing from public.articles
  where articles.id = p_article_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Article not found.';
  end if;
  if p_expected_updated_at is null or existing.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'ARTICLE_CONFLICT';
  end if;
  if cms_role_value = 'contributor'
    and (existing.author_id <> auth.uid() or existing.status not in ('draft', 'in_review')) then
    raise exception using errcode = '42501', message = 'Contributors can only edit their own drafts.';
  end if;
  if cms_role_value = 'contributor'
    and (p_restaurant_id is not null or p_neighborhood_id is not null or p_is_sponsored) then
    raise exception using errcode = '42501', message = 'Only editors can associate business context or mark sponsored content.';
  end if;
  if p_media_id is not null and not exists (
    select 1 from public.media
    where media.id = p_media_id
      and media.storage_bucket = 'editorial-media'
      and media.is_public
  ) then
    raise exception using errcode = '22023', message = 'The selected featured image is unavailable.';
  end if;
  if p_open_graph_media_id is not null and not exists (
    select 1 from public.media
    where media.id = p_open_graph_media_id
      and media.storage_bucket = 'editorial-media'
      and media.is_public
  ) then
    raise exception using errcode = '22023', message = 'The selected social sharing image is unavailable.';
  end if;
  if p_restaurant_id is not null and not exists (
    select 1 from public.restaurants where restaurants.id = p_restaurant_id
  ) then
    raise exception using errcode = '22023', message = 'The selected restaurant is unavailable.';
  end if;
  if p_neighborhood_id is not null and not exists (
    select 1 from public.neighborhoods where neighborhoods.id = p_neighborhood_id
  ) then
    raise exception using errcode = '22023', message = 'The selected neighborhood is unavailable.';
  end if;

  update public.articles
  set featured_media_id = p_media_id,
      restaurant_id = p_restaurant_id,
      neighborhood_id = p_neighborhood_id,
      is_sponsored = p_is_sponsored
  where articles.id = p_article_id
  returning * into saved;
  update public.article_seo
  set open_graph_media_id = p_open_graph_media_id
  where article_seo.article_id = p_article_id;
  return query select saved.id, saved.updated_at;
end
$$;

