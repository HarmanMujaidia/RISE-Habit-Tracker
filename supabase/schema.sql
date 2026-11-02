-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- Stores each person's Rise progress as one private row.

create table if not exists public.rise_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.rise_states enable row level security;

create policy "Read own progress" on public.rise_states
  for select to authenticated using (auth.uid() = user_id);

create policy "Create own progress" on public.rise_states
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Update own progress" on public.rise_states
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
