create table public.trip_visibility_settings (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  show_price boolean not null default true,
  show_website boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

alter table public.trip_visibility_settings enable row level security;

create policy "Users can view their trip visibility settings"
  on public.trip_visibility_settings for select
  using (
    user_id = auth.uid()
    and public.can_access_trip(trip_id)
  );

create policy "Users can create their trip visibility settings"
  on public.trip_visibility_settings for insert
  with check (
    user_id = auth.uid()
    and public.can_access_trip(trip_id)
  );

create policy "Users can update their trip visibility settings"
  on public.trip_visibility_settings for update
  using (
    user_id = auth.uid()
    and public.can_access_trip(trip_id)
  )
  with check (
    user_id = auth.uid()
    and public.can_access_trip(trip_id)
  );

