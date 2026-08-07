alter table public.activities
  add column is_backup boolean not null default false;

alter table public.activities
  alter column trip_date drop not null;

alter table public.meals
  add column is_backup boolean not null default false;

alter table public.meals
  alter column trip_date drop not null;

alter table public.housing_stays
  add column is_backup boolean not null default false;

alter table public.housing_stays
  alter column check_in drop not null,
  alter column check_out drop not null;

alter table public.activities
  add constraint activities_backup_date_valid check (
    is_backup or trip_date is not null
  );

alter table public.meals
  add constraint meals_backup_date_valid check (
    is_backup or trip_date is not null
  );

alter table public.housing_stays
  add constraint housing_stays_backup_dates_valid check (
    is_backup or (check_in is not null and check_out is not null)
  ),
  add constraint housing_stays_backup_range_valid check (
    check_in is null or check_out is null or check_out > check_in
  );

create index activities_trip_backup_idx
  on public.activities(trip_id, is_backup, trip_date, sort_order);

create index meals_trip_backup_idx
  on public.meals(trip_id, is_backup, trip_date, sort_order);

create index housing_stays_trip_backup_idx
  on public.housing_stays(trip_id, is_backup, check_in);
