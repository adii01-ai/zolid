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
  if p_credits not in (200, 500, 1000) then
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

revoke all on function public.grant_stripe_credit_bundle(uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.grant_stripe_credit_bundle(uuid, integer, text)
  to service_role;