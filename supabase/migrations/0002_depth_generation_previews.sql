alter table public.depth_generation_reservations
  add column if not exists preview_data_url text;

drop function if exists public.complete_depth_generation(uuid);

create or replace function public.complete_depth_generation(
  p_reservation_id uuid,
  p_preview_data_url text
)
returns table (
  free_generations_used integer,
  free_generations_limit integer,
  purchased_credits integer
)
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

  if p_preview_data_url is null
     or length(p_preview_data_url) > 180000
     or p_preview_data_url !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then
    raise exception 'invalid_preview_data';
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  select source, status
    into v_source, v_status
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
        where id = v_uid
          and free_generations_used < free_generations_limit;
      if not found then
        raise exception 'free_generations_exhausted';
      end if;
    end if;

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
    select p.free_generations_used,
           p.free_generations_limit,
           p.credits
    from public.profiles p
    where p.id = v_uid;
end;
$$;

revoke all on function public.complete_depth_generation(uuid, text)
  from public, anon;
grant execute on function public.complete_depth_generation(uuid, text)
  to authenticated;
