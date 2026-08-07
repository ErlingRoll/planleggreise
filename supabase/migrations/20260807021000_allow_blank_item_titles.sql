alter table public.activities
  alter column title drop not null;

alter table public.activities
  drop constraint activities_title_check;

alter table public.activities
  add constraint activities_title_check check (
    title is null or char_length(trim(title)) between 1 and 200
  );

alter table public.meals
  alter column title drop not null;

alter table public.meals
  drop constraint meals_title_check;

alter table public.meals
  add constraint meals_title_check check (
    title is null or char_length(trim(title)) between 1 and 200
  );
