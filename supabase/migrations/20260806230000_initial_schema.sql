create extension if not exists "pgcrypto";

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_date_range_valid check (end_date >= start_date)
);

create index trips_owner_id_idx on public.trips(owner_id);

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table public.housing_stays (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  check_in date not null,
  check_out date not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint housing_stays_date_range_valid check (check_out > check_in)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_date date not null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  start_time time without time zone,
  end_time time without time zone,
  all_day boolean not null default false,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint activities_time_range_valid check (
    end_time is null or start_time is null or end_time >= start_time
  )
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_date date not null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  start_time time without time zone,
  end_time time without time zone,
  all_day boolean not null default false,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint meals_time_range_valid check (
    end_time is null or start_time is null or end_time >= start_time
  )
);

create or replace function public.is_trip_owner(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips
    where id = target_trip_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.can_access_trip(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_trip_owner(target_trip_id)
    or exists (
      select 1
      from public.trip_members
      where trip_id = target_trip_id
        and user_id = auth.uid()
    );
$$;

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.housing_stays enable row level security;
alter table public.activities enable row level security;
alter table public.meals enable row level security;

create policy "Users can view trips they can access"
  on public.trips for select
  using (public.can_access_trip(id));

create policy "Users can create trips for themselves"
  on public.trips for insert
  with check (owner_id = auth.uid());

create policy "Trip members can update trips"
  on public.trips for update
  using (public.can_access_trip(id))
  with check (public.can_access_trip(id));

create policy "Owners can delete trips"
  on public.trips for delete
  using (public.is_trip_owner(id));

create policy "Users can view trip membership"
  on public.trip_members for select
  using (user_id = auth.uid() or public.can_access_trip(trip_id));

create policy "Owners can manage trip membership"
  on public.trip_members for insert
  with check (public.is_trip_owner(trip_id));

create policy "Owners can remove trip membership"
  on public.trip_members for delete
  using (public.is_trip_owner(trip_id));

create policy "Trip members can view housing"
  on public.housing_stays for select
  using (public.can_access_trip(trip_id));

create policy "Trip members can create housing"
  on public.housing_stays for insert
  with check (public.can_access_trip(trip_id));

create policy "Trip members can update housing"
  on public.housing_stays for update
  using (public.can_access_trip(trip_id))
  with check (public.can_access_trip(trip_id));

create policy "Trip members can delete housing"
  on public.housing_stays for delete
  using (public.can_access_trip(trip_id));

create policy "Trip members can view activities"
  on public.activities for select
  using (public.can_access_trip(trip_id));

create policy "Trip members can create activities"
  on public.activities for insert
  with check (public.can_access_trip(trip_id));

create policy "Trip members can update activities"
  on public.activities for update
  using (public.can_access_trip(trip_id))
  with check (public.can_access_trip(trip_id));

create policy "Trip members can delete activities"
  on public.activities for delete
  using (public.can_access_trip(trip_id));

create policy "Trip members can view meals"
  on public.meals for select
  using (public.can_access_trip(trip_id));

create policy "Trip members can create meals"
  on public.meals for insert
  with check (public.can_access_trip(trip_id));

create policy "Trip members can update meals"
  on public.meals for update
  using (public.can_access_trip(trip_id))
  with check (public.can_access_trip(trip_id));

create policy "Trip members can delete meals"
  on public.meals for delete
  using (public.can_access_trip(trip_id));
