-- Validate at the row boundary so manual transitions and scheduled publishing agree.
create or replace function public.require_review_publication_place()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Keep unrelated edits to legacy, already-live reviews possible.
  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status
      and new.restaurant_id is not distinct from old.restaurant_id
      and new.review_type is not distinct from old.review_type then
      return new;
    end if;
  end if;
  if new.status in ('scheduled', 'published') then
    if new.restaurant_id is null or not exists (
      select 1 from public.restaurants
      where id = new.restaurant_id and place_type = new.review_type
    ) then
      raise exception using errcode = '22023',
        message = 'Link a matching restaurant or activity place before scheduling or publishing this review. Unlinked drafts can still be saved.';
    end if;
  end if;
  return new;
end
$$;

create trigger require_review_publication_place
  before insert or update of status, restaurant_id, review_type on public.articles
  for each row execute function public.require_review_publication_place();
