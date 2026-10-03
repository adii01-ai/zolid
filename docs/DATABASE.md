# Database (Supabase / Postgres)

Save as `supabase/migrations/0001_init.sql`. Review before running.

```sql
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro')),
  credits integer not null default 0 check (credits >= 0),
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

-- JOBS
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  input_path text not null,
  output_path text,
  provider_job_id text,
  error text,
  credits_charged integer not null default 1,
  refunded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index jobs_user_created on public.jobs(user_id, created_at desc);
create index jobs_status on public.jobs(status);

-- CREDIT LEDGER (append-only)
create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('signup_bonus','job','job_refund','purchase','subscription_grant','admin')),
  job_id uuid references public.jobs(id),
  stripe_event_id text unique,
  created_at timestamptz not null default now()
);
create index ledger_user on public.credit_ledger(user_id, created_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.credit_ledger enable row level security;

create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own jobs read"    on public.jobs     for select using (auth.uid() = user_id);
create policy "own jobs delete"  on public.jobs     for delete using (auth.uid() = user_id);
create policy "own ledger read"  on public.credit_ledger for select using (auth.uid() = user_id);
-- No insert/update policies: all writes go through SECURITY DEFINER functions or the service role.

-- NEW USER: create profile + signup bonus
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, credits) values (new.id, 3);
  insert into public.credit_ledger (user_id, delta, reason) values (new.id, 3, 'signup_bonus');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- START JOB: atomic credit spend (called by the signed-in user)
create function public.start_job(p_input_path text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_credits int; v_job uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select credits into v_credits from public.profiles where id = v_uid for update;
  if v_credits is null or v_credits < 1 then raise exception 'insufficient credits'; end if;
  update public.profiles set credits = credits - 1 where id = v_uid;
  insert into public.jobs (user_id, input_path) values (v_uid, p_input_path) returning id into v_job;
  insert into public.credit_ledger (user_id, delta, reason, job_id) values (v_uid, -1, 'job', v_job);
  return v_job;
end $$;

-- REFUND JOB: exactly once, service role only
create function public.refund_job(p_job_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_job public.jobs;
begin
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null or v_job.refunded then return; end if;
  update public.jobs set refunded = true, status = 'failed', updated_at = now() where id = p_job_id;
  update public.profiles set credits = credits + v_job.credits_charged where id = v_job.user_id;
  insert into public.credit_ledger (user_id, delta, reason, job_id)
    values (v_job.user_id, v_job.credits_charged, 'job_refund', p_job_id);
end $$;

-- GRANT CREDITS from Stripe: idempotent via stripe_event_id, service role only
create function public.grant_credits(p_user uuid, p_amount int, p_reason text, p_event text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.credit_ledger (user_id, delta, reason, stripe_event_id)
    values (p_user, p_amount, p_reason, p_event)
    on conflict (stripe_event_id) do nothing;
  if found then
    update public.profiles set credits = credits + p_amount where id = p_user;
  end if;
end $$;

revoke all on function public.refund_job(uuid) from public, anon, authenticated;
revoke all on function public.grant_credits(uuid,int,text,text) from public, anon, authenticated;
grant execute on function public.start_job(text) to authenticated;
```

## Storage
- Private buckets: `inputs`, `outputs`.
- Policy: users can read/write only paths starting with their own `auth.uid()` folder.
- Output files are written by the server (service role).

## Notes for Copilot
- Never `update profiles set credits` from application code. Use the functions above.
- Add a test that calling `refund_job` twice refunds once, and that `grant_credits` with the same event id grants once.
