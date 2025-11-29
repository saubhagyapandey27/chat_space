-- Drop existing tables if needed (careful in production!)
drop table if exists messages cascade;
drop table if exists participants cascade;
drop table if exists rooms cascade;
drop table if exists push_subscriptions cascade;
drop table if exists archives cascade;

-- Create rooms table
create table rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create participants table
create table participants (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  user_name text not null,
  passphrase_hash text unique not null,
  encrypted_master_key text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create messages table
create table messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  sender_name text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create archives table
create table archives (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  created_by text not null, -- user_name
  type text not null check (type in ('link', 'note', 'photo')),
  content text not null, -- Encrypted content
  tags text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create push_subscriptions table
create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  user_name text not null,
  endpoint text unique not null,
  keys jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table rooms enable row level security;
alter table participants enable row level security;
alter table messages enable row level security;
alter table archives enable row level security;
alter table push_subscriptions enable row level security;

-- Public Access Policies
create policy "Public Access Rooms" on rooms for all using (true) with check (true);
create policy "Public Access Participants" on participants for all using (true) with check (true);
create policy "Public Access Messages" on messages for all using (true) with check (true);
create policy "Public Access Archives" on archives for all using (true) with check (true);
create policy "Public Access Subscriptions" on push_subscriptions for all using (true) with check (true);

-- Enable Realtime
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table archives;
