create extension if not exists pgcrypto;

create type public.cms_role as enum ('owner', 'editor', 'contributor');
create type public.article_status as enum (
  'draft',
  'in_review',
  'approved',
  'scheduled',
  'published',
  'archived'
);
create type public.article_kind as enum (
  'editorial_story',
  'restaurant_review',
  'seo_guide',
  'neighborhood_guide',
  'experience_review'
);
create type public.visit_status as enum ('planned', 'visited', 'reported');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role public.cms_role not null default 'contributor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  featured_media_id uuid,
  seo_title text,
  meta_description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text not null default '',
  slug text not null,
  kind public.article_kind not null default 'editorial_story',
  category_id uuid references public.categories (id) on delete set null,
  author_id uuid not null references public.profiles (id) on delete restrict,
  status public.article_status not null default 'draft',
  review_status public.article_status not null default 'draft',
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  featured_media_id uuid,
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  restaurant_id uuid,
  canonical_url text,
  is_indexable boolean not null default false,
  published_at timestamptz,
  scheduled_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint articles_content_document check (
    jsonb_typeof(content) = 'object'
    and content ->> 'type' = 'doc'
  ),
  constraint articles_published_timestamp check (
    status <> 'published' or published_at is not null
  ),
  constraint articles_scheduled_timestamp check (
    status <> 'scheduled' or scheduled_at is not null
  ),
  constraint articles_archived_timestamp check (
    status <> 'archived' or archived_at is not null
  )
);

create unique index articles_slug_unique on public.articles (lower(slug));
create index articles_status_updated_idx on public.articles (status, updated_at desc);
create index articles_author_status_idx on public.articles (author_id, status);
create index articles_published_idx on public.articles (published_at desc)
  where status = 'published' and is_indexable = true;
create index articles_category_idx on public.articles (category_id, published_at desc);

