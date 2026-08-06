alter table public.trips
  add column notes text;

create table public.trip_days (
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trip_id, trip_date)
);

alter table public.trip_days enable row level security;

create policy "Trip members can view day notes"
  on public.trip_days for select
  using (public.can_access_trip(trip_id));

create policy "Trip members can create day notes"
  on public.trip_days for insert
  with check (public.can_access_trip(trip_id));

create policy "Trip members can update day notes"
  on public.trip_days for update
  using (public.can_access_trip(trip_id))
  with check (public.can_access_trip(trip_id));

create policy "Trip members can delete day notes"
  on public.trip_days for delete
  using (public.can_access_trip(trip_id));
