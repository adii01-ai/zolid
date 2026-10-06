create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  credits integer not null default 0 check (credits >= 0),
  stripe_customer_id text unique,
  free_generations_used integer not null default 0 check (free_generations_used >= 0),
  free_generations_limit integer not null default 3 check (free_generations_limit >= 0),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists credits integer not null default 0,
  add column if not exists stripe_customer_id text,
  add column if not exists free_generations_used integer not null default 0,
  add column if not exists free_generations_limit integer not null default 3;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_credits_nonnegative') then
    alter table public.profiles add constraint profiles_credits_nonnegative check (credits >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_free_used_nonnegative') then
    alter table public.profiles add constraint profiles_free_used_nonnegative check (free_generations_used >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_free_limit_nonnegative') then
    alter table public.profiles add constraint profiles_free_limit_nonnegative check (free_generations_limit >= 0);
  end if;
end;
$$;

create table if not exists public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason text not null,
  job_id uuid,
  stripe_event_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.depth_generation_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('purchased', 'free')),
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.depth_generation_reservations
  add column if not exists preview_data_url text;

create index if not exists depth_generation_reservations_user_status
  on public.depth_generation_reservations(user_id, status, source, created_at);

alter table public.profiles enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.depth_generation_reservations enable row level security;

revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.credit_ledger from anon, authenticated;
revoke all on public.depth_generation_reservations from anon, authenticated;

create or replace function public.protect_generation_balances()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role') and (
    new.credits is distinct from old.credits or
    new.free_generations_used is distinct from old.free_generations_used or
    new.free_generations_limit is distinct from old.free_generations_limit
  ) then
    raise exception 'generation balances may only be changed by trusted server functions';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_generation_balances on public.profiles;
create trigger protect_generation_balances
  before update of credits, free_generations_used, free_generations_limit
  on public.profiles
  for each row execute function public.protect_generation_balances();

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own ledger read" on public.credit_ledger;
create policy "own ledger read" on public.credit_ledger
  for select using (auth.uid() = user_id);

drop policy if exists "users read own completed depth generations"
  on public.depth_generation_reservations;
create policy "users read own completed depth generations"
  on public.depth_generation_reservations
  for select using (auth.uid() = user_id and status = 'completed');
grant select on public.depth_generation_reservations to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, credits, free_generations_used, free_generations_limit)
  values (new.id, 0, 0, 3)
  on conflict (id) do nothing;
  return new;
end;
$$;

insert into public.profiles (id, credits, free_generations_used, free_generations_limit)
select id, 0, 0, 3 from auth.users
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.reserve_depth_generation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_credits integer;
  v_free_used integer;
  v_free_limit integer;
  v_reserved_purchased integer;
  v_reserved_free integer;
  v_source text;
  v_reservation uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select credits, free_generations_used, free_generations_limit
    into v_credits, v_free_used, v_free_limit
    from public.profiles
    where id = v_uid
    for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  update public.depth_generation_reservations
    set status = 'cancelled'
    where user_id = v_uid
      and status = 'reserved'
      and created_at < now() - interval '30 minutes';

  select count(*) filter (where source = 'purchased'),
         count(*) filter (where source = 'free')
    into v_reserved_purchased, v_reserved_free
    from public.depth_generation_reservations
    where user_id = v_uid and status = 'reserved';

  if v_credits > 0 then
    if v_credits <= v_reserved_purchased then
      raise exception 'generation_in_progress';
    end if;
    v_source := 'purchased';
  elsif v_free_used + v_reserved_free < v_free_limit then
    v_source := 'free';
  else
    raise exception 'generation_limit_reached';
  end if;

  insert into public.depth_generation_reservations(user_id, source)
    values (v_uid, v_source)
    returning id into v_reservation;

  return v_reservation;
end;
$$;

drop function if exists public.complete_depth_generation(uuid);

create or replace function public.complete_depth_generation(
  p_reservation_id uuid,
  p_preview_data_url text
)
returns table(free_generations_used integer, free_generations_limit integer, purchased_credits integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_source text;
  v_status text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  select source, status into v_source, v_status
    from public.depth_generation_reservations
    where id = p_reservation_id and user_id = v_uid
    for update;

  if not found then
    raise exception 'reservation_not_found';
  end if;

  if v_status = 'cancelled' then
    raise exception 'reservation_cancelled';
  end if;

  if v_status = 'reserved' then
    if v_source = 'purchased' then
      update public.profiles
        set credits = credits - 1
        where id = v_uid and credits > 0;
      if not found then
        raise exception 'purchased_credit_unavailable';
      end if;
      insert into public.credit_ledger(user_id, delta, reason)
        values (v_uid, -1, 'job');
    else
      update public.profiles
        set free_generations_used = free_generations_used + 1
        where id = v_uid and free_generations_used < free_generations_limit;
      if not found then
        raise exception 'free_generations_exhausted';
      end if;
    end if;

    update public.depth_generation_reservations
      set status = 'completed',
          completed_at = now(),
          preview_data_url = p_preview_data_url
      where id = p_reservation_id;
  elsif v_status = 'completed' then
    update public.depth_generation_reservations
      set preview_data_url = coalesce(preview_data_url, p_preview_data_url)
      where id = p_reservation_id;
  end if;

  return query
    select p.free_generations_used, p.free_generations_limit, p.credits
    from public.profiles p where p.id = v_uid;
end;
$$;

create or replace function public.cancel_depth_generation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  update public.depth_generation_reservations
    set status = 'cancelled'
    where id = p_reservation_id and user_id = v_uid and status = 'reserved';
end;
$$;

revoke all on function public.reserve_depth_generation() from public, anon;
revoke all on function public.complete_depth_generation(uuid, text) from public, anon;
revoke all on function public.cancel_depth_generation(uuid) from public, anon;
grant execute on function public.reserve_depth_generation() to authenticated;
grant execute on function public.complete_depth_generation(uuid, text) to authenticated;
grant execute on function public.cancel_depth_generation(uuid) to authenticated;
