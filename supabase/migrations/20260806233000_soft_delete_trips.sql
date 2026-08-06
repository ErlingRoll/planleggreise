alter table public.trips
  add column deleted_at timestamptz;

create index trips_deleted_at_idx on public.trips(deleted_at);

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
      and deleted_at is null
  );
$$;

create or replace function public.can_access_trip(target_trip_id uuid)
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
      and deleted_at is null
      and (
        owner_id = auth.uid()
        or exists (
          select 1
          from public.trip_members
          where trip_id = target_trip_id
            and user_id = auth.uid()
        )
      )
  );
$$;

create policy "Owners can archive trips"
  on public.trips for update
  using (public.is_trip_owner(id))
  with check (owner_id = auth.uid());
