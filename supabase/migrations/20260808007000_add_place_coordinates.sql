alter table public.activities
  add column latitude double precision,
  add column longitude double precision;

alter table public.meals
  add column latitude double precision,
  add column longitude double precision;
