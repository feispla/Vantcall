-- ============================================================
-- VANTS · Panel admin y comandos del bot desde Supabase
-- ============================================================

-- ---------- 1. Administradores de la web ----------
CREATE TABLE IF NOT EXISTS public.web_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'moderator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.web_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.web_admin_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.web_admins WHERE user_id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.is_web_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.web_admins WHERE user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.web_admin_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_web_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.web_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_web_admin() TO authenticated;

DROP POLICY IF EXISTS "admins leen admins" ON public.web_admins;
CREATE POLICY "admins leen admins" ON public.web_admins FOR SELECT TO authenticated USING (public.is_web_admin());
DROP POLICY IF EXISTS "owner gestiona admins" ON public.web_admins;
CREATE POLICY "owner gestiona admins" ON public.web_admins FOR ALL TO authenticated
  USING (public.web_admin_role() = 'owner') WITH CHECK (public.web_admin_role() = 'owner');

-- Propietaria inicial: feisplaa@gmail.com
INSERT INTO public.web_admins (user_id, role)
SELECT id, 'owner' FROM auth.users WHERE email = 'feisplaa@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'owner';

-- ---------- 2. Acceso total de admin (RLS) - Solo tablas que existen ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'games','regions','teams','players','tournaments','match_series','match_maps',
    'standings','news_articles','guild_configs','bot_commands','bot_command_runs',
    'discord_channels','web_admins'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "admin web total" ON public.%I', t);
    EXECUTE format('CREATE POLICY "admin web total" ON public.%I FOR ALL TO authenticated USING (public.is_web_admin()) WITH CHECK (public.is_web_admin())', t);
  END LOOP;
END $$;

-- ---------- 3. Catálogo de comandos del bot ----------
CREATE TABLE IF NOT EXISTS public.bot_commands (
  name TEXT PRIMARY KEY CHECK (name ~ '^[a-z0-9_-]{1,32}$'),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 100),
  kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('builtin', 'custom')),
  category TEXT NOT NULL DEFAULT 'comunidad',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  staff_only BOOLEAN NOT NULL DEFAULT FALSE,
  min_plan TEXT NOT NULL DEFAULT 'free' CHECK (min_plan IN ('free', 'basic', 'pro', 'elite')),
  response_title TEXT CHECK (char_length(response_title) <= 256),
  response_body TEXT CHECK (char_length(response_body) <= 3500),
  response_url TEXT CHECK (response_url IS NULL OR response_url ~ '^https://'),
  color TEXT CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$'),
  ephemeral BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  uses INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.bot_commands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comandos públicos" ON public.bot_commands;
CREATE POLICY "comandos públicos" ON public.bot_commands FOR SELECT TO anon, authenticated USING (enabled AND NOT staff_only);
DROP POLICY IF EXISTS "admin web total" ON public.bot_commands;
CREATE POLICY "admin web total" ON public.bot_commands FOR ALL TO authenticated USING (public.is_web_admin()) WITH CHECK (public.is_web_admin());

INSERT INTO public.bot_commands (name, description, kind, category, staff_only, sort_order) VALUES
  ('ayuda',      'Lista de comandos de VANTS',                         'builtin', 'general',   FALSE, 10),
  ('perfil',     'Tu perfil competitivo VANTS (o el de otro jugador)', 'builtin', 'ranked',    FALSE, 20),
  ('ranking',    'Top 10 de la temporada ranked',                      'builtin', 'ranked',    FALSE, 30),
  ('torneos',    'Torneos abiertos y próximos',                        'builtin', 'torneos',   FALSE, 40),
  ('torneo',     'Inscríbete en un torneo VANTS',                      'builtin', 'torneos',   FALSE, 50),
  ('eventos',    'Próximos eventos de la comunidad',                   'builtin', 'calendario',FALSE, 60),
  ('calendario', 'Lo que viene en los próximos 7 días',                'builtin', 'calendario',FALSE, 70),
  ('planes',     'Planes BASIC, PRO y ELITE',                          'builtin', 'planes',    FALSE, 80),
  ('zona',       'Tus ventajas exclusivas según tu plan',              'builtin', 'planes',    FALSE, 85),
  ('vincular',   'Conecta tu Discord con tu cuenta de la web',         'builtin', 'general',   FALSE, 90),
  ('web',        'Enlaces de la plataforma VANTS',                     'builtin', 'general',   FALSE, 95),
  ('vants',      'Herramientas de staff de VANTS',                     'builtin', 'staff',     TRUE,  200)
ON CONFLICT (name) DO UPDATE SET kind = 'builtin', staff_only = excluded.staff_only;

INSERT INTO public.bot_commands (name, description, kind, category, response_title, response_body, color, sort_order) VALUES
  ('reglas', 'Código de conducta de VANTS', 'custom', 'comunidad', 'Código de conducta VANTS',
   E'1. Respeto total: sin insultos, acoso ni discriminación.\n2. Juego limpio: nada de cheats, smurfs ni boosting.\n3. Puntualidad: llega 10 minutos antes al check-in.\n4. Reporta resultados con captura en el canal del torneo.\n5. El staff tiene la última palabra en disputas.', '#ff4655', 110),
  ('soporte', 'Cómo pedir ayuda al staff', 'custom', 'comunidad', 'Soporte VANTS',
   E'Abre un ticket desde **Mi cuenta → Soporte** en la web o escribe a feispla@hotmail.com.\nTiempo de respuesta: 24 h (PRO y ELITE tienen prioridad).', '#5865f2', 120)
ON CONFLICT (name) DO NOTHING;

-- Registro de uso de comandos (analítica del panel)
CREATE TABLE IF NOT EXISTS public.bot_command_runs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  command TEXT NOT NULL,
  discord_id TEXT,
  guild_id TEXT,
  ok BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bot_command_runs_created_idx ON public.bot_command_runs (created_at DESC);
ALTER TABLE public.bot_command_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin web lee" ON public.bot_command_runs;
CREATE POLICY "admin web lee" ON public.bot_command_runs FOR SELECT TO authenticated USING (public.is_web_admin());

-- ---------- 4. Tabla discord_channels (si no existe) ----------
CREATE TABLE IF NOT EXISTS public.discord_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  channel_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- 5. Canales de Discord detectados ----------
INSERT INTO public.discord_channels (category, channel_id, guild_id, updated_by, updated_at) VALUES
  ('anuncios', '1553634435671396432', '1546641331927908472', 'setup', NOW()),
  ('tryouts', '1553938201754730506', '1546641331927908472', 'setup', NOW()),
  ('resultados', '1553938926320877669', '1546641331927908472', 'setup', NOW()),
  ('estadisticas', '1553863844915585146', '1546641331927908472', 'setup', NOW()),
  ('sup', '1553659242458652733', '1546641331927908472', 'setup', NOW()),
  ('torneos', '1553659315565367307', '1546641331927908472', 'setup', NOW())
ON CONFLICT (category) DO NOTHING;
