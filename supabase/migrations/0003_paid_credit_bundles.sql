alter table public.profiles
  alter column credits set default 15,
  alter column free_generations_limit set default 0;

alter table public.depth_generation_reservations
  add column if not exists credits_reserved integer not null default 0;

with legacy_allowances as materialized (
  select
    id,
    least(3, greatest(free_generations_limit - free_generations_used, 0)) * 5 as granted
  from public.profiles
  where free_generations_limit > free_generations_used
),
migrated_free_credits as (
  update public.profiles as profile
  set credits = profile.credits + legacy_allowances.granted,
      free_generations_limit = 0
  from legacy_allowances
  where profile.id = legacy_allowances.id
  returning profile.id, legacy_allowances.granted
)
insert into public.credit_ledger(user_id, delta, reason)
select id, granted, 'signup_bonus'
from migrated_free_credits
where granted > 0;

update public.profiles set free_generations_limit = 0
where free_generations_limit <> 0;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, credits, free_generations_used, free_generations_limit)
  values (new.id, 15, 0, 0)
  on conflict (id) do nothing;

  if found then
    insert into public.credit_ledger(user_id, delta, reason)
    values (new.id, 15, 'signup_bonus');
  end if;

  return new;
end;
$$;

create or replace function public.reserve_depth_generation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_credits integer;
  v_reserved integer;
  v_reservation uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select credits into v_credits
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

  select coalesce(sum(credits_reserved), 0)::integer
  into v_reserved
  from public.depth_generation_reservations
  where user_id = v_uid and status = 'reserved';

  if v_credits - v_reserved < 5 then
    if v_credits < 5 then
      raise exception 'insufficient_credits';
    end if;
    raise exception 'generation_in_progress';
  end if;

  insert into public.depth_generation_reservations(user_id, source, credits_reserved)
  values (v_uid, 'purchased', 5)
  returning id into v_reservation;

  return v_reservation;
end;
$$;

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
  v_status text;
  v_cost integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_preview_data_url is null
    or length(p_preview_data_url) > 180000
    or p_preview_data_url !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then
    raise exception 'invalid_preview_data';
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  select status, credits_reserved into v_status, v_cost
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
    if v_cost <> 5 then
      raise exception 'invalid_credit_reservation';
    end if;

    update public.profiles
    set credits = credits - v_cost
    where id = v_uid and credits >= v_cost;
    if not found then
      raise exception 'insufficient_credits';
    end if;

    insert into public.credit_ledger(user_id, delta, reason)
    values (v_uid, -v_cost, 'job');

    update public.depth_generation_reservations
    set status = 'completed',
        completed_at = now(),
        preview_data_url = p_preview_data_url
    where id = p_reservation_id;
  else
    update public.depth_generation_reservations
    set preview_data_url = coalesce(preview_data_url, p_preview_data_url)
    where id = p_reservation_id;
  end if;

  return query
  select p.free_generations_used, p.free_generations_limit, p.credits
  from public.profiles p
  where p.id = v_uid;
end;
$$;

create or replace function public.charge_background_export()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_remaining integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set credits = credits - 5
  where id = v_uid and credits >= 5
  returning credits into v_remaining;

  if not found then
    if not exists (select 1 from public.profiles where id = v_uid) then
      raise exception 'profile_not_found';
    end if;
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_ledger(user_id, delta, reason)
  values (v_uid, -5, 'background_export');

  return v_remaining;
end;
$$;

create or replace function public.grant_stripe_credit_bundle(
  p_user_id uuid,
  p_credits integer,
  p_event_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger_id bigint;
  v_balance integer;
begin
  if p_user_id is null or p_event_id is null or p_event_id = '' then
    raise exception 'invalid_purchase_event';
  end if;
  if p_credits not in (300, 500, 699) then
    raise exception 'invalid_bundle_credits';
  end if;

  insert into public.credit_ledger(user_id, delta, reason, stripe_event_id)
  values (p_user_id, p_credits, 'purchase', p_event_id)
  on conflict (stripe_event_id) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    select credits into v_balance from public.profiles where id = p_user_id;
    return v_balance;
  end if;

  update public.profiles
  set credits = credits + p_credits,
      plan = 'pro'
  where id = p_user_id
  returning credits into v_balance;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return v_balance;
end;
$$;

revoke all on function public.charge_background_export() from public, anon;
grant execute on function public.charge_background_export() to authenticated;
revoke all on function public.grant_stripe_credit_bundle(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.grant_stripe_credit_bundle(uuid, integer, text) to service_role;
