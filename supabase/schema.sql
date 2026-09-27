-- ============================================================
-- VANTS — Esquema Supabase (es-4, LATAM / Caracas)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- JUEGOS
create table if not exists games (
  slug text primary key,                -- 'valorant' | 'cs2' | 'lol'
  name text not null,
  short text not null,
  dot_class text not null default '',
  active boolean not null default true
);

insert into games (slug, name, short, dot_class) values
  ('valorant', 'VALORANT', 'VAL', 'dot--valorant'),
  ('cs2', 'Counter-Strike 2', 'CS2', 'dot--cs2'),
  ('lol', 'League of Legends', 'LoL', 'dot--lol')
on conflict (slug) do nothing;

-- REGIONES
create table if not exists regions (
  slug text primary key,
  name text not null
);

insert into regions (slug, name) values
  ('latam', 'LATAM'),
  ('na', 'Norteamérica'),
  ('eu', 'Europa'),
  ('br', 'Brasil'),
  ('apac', 'Asia-Pacífico')
on conflict (slug) do nothing;

-- EQUIPOS
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tag text not null,
  game text references games(slug),
  region text references regions(slug),
  crest text,                          -- color hex del escudo
  motto text,
  created_at timestamptz not null default now()
);

-- JUGADORES
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  team_id uuid references teams(id) on delete set null,
  game text references games(slug),
  role text,
  rating int not null default 1200,
  stats jsonb not null default '{}'::jsonb,  -- kd, acs, adr, kast, hs, kda, csmin, dpm...
  trend int not null default 0,
  created_at timestamptz not null default now()
);

-- TORNEOS
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  game text references games(slug),
  region text references regions(slug),
  format text,
  status text not null default 'upcoming' check (status in ('live','upcoming','completed')),
  registration_status text,
  prize text,
  dates text,
  participants int,
  hue int not null default 260,
  description text,
  cover_image_url text,
  created_at timestamptz not null default now()
);

-- SERIES (partidos)
create table if not exists match_series (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,      -- id legible para URLs, ej. 'm-live-1'
  tournament_id uuid references tournaments(id) on delete cascade,
  game text references games(slug),
  stage text,
  best_of int not null default 3,
  status text not null default 'upcoming' check (status in ('live','upcoming','completed','cancelled')),
  scheduled_at timestamptz,            -- fecha/hora real (con zona)
  team_a_id uuid references teams(id),
  team_b_id uuid references teams(id),
  team_a_label text,                   -- para 'Ganador SF1' cuando no hay equipo
  team_b_label text,
  score_a int,
  score_b int,
  winner char(1) check (winner in ('a','b')),
  mvp text,
  current_map text,
  stream_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MAPAS / JUEGOS DE UNA SERIE
create table if not exists match_maps (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references match_series(id) on delete cascade,
  sequence int not null default 1,
  name text not null,
  score_a int,
  score_b int,
  winner char(1) check (winner in ('a','b'))
);

-- CLASIFICACIONES
create table if not exists standings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  team_id uuid references teams(id),
  position int,
  played int default 0,
  wins int default 0,
  losses int default 0,
  maps_for int default 0,
  maps_against int default 0,
  points int default 0
);

-- NOTICIAS
create table if not exists news_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body jsonb not null default '[]'::jsonb,   -- array de párrafos
  author text,
  game text references games(slug),
  tournament_id uuid references tournaments(id),
  hue int not null default 260,
  published_at timestamptz not null default now(),
  status text not null default 'published' check (status in ('draft','scheduled','published','archived'))
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Los datos competitivos son públicos (lectura abierta con la clave anon).
-- La escritura queda solo para el panel de administración (service_role).
-- ============================================================
alter table games enable row level security;
alter table regions enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table tournaments enable row level security;
alter table match_series enable row level security;
alter table match_maps enable row level security;
alter table standings enable row level security;
alter table news_articles enable row level security;

-- Políticas de lectura pública
create policy "Lectura pública de juegos" on games for select using (true);
create policy "Lectura pública de regiones" on regions for select using (true);
create policy "Lectura pública de equipos" on teams for select using (true);
create policy "Lectura pública de jugadores" on players for select using (true);
create policy "Lectura pública de torneos" on tournaments for select using (true);
create policy "Lectura pública de series" on match_series for select using (true);
create policy "Lectura pública de mapas" on match_maps for select using (true);
create policy "Lectura pública de clasificaciones" on standings for select using (true);
create policy "Lectura pública de noticias publicadas" on news_articles for select using (status = 'published');

-- Índices
create index if not exists idx_series_tournament on match_series(tournament_id);
create index if not exists idx_series_status on match_series(status);
create index if not exists idx_series_scheduled on match_series(scheduled_at);
create index if not exists idx_players_team on players(team_id);
create index if not exists idx_standings_tournament on standings(tournament_id);
create index if not exists idx_news_published on news_articles(published_at desc);
