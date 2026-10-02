-- ============================================================
-- VANTS — Esquema Supabase (es-4, LATAM / Caracas)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- JUEGOS
CREATE TABLE IF NOT EXISTS games (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  dot_class TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO games (slug, name, short, dot_class) VALUES
  ('valorant', 'VALORANT', 'VAL', 'dot--valorant'),
  ('cs2', 'Counter-Strike 2', 'CS2', 'dot--cs2'),
  ('lol', 'League of Legends', 'LoL', 'dot--lol')
ON CONFLICT (slug) DO NOTHING;

-- REGIONES
CREATE TABLE IF NOT EXISTS regions (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO regions (slug, name) VALUES
  ('latam', 'LATAM'),
  ('na', 'Norteamérica'),
  ('eu', 'Europa'),
  ('br', 'Brasil'),
  ('apac', 'Asia-Pacífico')
ON CONFLICT (slug) DO NOTHING;

-- EQUIPOS
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  game TEXT REFERENCES games(slug),
  region TEXT REFERENCES regions(slug),
  crest TEXT,
  motto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- JUGADORES
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  game TEXT REFERENCES games(slug),
  role TEXT,
  rating INT NOT NULL DEFAULT 1200,
  stats JSONB NOT NULL DEFAULT '{}'::JSONB,
  trend INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TORNEOS
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  game TEXT REFERENCES games(slug),
  region TEXT REFERENCES regions(slug),
  format TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('live','upcoming','completed')),
  registration_status TEXT,
  prize TEXT,
  dates TEXT,
  participants INT,
  hue INT NOT NULL DEFAULT 260,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SERIES (partidos)
CREATE TABLE IF NOT EXISTS match_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT UNIQUE NOT NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  game TEXT REFERENCES games(slug),
  stage TEXT,
  best_of INT NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('live','upcoming','completed','cancelled')),
  scheduled_at TIMESTAMPTZ,
  team_a_id UUID REFERENCES teams(id),
  team_b_id UUID REFERENCES teams(id),
  team_a_label TEXT,
  team_b_label TEXT,
  score_a INT,
  score_b INT,
  winner CHAR(1) CHECK (winner IN ('a','b')),
  mvp TEXT,
  current_map TEXT,
  stream_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MAPAS / JUEGOS DE UNA SERIE
CREATE TABLE IF NOT EXISTS match_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES match_series(id) ON DELETE CASCADE,
  sequence INT NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  score_a INT,
  score_b INT,
  winner CHAR(1) CHECK (winner IN ('a','b'))
);

-- CLASIFICACIONES
CREATE TABLE IF NOT EXISTS standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  position INT,
  played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  maps_for INT DEFAULT 0,
  maps_against INT DEFAULT 0,
  points INT DEFAULT 0
);

-- NOTICIAS
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body JSONB NOT NULL DEFAULT '[]'::JSONB,
  author TEXT,
  game TEXT REFERENCES games(slug),
  tournament_id UUID REFERENCES tournaments(id),
  hue INT NOT NULL DEFAULT 260,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','scheduled','published','archived'))
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública
CREATE POLICY "Lectura pública de juegos" ON games FOR SELECT USING (TRUE);
CREATE POLICY "Lectura pública de regiones" ON regions FOR SELECT USING (TRUE);
CREATE POLICY "Lectura pública de equipos" ON teams FOR SELECT USING (TRUE);
CREATE POLICY "Lectura pública de jugadores" ON players FOR SELECT USING (TRUE);
CREATE POLICY "Lectura pública de torneos" ON tournaments FOR SELECT USING (TRUE);
CREATE POLICY "Lectura pública de series" ON match_series FOR SELECT USING (TRUE);
CREATE POLICY "Lectura pública de mapas" ON match_maps FOR SELECT USING (TRUE);
CREATE POLICY "Lectura pública de clasificaciones" ON standings FOR SELECT USING (TRUE);
CREATE POLICY "Lectura pública de noticias publicadas" ON news_articles FOR SELECT USING (status = 'published');

-- Índices
CREATE INDEX IF NOT EXISTS idx_series_tournament ON match_series(tournament_id);
CREATE INDEX IF NOT EXISTS idx_series_status ON match_series(status);
CREATE INDEX IF NOT EXISTS idx_series_scheduled ON match_series(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_standings_tournament ON standings(tournament_id);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(published_at DESC);
