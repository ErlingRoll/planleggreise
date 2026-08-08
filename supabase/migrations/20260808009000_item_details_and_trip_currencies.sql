alter table public.trips
  add column accepted_currencies text[] not null default '{}';

alter table public.trips
  add constraint trips_accepted_currencies_valid check (
    cardinality(accepted_currencies) <= 50
    and array_to_string(accepted_currencies, ',') !~ '[^A-Z,]'
  );

alter table public.activities
  add column price_amount numeric(20, 2),
  add column price_currency text,
  add column website text,
  add constraint activities_price_amount_valid check (price_amount is null or price_amount >= 0),
  add constraint activities_price_currency_valid check (
    price_currency is null or price_currency ~ '^[A-Z]{3}$'
  ),
  add constraint activities_price_details_complete check (
    (price_amount is null) = (price_currency is null)
  ),
  add constraint activities_website_valid check (
    website is null or char_length(website) <= 2000
  );

alter table public.meals
  add column price_amount numeric(20, 2),
  add column price_currency text,
  add column website text,
  add constraint meals_price_amount_valid check (price_amount is null or price_amount >= 0),
  add constraint meals_price_currency_valid check (
    price_currency is null or price_currency ~ '^[A-Z]{3}$'
  ),
  add constraint meals_price_details_complete check (
    (price_amount is null) = (price_currency is null)
  ),
  add constraint meals_website_valid check (
    website is null or char_length(website) <= 2000
  );

alter table public.housing_stays
  add column price_amount numeric(20, 2),
  add column price_currency text,
  add column website text,
  add constraint housing_stays_price_amount_valid check (price_amount is null or price_amount >= 0),
  add constraint housing_stays_price_currency_valid check (
    price_currency is null or price_currency ~ '^[A-Z]{3}$'
  ),
  add constraint housing_stays_price_details_complete check (
    (price_amount is null) = (price_currency is null)
  ),
  add constraint housing_stays_website_valid check (
    website is null or char_length(website) <= 2000
  );
