alter table public.trip_days
  add column title text;

alter table public.trip_days
  add constraint trip_days_title_check check (
    title is null or char_length(trim(title)) between 1 and 200
  );
