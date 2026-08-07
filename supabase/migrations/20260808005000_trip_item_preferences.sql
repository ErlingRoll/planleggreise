create table public.trip_item_preferences (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete cascade,
  housing_stay_id uuid references public.housing_stays(id) on delete cascade,
  value text not null check (value in ('green', 'yellow', 'red')),
  updated_at timestamptz not null default now(),
  constraint exactly_one_preference_item check (
    num_nonnulls(activity_id, meal_id, housing_stay_id) = 1
  )
);

create unique index trip_item_preferences_activity_idx
  on public.trip_item_preferences(trip_id, user_id, activity_id)
  where activity_id is not null;

create unique index trip_item_preferences_meal_idx
  on public.trip_item_preferences(trip_id, user_id, meal_id)
  where meal_id is not null;

create unique index trip_item_preferences_housing_idx
  on public.trip_item_preferences(trip_id, user_id, housing_stay_id)
  where housing_stay_id is not null;

alter table public.trip_item_preferences enable row level security;

create policy "Trip members can view item preferences"
  on public.trip_item_preferences for select
  using (public.can_access_trip(trip_id));

create policy "Trip members can create their own item preferences"
  on public.trip_item_preferences for insert
  with check (
    user_id = auth.uid()
    and public.can_access_trip(trip_id)
  );

create policy "Members can update their own item preferences"
  on public.trip_item_preferences for update
  using (
    user_id = auth.uid()
    and public.can_access_trip(trip_id)
  )
  with check (
    user_id = auth.uid()
    and public.can_access_trip(trip_id)
  );

create policy "Members can delete their own item preferences"
  on public.trip_item_preferences for delete
  using (
    user_id = auth.uid()
    and public.can_access_trip(trip_id)
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_item_preferences'
  ) then
    alter publication supabase_realtime add table public.trip_item_preferences;
  end if;
end
$$;
