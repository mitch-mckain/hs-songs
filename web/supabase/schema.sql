-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Song status enum
create type song_status as enum ('demo', 'released', 'retired');

-- Section type enum
create type section_type as enum ('intro', 'verse', 'prehook', 'chorus', 'bridge', 'outro');

-- Riff kind enum
create type riff_kind as enum ('photo', 'gp_tab');

-- Songs table
create table songs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  status song_status not null default 'demo',
  album text,
  key text,
  bpm text,
  capo text,
  tuning text not null default 'Eb std',
  time_signature text,
  version text default 'v1',
  drive_folder_url text,
  logic_url text,
  lyrics_doc_url text,
  notes text,
  last_updated timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Song chords
create table song_chords (
  id uuid primary key default uuid_generate_v4(),
  song_id uuid not null references songs(id) on delete cascade,
  position integer not null default 0,
  name text not null,
  tuning text not null default 'Std',
  strings jsonb not null, -- array of 6: fret number | "x" | 0 (open)
  barre jsonb -- { fret, fromString, toString } | null
);

-- Song structure rows
create table song_structure_rows (
  id uuid primary key default uuid_generate_v4(),
  song_id uuid not null references songs(id) on delete cascade,
  position integer not null default 0,
  section_label text not null,
  section_type section_type not null default 'verse',
  bar_count integer,
  lyric_snippet text,
  chord_progression jsonb not null default '[]' -- ordered array of song_chord ids
);

-- Song riffs
create table song_riffs (
  id uuid primary key default uuid_generate_v4(),
  song_id uuid not null references songs(id) on delete cascade,
  kind riff_kind not null default 'gp_tab',
  drive_file_id text,
  image_url text,
  track_label text
);

-- User roles table
create table user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('editor', 'viewer'))
);

-- Row Level Security
alter table songs enable row level security;
alter table song_chords enable row level security;
alter table song_structure_rows enable row level security;
alter table song_riffs enable row level security;
alter table user_roles enable row level security;

-- Viewers can read all songs and related data
create policy "Anyone authenticated can read songs"
  on songs for select to authenticated using (true);

create policy "Anyone authenticated can read song_chords"
  on song_chords for select to authenticated using (true);

create policy "Anyone authenticated can read song_structure_rows"
  on song_structure_rows for select to authenticated using (true);

create policy "Anyone authenticated can read song_riffs"
  on song_riffs for select to authenticated using (true);

-- Editors can write
create policy "Editors can insert songs"
  on songs for insert to authenticated
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can update songs"
  on songs for update to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can delete songs"
  on songs for delete to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can insert song_chords"
  on song_chords for insert to authenticated
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can update song_chords"
  on song_chords for update to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can delete song_chords"
  on song_chords for delete to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can insert song_structure_rows"
  on song_structure_rows for insert to authenticated
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can update song_structure_rows"
  on song_structure_rows for update to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can delete song_structure_rows"
  on song_structure_rows for delete to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can insert song_riffs"
  on song_riffs for insert to authenticated
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can update song_riffs"
  on song_riffs for update to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

create policy "Editors can delete song_riffs"
  on song_riffs for delete to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'editor'));

-- Users can read their own role
create policy "Users can read own role"
  on user_roles for select to authenticated using (user_id = auth.uid());

-- Function to auto-create a viewer role on first sign-in
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_roles (user_id, role) values (new.id, 'viewer')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