create table public.article_seo (
  article_id uuid primary key references public.articles (id) on delete cascade,
  seo_title text,
  meta_description text,
  canonical_url text,
  open_graph_media_id uuid,
  primary_keyword text,
  secondary_keywords text[] not null default '{}',
  internal_linking_notes text not null default '',
  indexing_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text not null default '',
  cuisine text not null default '',
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  address text not null default '',
  city text not null default 'Las Vegas',
  state text not null default 'NV',
  postal_code text not null default '',
  website text,
  phone text,
  price_range text,
  parking_information text not null default '',
  reservation_information text not null default '',
  operating_hours jsonb not null default '{}'::jsonb,
  featured_media_id uuid,
  gallery_media_ids uuid[] not null default '{}',
  visit_status public.visit_status not null default 'planned',
  internal_notes text not null default '',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create unique index restaurants_slug_unique on public.restaurants (lower(slug));
create index restaurants_name_idx on public.restaurants (lower(name));

alter table public.articles
  add constraint articles_restaurant_fk
  foreign key (restaurant_id) references public.restaurants (id) on delete set null;

create table public.restaurant_visits (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  visited_at date not null,
  party_size integer not null check (party_size > 0),
  food_subtotal numeric(10, 2) not null default 0 check (food_subtotal >= 0),
  drinks_subtotal numeric(10, 2) not null default 0 check (drinks_subtotal >= 0),
  additional_charges numeric(10, 2) not null default 0 check (additional_charges >= 0),
  sales_tax numeric(10, 2) not null default 0 check (sales_tax >= 0),
  tip numeric(10, 2) not null default 0 check (tip >= 0),
  calculated_total numeric(10, 2) generated always as (
    food_subtotal + drinks_subtotal + additional_charges + sales_tax + tip
  ) stored,
  manual_total_override numeric(10, 2)
    check (manual_total_override is null or manual_total_override >= 0),
  final_total numeric(10, 2) generated always as (
    coalesce(
      manual_total_override,
      food_subtotal + drinks_subtotal + additional_charges + sales_tax + tip
    )
  ) stored,
  currency char(3) not null default 'USD' check (currency = 'USD'),
  receipt_storage_path text,
  public_receipt_storage_path text,
  items_ordered jsonb not null default '[]'::jsonb
    check (jsonb_typeof(items_ordered) = 'array'),
  experience_notes text not null default '',
  would_return boolean,
  editorial_verdict text not null default '',
  article_id uuid references public.articles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurant_visits_restaurant_date_idx
  on public.restaurant_visits (restaurant_id, visited_at desc);
create index restaurant_visits_article_idx
  on public.restaurant_visits (article_id) where article_id is not null;

create table public.media (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null check (storage_bucket in ('editorial-media', 'private-receipts')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  ),
  file_size bigint not null check (file_size > 0 and file_size <= 15728640),
  width integer,
  height integer,
  alt_text text not null default '',
  caption text not null default '',
  photographer_credit text not null default '',
  is_public boolean not null default false,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint media_public_bucket_consistency check (
    (storage_bucket = 'editorial-media' and is_public)
    or (storage_bucket = 'private-receipts' and not is_public)
  )
);

create index media_created_idx on public.media (created_at desc);
create index media_uploaded_by_idx on public.media (uploaded_by, created_at desc);

alter table public.neighborhoods
  add constraint neighborhoods_featured_media_fk
  foreign key (featured_media_id) references public.media (id) on delete set null;
alter table public.articles
  add constraint articles_featured_media_fk
  foreign key (featured_media_id) references public.media (id) on delete set null;
alter table public.article_seo
  add constraint article_seo_open_graph_media_fk
  foreign key (open_graph_media_id) references public.media (id) on delete set null;
alter table public.restaurants
  add constraint restaurants_featured_media_fk
  foreign key (featured_media_id) references public.media (id) on delete set null;

create table public.article_media (
  article_id uuid not null references public.articles (id) on delete cascade,
  media_id uuid not null references public.media (id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (article_id, media_id)
);

create table public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  destination_url text not null check (destination_url ~ '^https://'),
  disclosure text not null default '',
  article_id uuid references public.articles (id) on delete set null,
  is_active boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.editorial_activity (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index editorial_activity_created_idx
  on public.editorial_activity (created_at desc);

create or replace function public.cms_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'cms_role', '')
$$;

create or replace function public.has_cms_role(allowed_roles text[])
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.cms_role() = any (allowed_roles)
$$;

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := case
    when new.raw_app_meta_data ->> 'cms_role' in ('owner', 'editor', 'contributor')
      then new.raw_app_meta_data ->> 'cms_role'
    else 'contributor'
  end;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    requested_role::public.cms_role
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = case
        when excluded.display_name <> '' then excluded.display_name
        else public.profiles.display_name
      end,
      role = excluded.role,
      updated_at = now();
  return new;
end
$$;

create trigger on_auth_user_profile_sync
  after insert or update of raw_app_meta_data, email on auth.users
  for each row execute function public.sync_profile_from_auth();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create or replace function public.log_article_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_action text;
begin
  if tg_op = 'INSERT' then
    activity_action := 'created';
  elsif old.status is distinct from new.status then
    activity_action := 'status_changed';
  else
    activity_action := 'updated';
  end if;

  insert into public.editorial_activity (
    actor_id, entity_type, entity_id, action, details
  ) values (
    auth.uid(),
    'article',
    new.id,
    activity_action,
    jsonb_build_object(
      'title', new.title,
      'status', new.status,
      'previous_status', case when tg_op = 'UPDATE' then old.status else null end
    )
  );
  return new;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'neighborhoods', 'articles', 'article_seo',
    'restaurants', 'restaurant_visits', 'affiliate_links'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end
$$;

create trigger articles_activity
  after insert or update on public.articles
  for each row execute function public.log_article_activity();

insert into public.categories (name, slug) values
  ('Eat', 'eat'),
  ('Drink', 'drink'),
  ('Explore', 'explore'),
  ('Save', 'save'),
  ('Stories', 'stories')
on conflict (slug) do nothing;

insert into public.neighborhoods (name, slug) values
  ('Chinatown', 'chinatown'),
  ('Downtown Las Vegas', 'downtown-las-vegas'),
  ('Arts District', 'arts-district'),
  ('Henderson', 'henderson'),
  ('Summerlin', 'summerlin'),
  ('Spring Valley', 'spring-valley'),
  ('Enterprise', 'enterprise')
on conflict (slug) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.articles enable row level security;
alter table public.article_seo enable row level security;
alter table public.article_tags enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_visits enable row level security;
alter table public.media enable row level security;
alter table public.article_media enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.editorial_activity enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.tags to anon, authenticated;
grant select on public.articles to anon, authenticated;
grant select on public.article_seo to anon, authenticated;
grant select on public.article_tags to anon, authenticated;
grant select on public.neighborhoods to anon, authenticated;
grant select on public.media to anon;
grant select on public.restaurants to authenticated;
grant select on public.restaurant_visits to authenticated;
grant select on public.media to authenticated;
grant select on public.article_media to authenticated;
grant select on public.affiliate_links to authenticated;
grant select on public.editorial_activity to authenticated;
grant insert, update, delete on public.categories, public.tags, public.neighborhoods,
  public.articles, public.article_seo, public.article_tags, public.restaurants,
  public.restaurant_visits, public.media, public.article_media,
  public.affiliate_links to authenticated;
grant usage, select on sequence public.editorial_activity_id_seq to authenticated;

create policy "Profiles readable by self and editors"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.has_cms_role(array['owner', 'editor']));
create policy "Profile display name can be changed by self"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Published categories are public"
  on public.categories for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.category_id = categories.id
        and a.status = 'published'
        and a.published_at <= now()
    )
    or public.has_cms_role(array['owner', 'editor', 'contributor'])
  );
