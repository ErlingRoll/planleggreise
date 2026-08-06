alter table public.activities
  add column google_maps_url text,
  add column place_name text,
  add column place_address text;

alter table public.activities
  add constraint activities_google_maps_url_valid
  check (
    google_maps_url is null
    or google_maps_url ~ '^https://'
  );
