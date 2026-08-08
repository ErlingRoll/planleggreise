alter table public.housing_stays
  add column google_maps_url text,
  add column place_name text,
  add column place_address text,
  add column latitude double precision,
  add column longitude double precision;

alter table public.housing_stays
  add constraint housing_stays_google_maps_url_valid
  check (
    google_maps_url is null
    or google_maps_url ~ '^https://'
  );
