-- ============================================
-- Hypothesis Session Tool — Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text default 'trainer' check (role in ('admin', 'trainer')),
  openai_api_key text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'trainer')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Clients
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid references public.profiles(id) not null,
  name text not null,
  age integer,
  gender text,
  status text default 'active' check (status in ('active', 'inactive')),
  flags jsonb default '[]'::jsonb,
  latest_chief_complaint text,
  latest_goal text,
  session_count integer default 0,
  last_session_date date,
  next_session_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Intake Forms
create table if not exists public.intake_forms (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade not null unique,
  chief_complaint text,
  goal text,
  concerns text,
  desires text,
  timeline text,
  history text,
  medical_history text,
  medications text,
  occupation text,
  sleep text,
  nutrition text,
  stress text,
  exercise_history text,
  success_experience text,
  failure_experience text,
  notes text,
  ai_summary jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Sessions
create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  trainer_id uuid references public.profiles(id) not null,
  session_number integer not null,
  session_type text default 'followup' check (session_type in ('initial', 'followup')),
  status text default 'draft' check (status in ('draft', 'in_progress', 'completed')),
  date date default current_date,
  observations jsonb default '{}'::jsonb,
  free_note text,
  not_performed_reason text,
  next_plan text,
  homework text,
  homework_intent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Hypotheses
create table if not exists public.hypotheses (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  category text not null,
  description text not null,
  rationale text,
  priority integer default 0,
  status text default 'pending' check (status in ('adopted', 'pending', 'excluded')),
  source text default 'manual' check (source in ('manual', 'ai')),
  next_check text,
  created_at timestamptz default now()
);

-- 6. Interventions
create table if not exists public.interventions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  name text not null,
  intent text,
  target_hypothesis_id uuid references public.hypotheses(id) on delete set null,
  reevaluation_items jsonb default '[]'::jsonb,
  reevaluation_results jsonb default '{}'::jsonb,
  immediate_reaction text,
  next_session_note text,
  source text default 'manual' check (source in ('manual', 'ai')),
  created_at timestamptz default now()
);

-- 7. Audit Logs
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  user_name text,
  action text not null,
  target text,
  target_label text,
  details text,
  created_at timestamptz default now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.intake_forms enable row level security;
alter table public.sessions enable row level security;
alter table public.hypotheses enable row level security;
alter table public.interventions enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users can read all profiles, update own
create policy "Anyone can view profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Clients: trainers see own, admins see all
create policy "View clients" on public.clients for select using (
  trainer_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Create clients" on public.clients for insert with check (trainer_id = auth.uid());
create policy "Update clients" on public.clients for update using (
  trainer_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Delete clients" on public.clients for delete using (trainer_id = auth.uid());

-- Intake forms: via client ownership
create policy "View intakes" on public.intake_forms for select using (
  exists (select 1 from public.clients where id = intake_forms.client_id and (
    trainer_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ))
);
create policy "Manage intakes" on public.intake_forms for insert with check (
  exists (select 1 from public.clients where id = intake_forms.client_id and trainer_id = auth.uid())
);
create policy "Update intakes" on public.intake_forms for update using (
  exists (select 1 from public.clients where id = intake_forms.client_id and trainer_id = auth.uid())
);

-- Sessions: via trainer ownership
create policy "View sessions" on public.sessions for select using (
  trainer_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Create sessions" on public.sessions for insert with check (trainer_id = auth.uid());
create policy "Update sessions" on public.sessions for update using (trainer_id = auth.uid());

-- Hypotheses: via session ownership
create policy "View hypotheses" on public.hypotheses for select using (
  exists (select 1 from public.sessions where id = hypotheses.session_id and (
    trainer_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ))
);
create policy "Manage hypotheses" on public.hypotheses for insert with check (
  exists (select 1 from public.sessions where id = hypotheses.session_id and trainer_id = auth.uid())
);
create policy "Update hypotheses" on public.hypotheses for update using (
  exists (select 1 from public.sessions where id = hypotheses.session_id and trainer_id = auth.uid())
);
create policy "Delete hypotheses" on public.hypotheses for delete using (
  exists (select 1 from public.sessions where id = hypotheses.session_id and trainer_id = auth.uid())
);

-- Interventions: via session ownership
create policy "View interventions" on public.interventions for select using (
  exists (select 1 from public.sessions where id = interventions.session_id and (
    trainer_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ))
);
create policy "Manage interventions" on public.interventions for insert with check (
  exists (select 1 from public.sessions where id = interventions.session_id and trainer_id = auth.uid())
);
create policy "Update interventions" on public.interventions for update using (
  exists (select 1 from public.sessions where id = interventions.session_id and trainer_id = auth.uid())
);

-- Audit logs: admins see all, trainers see own
create policy "View audit logs" on public.audit_logs for select using (
  user_id = auth.uid() or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Create audit logs" on public.audit_logs for insert with check (true);

-- ============================================
-- Indexes
-- ============================================
create index if not exists idx_clients_trainer on public.clients(trainer_id);
create index if not exists idx_sessions_client on public.sessions(client_id);
create index if not exists idx_sessions_trainer on public.sessions(trainer_id);
create index if not exists idx_hypotheses_session on public.hypotheses(session_id);
create index if not exists idx_interventions_session on public.interventions(session_id);
create index if not exists idx_audit_logs_user on public.audit_logs(user_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

-- ============================================
-- Updated_at trigger
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at before update on public.clients
  for each row execute function public.update_updated_at();
create trigger intake_forms_updated_at before update on public.intake_forms
  for each row execute function public.update_updated_at();
create trigger sessions_updated_at before update on public.sessions
  for each row execute function public.update_updated_at();
