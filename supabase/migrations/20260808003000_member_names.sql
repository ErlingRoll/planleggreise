alter table public.trip_members
  add column name text;

alter table public.trip_access_requests
  add column requester_name text;

update public.trip_members as members
set name = coalesce(
  nullif(users.raw_user_meta_data ->> 'full_name', ''),
  nullif(users.raw_user_meta_data ->> 'name', '')
)
from auth.users
where users.id = members.user_id
  and members.name is null;
