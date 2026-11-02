-- Keep the existing table names and IDs so visits, media, and old integrations survive.
alter table public.restaurants
  add column place_type text not null default 'restaurant'
    check (place_type in ('restaurant', 'activity'));

alter table public.articles
  add column review_type text not null default 'restaurant'
    check (review_type in ('restaurant', 'activity')),
  add column overall_score numeric(3,1)
    check (overall_score between 0 and 10);

update public.articles as article
set review_type = case
  when article.restaurant_id is not null then 'restaurant'
  when article.kind = 'experience_review' then 'activity'
  when category.slug in ('explore', 'save', 'stories') then 'activity'
  else 'restaurant'
end
from public.categories as category
where category.id = article.category_id;

update public.articles
set review_type = 'activity'
where kind = 'experience_review' and restaurant_id is null;

update public.article_seo as seo
set canonical_url = 'https://vegasunfiltered.com/'
  || case when article.review_type = 'activity' then 'activities' else 'restaurants' end
  || '/' || article.slug
from public.articles as article
where seo.article_id = article.id
  and seo.canonical_url ~ '^https://vegasunfiltered\.com/(eat|drink|explore|save|stories)/'
  and regexp_replace(seo.canonical_url, '^https://vegasunfiltered\.com/(eat|drink|explore|save|stories)/', '') in (article.slug, article.slug || '/');

create or replace function public.save_review(p_review jsonb)
returns table(id uuid, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  review_type_value text := p_review ->> 'reviewType';
  score_value numeric := nullif(p_review ->> 'overallScore', '')::numeric;
  place_id uuid := nullif(p_review ->> 'restaurantId', '')::uuid;
  selected_place public.restaurants%rowtype;
  saved record;
  saved_context record;
begin
  if auth.uid() is null or not public.has_cms_role(array['owner', 'editor', 'contributor']) then
    raise exception using errcode = '42501', message = 'CMS access is required.';
  end if;
  if review_type_value is null or review_type_value not in ('restaurant', 'activity') then
    raise exception using errcode = '22023', message = 'Choose a restaurant or activity review.';
  end if;
  if score_value is not null and (score_value < 0 or score_value > 10 or round(score_value, 1) <> score_value) then
    raise exception using errcode = '22023', message = 'The overall score must be between 0 and 10, with at most one decimal place.';
  end if;
  if place_id is not null then
    select * into selected_place from public.restaurants where restaurants.id = place_id;
    if not found or selected_place.place_type <> review_type_value then
      raise exception using errcode = '22023', message = 'Choose a place matching the review type.';
    end if;
  end if;
  select * into saved from public.save_article(
    nullif(p_review ->> 'id', '')::uuid,
    nullif(p_review ->> 'expectedUpdatedAt', '')::timestamptz,
    p_review ->> 'title',
    p_review ->> 'subtitle',
    p_review ->> 'slug',
    case when review_type_value = 'activity' then 'experience_review'::public.article_kind
      else 'restaurant_review'::public.article_kind end,
    nullif(p_review ->> 'categoryId', '')::uuid,
    p_review -> 'content',
    p_review -> 'seo',
    array(select jsonb_array_elements_text(p_review -> 'tags'))
  );
  select * into saved_context from public.set_article_editorial_context(
    saved.id, saved.updated_at,
    nullif(p_review ->> 'featuredMediaId', '')::uuid,
    nullif(p_review ->> 'openGraphMediaId', '')::uuid,
    place_id,
    nullif(p_review ->> 'neighborhoodId', '')::uuid,
    (p_review ->> 'isSponsored')::boolean
  );
  return query
    update public.articles
    set review_type = review_type_value, overall_score = score_value
    where articles.id = saved.id
    returning articles.id, articles.updated_at;
end
$$;

revoke all on function public.save_review(jsonb) from public;
grant execute on function public.save_review(jsonb) to authenticated;

create or replace function public.check_review_place_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.place_type <> old.place_type and exists (
    select 1 from public.articles where restaurant_id = new.id
  ) then
    raise exception using errcode = '22023', message = 'A place linked to reviews cannot change type.';
  end if;
  return new;
end
$$;

create trigger check_review_place_type
  before update of place_type on public.restaurants
  for each row execute function public.check_review_place_type();
