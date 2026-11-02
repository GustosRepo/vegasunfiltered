create table public.cms_idle_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_active_at timestamptz not null default now()
);
alter table public.cms_idle_sessions enable row level security;
revoke all on public.cms_idle_sessions from anon, authenticated;

-- Only a newly authenticated Supabase session can acquire an inactivity lease.
create or replace function public.cms_session_deadline(p_touch boolean default false)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_key uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  active_at timestamptz;
  current_time_value timestamptz := clock_timestamp();
begin
  if auth.uid() is null or session_key is null then return null; end if;
  if not exists (select 1 from auth.sessions where id = session_key and user_id = auth.uid()) then
    return null;
  end if;
  insert into public.cms_idle_sessions(session_id, user_id, last_active_at)
    select session_key, auth.uid(), current_time_value
    from auth.sessions
    where id = session_key and user_id = auth.uid()
      and created_at > current_time_value - interval '1 minute'
    on conflict do nothing;
  select last_active_at into active_at from public.cms_idle_sessions
    where session_id = session_key and user_id = auth.uid() for update;
  if active_at is null or active_at + interval '30 minutes' <= current_time_value then
    return null;
  end if;
  if p_touch then
    update public.cms_idle_sessions set last_active_at = current_time_value
      where session_id = session_key;
    active_at := current_time_value;
  end if;
  return active_at + interval '30 minutes';
end
$$;
revoke all on function public.cms_session_deadline(boolean) from public;
grant execute on function public.cms_session_deadline(boolean) to authenticated;

create or replace function public.cms_session_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cms_idle_sessions as lease
    join auth.sessions as session on session.id = lease.session_id
    where lease.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and lease.user_id = auth.uid() and session.user_id = auth.uid()
      and lease.last_active_at + interval '30 minutes' > now()
  )
$$;
revoke all on function public.cms_session_is_active() from public;
grant execute on function public.cms_session_is_active() to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'categories', 'tags', 'neighborhoods', 'articles',
    'article_seo', 'article_tags', 'restaurants', 'restaurant_visits',
    'media', 'article_media', 'affiliate_links', 'editorial_activity'
  ] loop
    execute format(
      'create policy cms_idle_limit on public.%I as restrictive for all to authenticated
       using ((select public.cms_session_is_active()))
       with check ((select public.cms_session_is_active()))', table_name);
  end loop;
end
$$;

create policy cms_storage_idle_limit on storage.objects
  as restrictive for all to authenticated
  using (bucket_id not in ('editorial-media', 'private-receipts') or (select public.cms_session_is_active()))
  with check (bucket_id not in ('editorial-media', 'private-receipts') or (select public.cms_session_is_active()));
