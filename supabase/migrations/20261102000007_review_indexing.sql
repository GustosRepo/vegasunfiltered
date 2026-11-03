-- Keep the SEO checkbox effective when an already-published review is saved.
-- Previously is_indexable was only set during a publishing transition, so
-- enabling indexing on a live, noindex review could never make it discoverable.
create or replace function public.sync_review_indexing()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.articles
  set is_indexable = (status = 'published' and new.indexing_enabled)
  where id = new.article_id
    and is_indexable is distinct from (status = 'published' and new.indexing_enabled);
  return new;
end
$$;

create trigger sync_review_indexing
  after insert or update of indexing_enabled on public.article_seo
  for each row execute function public.sync_review_indexing();
