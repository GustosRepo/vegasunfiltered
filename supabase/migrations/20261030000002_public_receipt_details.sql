alter table public.restaurant_visits
  add column public_details_enabled boolean not null default false;

alter table public.articles
  add column is_sponsored boolean not null default false;

create or replace function public.published_receipt_details(p_article_ids uuid[])
returns table(
  article_id uuid,
  restaurant_name text,
  visited_at date,
  party_size integer,
  food_subtotal numeric,
  drinks_subtotal numeric,
  additional_charges numeric,
  sales_tax numeric,
  tip numeric,
  final_total numeric,
  total_adjusted boolean,
  items_ordered jsonb,
  would_return boolean,
  editorial_verdict text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    article.id,
    restaurant.name,
    visit.visited_at,
    visit.party_size,
    visit.food_subtotal,
    visit.drinks_subtotal,
    visit.additional_charges,
    visit.sales_tax,
    visit.tip,
    visit.final_total,
    visit.manual_total_override is not null,
    visit.items_ordered,
    visit.would_return,
    visit.editorial_verdict
  from public.restaurant_visits as visit
  join public.articles as article on article.id = visit.article_id
  join public.restaurants as restaurant on restaurant.id = visit.restaurant_id
  where article.id = any(p_article_ids)
    and article.status = 'published'
    and article.published_at <= now()
    and visit.public_details_enabled
  order by visit.visited_at desc
$$;

revoke all on function public.published_receipt_details(uuid[]) from public;
grant execute on function public.published_receipt_details(uuid[]) to anon, authenticated;

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
  current_role text := public.cms_role();
  existing public.articles%rowtype;
  saved public.articles%rowtype;
begin
  if auth.uid() is null or current_role not in ('owner', 'editor', 'contributor') then
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
  if current_role = 'contributor'
    and (existing.author_id <> auth.uid() or existing.status not in ('draft', 'in_review')) then
    raise exception using errcode = '42501', message = 'Contributors can only edit their own drafts.';
  end if;
  if current_role = 'contributor'
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

revoke all on function public.set_article_editorial_context(uuid, timestamptz, uuid, uuid, uuid, uuid, boolean) from public;
grant execute on function public.set_article_editorial_context(uuid, timestamptz, uuid, uuid, uuid, uuid, boolean) to authenticated;

create or replace function public.published_article_authors(p_article_ids uuid[])
returns table(article_id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select article.id, profile.display_name
  from public.articles as article
  join public.profiles as profile on profile.id = article.author_id
  where article.id = any(p_article_ids)
    and article.status = 'published'
    and article.published_at <= now()
    and nullif(trim(profile.display_name), '') is not null
$$;

revoke all on function public.published_article_authors(uuid[]) from public;
grant execute on function public.published_article_authors(uuid[]) to anon, authenticated;

create or replace function public.published_article_contexts(p_article_ids uuid[])
returns table(
  article_id uuid,
  restaurant_name text,
  cuisine text,
  address text,
  city text,
  state text,
  postal_code text,
  website text,
  neighborhood_name text,
  neighborhood_slug text,
  neighborhood_description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    article.id,
    restaurant.name,
    restaurant.cuisine,
    restaurant.address,
    restaurant.city,
    restaurant.state,
    restaurant.postal_code,
    restaurant.website,
    neighborhood.name,
    neighborhood.slug,
    neighborhood.description
  from public.articles as article
  left join public.restaurants as restaurant on restaurant.id = article.restaurant_id
  left join public.neighborhoods as neighborhood on neighborhood.id = article.neighborhood_id
  where article.id = any(p_article_ids)
    and article.status = 'published'
    and article.published_at <= now()
    and (article.restaurant_id is not null or article.neighborhood_id is not null)
$$;

revoke all on function public.published_article_contexts(uuid[]) from public;
grant execute on function public.published_article_contexts(uuid[]) to anon, authenticated;

create or replace function public.published_affiliate_links(p_article_ids uuid[])
returns table(article_id uuid, label text, destination_url text, disclosure text)
language sql
stable
security definer
set search_path = ''
as $$
  select affiliate.article_id, affiliate.label, affiliate.destination_url, affiliate.disclosure
  from public.affiliate_links as affiliate
  join public.articles as article on article.id = affiliate.article_id
  where affiliate.article_id = any(p_article_ids)
    and affiliate.is_active
    and article.status = 'published'
    and article.published_at <= now()
  order by affiliate.created_at
$$;

revoke all on function public.published_affiliate_links(uuid[]) from public;
grant execute on function public.published_affiliate_links(uuid[]) to anon, authenticated;

create or replace function public.publish_due_articles()
returns table(article_id uuid)
language sql
security definer
set search_path = ''
as $$
  update public.articles as article
  set status = 'published',
      review_status = 'published',
      published_at = coalesce(article.published_at, article.scheduled_at),
      scheduled_at = null,
      archived_at = null,
      is_indexable = coalesce((
        select seo.indexing_enabled
        from public.article_seo as seo
        where seo.article_id = article.id
      ), false)
  where article.status = 'scheduled'
    and article.scheduled_at <= now()
  returning article.id
$$;

revoke all on function public.publish_due_articles() from public, anon, authenticated;
grant execute on function public.publish_due_articles() to service_role;
