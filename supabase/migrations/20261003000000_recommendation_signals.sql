alter table public.products
  add column if not exists brand text not null default '';

alter table public.interactions
  add column if not exists search_query text,
  add column if not exists recommendation_source text;