create policy "Editors manage categories"
  on public.categories for all to authenticated
  using (public.has_cms_role(array['owner', 'editor']))
  with check (public.has_cms_role(array['owner', 'editor']));

create policy "Tags are visible to signed-in staff"
  on public.tags for select to authenticated
  using (public.has_cms_role(array['owner', 'editor', 'contributor']));
create policy "Editors manage tags"
  on public.tags for all to authenticated
  using (public.has_cms_role(array['owner', 'editor', 'contributor']))
  with check (public.has_cms_role(array['owner', 'editor', 'contributor']));

create policy "Published neighborhoods are public"
  on public.neighborhoods for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.neighborhood_id = neighborhoods.id
        and a.status = 'published'
        and a.is_indexable
        and a.published_at <= now()
    )
    or public.has_cms_role(array['owner', 'editor', 'contributor'])
  );
create policy "Editors manage neighborhoods"
  on public.neighborhoods for all to authenticated
  using (public.has_cms_role(array['owner', 'editor']))
  with check (public.has_cms_role(array['owner', 'editor']));

create policy "Public can read published indexable articles"
  on public.articles for select to anon, authenticated
  using (
    (status = 'published' and published_at <= now())
    or (auth.uid() = author_id and status in ('draft', 'in_review'))
    or public.has_cms_role(array['owner', 'editor'])
  );
create policy "Contributors create drafts"
  on public.articles for insert to authenticated
  with check (
    (public.has_cms_role(array['owner', 'editor']))
    or (
      public.cms_role() = 'contributor'
      and author_id = (select auth.uid())
      and status = 'draft'
      and not is_indexable
    )
  );
create policy "Contributors edit own unpublished articles"
  on public.articles for update to authenticated
  using (
    public.has_cms_role(array['owner', 'editor'])
    or (author_id = (select auth.uid()) and status in ('draft', 'in_review'))
  )
  with check (
    public.has_cms_role(array['owner', 'editor'])
    or (
      author_id = (select auth.uid())
      and status in ('draft', 'in_review')
      and not is_indexable
    )
  );
create policy "Editors delete articles"
  on public.articles for delete to authenticated
  using (public.has_cms_role(array['owner', 'editor']));

create policy "SEO readable for published articles or staff"
  on public.article_seo for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_seo.article_id
        and a.status = 'published'
        and a.published_at <= now()
        and a.is_indexable
    )
    or public.has_cms_role(array['owner', 'editor', 'contributor'])
  );
create policy "Editors and article authors manage SEO"
  on public.article_seo for all to authenticated
  using (
    public.has_cms_role(array['owner', 'editor'])
    or exists (
      select 1 from public.articles a
      where a.id = article_seo.article_id and a.author_id = (select auth.uid())
    )
  )
  with check (
    public.has_cms_role(array['owner', 'editor'])
    or exists (
      select 1 from public.articles a
      where a.id = article_seo.article_id and a.author_id = (select auth.uid())
    )
  );

create policy "Article tags visible for public stories or staff"
  on public.article_tags for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_tags.article_id
        and a.status = 'published'
        and a.published_at <= now()
        and a.is_indexable
    )
    or public.has_cms_role(array['owner', 'editor', 'contributor'])
  );
create policy "Editors manage article tags"
  on public.article_tags for all to authenticated
  using (
    public.has_cms_role(array['owner', 'editor'])
    or exists (
      select 1 from public.articles a
      where a.id = article_tags.article_id
        and a.author_id = (select auth.uid())
        and a.status in ('draft', 'in_review')
    )
  )
  with check (
    public.has_cms_role(array['owner', 'editor'])
    or exists (
      select 1 from public.articles a
      where a.id = article_tags.article_id
        and a.author_id = (select auth.uid())
        and a.status in ('draft', 'in_review')
    )
  );

