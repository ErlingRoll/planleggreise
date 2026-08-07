alter table public.trip_members
  add column email text;

insert into public.trip_members (trip_id, user_id, email)
select id, owner_id, null
from public.trips
on conflict (trip_id, user_id) do nothing;

create index trip_members_user_id_idx on public.trip_members(user_id);

create table public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'revoked')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trip_invitations_trip_id_idx
  on public.trip_invitations(trip_id);

create unique index trip_invitations_pending_email_idx
  on public.trip_invitations(trip_id, lower(email))
  where status = 'pending';

create table public.trip_access_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index trip_access_links_trip_id_idx
  on public.trip_access_links(trip_id);

create table public.trip_access_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  source text not null check (source in ('email', 'link')),
  invitation_id uuid references public.trip_invitations(id) on delete set null,
  access_link_id uuid references public.trip_access_links(id) on delete set null,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'denied')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_access_requests_source_reference_valid check (
    (source = 'email' and invitation_id is not null and access_link_id is null)
    or (source = 'link' and invitation_id is null and access_link_id is not null)
  )
);

create index trip_access_requests_trip_id_idx
  on public.trip_access_requests(trip_id);

create unique index trip_access_requests_pending_user_idx
  on public.trip_access_requests(trip_id, requester_id)
  where status = 'pending';

create or replace function public.get_trip_owner_email(target_trip_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.trip_members
  where trip_id = target_trip_id
    and (
      public.can_access_trip(target_trip_id)
      or exists (
        select 1
        from public.trip_access_requests
        where trip_id = target_trip_id
          and requester_id = auth.uid()
          and status = 'pending'
      )
    )
    and user_id = (
      select owner_id
      from public.trips
      where id = target_trip_id
    )
  limit 1;
$$;

grant execute on function public.get_trip_owner_email(uuid) to authenticated;

alter table public.trip_invitations enable row level security;
alter table public.trip_access_links enable row level security;
alter table public.trip_access_requests enable row level security;

create policy "Trip owners can view invitations"
  on public.trip_invitations for select
  using (public.is_trip_owner(trip_id));

create policy "Invitees can view their invitations"
  on public.trip_invitations for select
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Trip owners can create invitations"
  on public.trip_invitations for insert
  with check (
    public.is_trip_owner(trip_id)
    and inviter_id = auth.uid()
  );

create policy "Trip owners can update invitations"
  on public.trip_invitations for update
  using (public.is_trip_owner(trip_id))
  with check (public.is_trip_owner(trip_id));

create policy "Trip owners can view access links"
  on public.trip_access_links for select
  using (public.is_trip_owner(trip_id));

create policy "Trip owners can create access links"
  on public.trip_access_links for insert
  with check (
    public.is_trip_owner(trip_id)
    and created_by = auth.uid()
  );

create policy "Trip owners can revoke access links"
  on public.trip_access_links for update
  using (public.is_trip_owner(trip_id))
  with check (public.is_trip_owner(trip_id));

create or replace function public.get_trip_access_link(
  target_trip_id uuid,
  target_token text
)
returns table (
  id uuid,
  trip_id uuid,
  token text,
  revoked_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, trip_id, token, revoked_at, created_at
  from public.trip_access_links
  where trip_id = target_trip_id
    and token = target_token
    and revoked_at is null;
$$;

grant execute on function public.get_trip_access_link(uuid, text) to authenticated;

create policy "Trip owners and requesters can view access requests"
  on public.trip_access_requests for select
  using (
    public.is_trip_owner(trip_id)
    or requester_id = auth.uid()
  );

create policy "Authenticated users can create access requests"
  on public.trip_access_requests for insert
  with check (
    requester_id = auth.uid()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Trip owners can update access requests"
  on public.trip_access_requests for update
  using (public.is_trip_owner(trip_id))
  with check (public.is_trip_owner(trip_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'trips',
    'trip_days',
    'activities',
    'meals',
    'housing_stays',
    'trip_members',
    'trip_invitations',
    'trip_access_links',
    'trip_access_requests'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end;
$$;
