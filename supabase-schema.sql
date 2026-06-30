-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (linked to Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null default '',
  role text not null default 'employee' check (role in ('owner','manager','sales','employee')),
  color text not null default '#9A9E94',
  initials text not null default '?',
  title text not null default '',
  permissions text[] not null default '{}',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can read all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Service can insert profiles" on public.profiles for insert with check (true);

-- Clients
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  initials text not null default '',
  color text not null default '#9A9E94',
  health integer not null default 75 check (health >= 0 and health <= 100),
  services text[] not null default '{}',
  type text not null default 'full' check (type in ('social','ads','seo','full')),
  industry text default '',
  contact_name text default '',
  contact_email text default '',
  whatsapp text default '',
  account_owner_id uuid references public.profiles on delete set null,
  posts_per_month integer,
  monthly_retainer integer,
  ai_brief text default '',
  about_business text default '',
  target_audience text default '',
  brand_voice text default '',
  reference_links text default '',
  created_at timestamptz default now()
);

alter table public.clients enable row level security;
create policy "All authenticated users can read clients" on public.clients for select using (auth.role() = 'authenticated');
create policy "Owners and managers can manage clients" on public.clients for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','manager'))
);

-- Plan items (content deliverables)
create table public.plan_items (
  id uuid default uuid_generate_v4() primary key,
  month text not null,
  client_id uuid references public.clients on delete cascade,
  cat text not null default 'social' check (cat in ('social','performance','seo')),
  type text not null default 'Reel',
  title text not null default '',
  brief text not null default '',
  refs jsonb not null default '[]',
  assignee_id uuid references public.profiles,
  effort integer not null default 3 check (effort >= 1 and effort <= 5),
  day integer,
  status text not null default 'planned' check (status in ('planned','in_progress','review','approved','published')),
  created_at timestamptz default now()
);

alter table public.plan_items enable row level security;
create policy "All authenticated can read plan items" on public.plan_items for select using (auth.role() = 'authenticated');
create policy "All authenticated can manage plan items" on public.plan_items for all using (auth.role() = 'authenticated');

-- Tasks
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  client_id uuid references public.clients on delete set null,
  type text not null default 'Design',
  assignee_id uuid references public.profiles on delete set null,
  due text not null default 'Today',
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  done boolean not null default false,
  idea text default '',
  hook text default '',
  format text default '',
  refs jsonb not null default '[]',
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;
create policy "All authenticated can read tasks" on public.tasks for select using (auth.role() = 'authenticated');
create policy "All authenticated can manage tasks" on public.tasks for all using (auth.role() = 'authenticated');

-- Attendance
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  break_minutes integer not null default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table public.attendance enable row level security;
create policy "Users can read all attendance" on public.attendance for select using (auth.role() = 'authenticated');
create policy "Users can manage own attendance" on public.attendance for all using (auth.uid() = user_id);

-- Deals (Sales pipeline)
create table public.deals (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  company text not null default '',
  value numeric not null default 0,
  stage text not null default 'lead' check (stage in ('lead','qualified','proposal','negotiation','closed')),
  probability integer not null default 20,
  owner_id uuid references public.profiles on delete set null,
  created_at timestamptz default now()
);

alter table public.deals enable row level security;
create policy "All authenticated can read deals" on public.deals for select using (auth.role() = 'authenticated');
create policy "All authenticated can manage deals" on public.deals for all using (auth.role() = 'authenticated');

-- Notifications
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  text text not null,
  type text not null default 'info' check (type in ('warning','info','success')),
  read boolean not null default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users can read own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Service can insert notifications" on public.notifications for insert with check (true);

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_name text;
  user_initials text;
begin
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  user_initials := upper(substring(split_part(user_name,' ',1) from 1 for 1) || substring(split_part(user_name,' ',2) from 1 for 1));
  if user_initials = '' then user_initials := upper(substring(user_name from 1 for 2)); end if;

  insert into public.profiles (id, email, name, initials, role, color, title)
  values (
    new.id,
    new.email,
    user_name,
    user_initials,
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    coalesce(new.raw_user_meta_data->>'color', '#0EA5A4'),
    coalesce(new.raw_user_meta_data->>'title', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed demo data (run after creating your first user as owner)
-- You can insert clients and plan_items after auth is set up