create policy "Restaurants are staff-only unless published in article"
  on public.restaurants for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.restaurant_id = restaurants.id
        and a.status = 'published'
        and a.published_at <= now()
    )
    or public.has_cms_role(array['owner', 'editor', 'contributor'])
  );
create policy "Editors manage restaurants"
  on public.restaurants for all to authenticated
  using (public.has_cms_role(array['owner', 'editor']))
  with check (public.has_cms_role(array['owner', 'editor']));

create policy "Visits are private to authorized staff"
  on public.restaurant_visits for select to authenticated
  using (public.has_cms_role(array['owner', 'editor']));
create policy "Editors manage visits"
  on public.restaurant_visits for all to authenticated
  using (public.has_cms_role(array['owner', 'editor']))
  with check (public.has_cms_role(array['owner', 'editor']));

create policy "Public media records visible"
  on public.media for select to authenticated
  using (
    (storage_bucket = 'editorial-media' and is_public)
    or public.has_cms_role(array['owner', 'editor', 'contributor'])
  );
create policy "Public can read public editorial media metadata"
  on public.media for select to anon
  using (storage_bucket = 'editorial-media' and is_public);
create policy "Staff can register media uploads"
  on public.media for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and public.has_cms_role(array['owner', 'editor', 'contributor'])
  );
create policy "Editors and media owner may update media metadata"
  on public.media for update to authenticated
  using (uploaded_by = (select auth.uid()) or public.has_cms_role(array['owner', 'editor']))
  with check (uploaded_by = (select auth.uid()) or public.has_cms_role(array['owner', 'editor']));
create policy "Editors and media owner may delete media"
  on public.media for delete to authenticated
  using (uploaded_by = (select auth.uid()) or public.has_cms_role(array['owner', 'editor']));

create policy "Article media visible for published articles or staff"
  on public.article_media for select to anon, authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_media.article_id
        and a.status = 'published'
        and a.published_at <= now()
        and a.is_indexable
    )
    or public.has_cms_role(array['owner', 'editor', 'contributor'])
  );
create policy "Editors manage article media"
  on public.article_media for all to authenticated
  using (public.has_cms_role(array['owner', 'editor']))
  with check (public.has_cms_role(array['owner', 'editor']));

create policy "Editors manage affiliate links"
  on public.affiliate_links for all to authenticated
  using (public.has_cms_role(array['owner', 'editor']))
  with check (public.has_cms_role(array['owner', 'editor']));

create policy "Editors read editorial activity"
  on public.editorial_activity for select to authenticated
  using (public.has_cms_role(array['owner', 'editor']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editorial-media',
  'editorial-media',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
), (
  'private-receipts',
  'private-receipts',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read editorial media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'editorial-media');
create policy "Staff upload editorial media in own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'editorial-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.has_cms_role(array['owner', 'editor', 'contributor'])
  );
create policy "Staff can update own editorial media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'editorial-media'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
      or public.has_cms_role(array['owner', 'editor']))
  )
  with check (
    bucket_id = 'editorial-media'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
      or public.has_cms_role(array['owner', 'editor']))
  );
create policy "Staff delete own editorial media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'editorial-media'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
      or public.has_cms_role(array['owner', 'editor']))
  );

create policy "Editors read private receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'private-receipts'
    and public.has_cms_role(array['owner', 'editor'])
  );
create policy "Editors upload private receipts in own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'private-receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.has_cms_role(array['owner', 'editor'])
  );
create policy "Editors update own private receipts"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'private-receipts'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
      or public.has_cms_role(array['owner']))
  )
  with check (
    bucket_id = 'private-receipts'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
      or public.has_cms_role(array['owner']))
  );
create policy "Editors delete own private receipts"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'private-receipts'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
      or public.has_cms_role(array['owner']))
  );

create or replace function public.published_receipt_paths(p_article_ids uuid[])
returns table(article_id uuid, storage_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select article.id, visit.public_receipt_storage_path
  from public.restaurant_visits as visit
  join public.articles as article on article.id = visit.article_id
  where article.id = any(p_article_ids)
   and article.status = 'published'
   and article.published_at <= now()
   and visit.public_receipt_storage_path is not null
  order by visit.visited_at desc
$$;

revoke all on function public.published_receipt_paths(uuid[]) from public;
grant execute on function public.published_receipt_paths(uuid[]) to anon, authenticated;
