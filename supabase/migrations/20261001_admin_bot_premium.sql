-- ============================================================
-- VANTS · Panel admin, comandos del bot desde Supabase y zona premium
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

-- ---------- 2. Acceso total de admin (RLS) ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'players','profiles','seasons','season_player_stats','ranked_matches','ranked_rules','ranked_history',
    'tournaments','tournament_entries','tournament_matches','events','event_rsvps',
    'support_tickets','support_ticket_messages','purchases','entitlements','tickets','audit_logs',
    'vant_sync_events','postulaciones','plan_content','discord_channels','bot_admins','player_discord_accounts'
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
   E'Abre un ticket desde **Mi cuenta → Soporte** en la web o escribe a [feispla@hotmail.com](mailto:feispla@hotmail.com).\nTiempo de respuesta: 24 h (PRO y ELITE tienen prioridad).', '#5865f2', 120)
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

-- ---------- 4. Configuración del bot (Vault) ----------
CREATE OR REPLACE FUNCTION public.admin_set_bot_secret(p_name TEXT, p_value TEXT)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = '' AS $$
DECLARE sid UUID;
BEGIN
  IF COALESCE(public.web_admin_role(), '') NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'solo administradores'; END IF;
  IF p_name NOT IN ('discord_bot_token', 'discord_public_key', 'discord_application_id', 'discord_guild_id') THEN RAISE EXCEPTION 'nombre no permitido'; END IF;
  IF p_value IS NULL OR CHAR_LENGTH(TRIM(p_value)) < 5 OR CHAR_LENGTH(p_value) > 200 THEN RAISE EXCEPTION 'valor no válido'; END IF;
  SELECT id INTO sid FROM vault.secrets WHERE name = p_name;
  IF sid IS NULL THEN PERFORM vault.create_secret(TRIM(p_value), p_name, 'VANTS bot');
  ELSE PERFORM vault.update_secret(sid, TRIM(p_value)); END IF;
  INSERT INTO public.audit_logs (actor_type, actor_id, action, target_type, target_id, metadata)
  VALUES ('web_admin', auth.uid()::TEXT, 'bot_secret_set', 'vault', p_name, '{}'::JSONB);
END $$;
REVOKE ALL ON FUNCTION public.admin_set_bot_secret(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_bot_secret(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_bot_secret(p_name TEXT)
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets
  WHERE name = p_name AND p_name IN ('discord_bot_token', 'discord_public_key', 'discord_application_id', 'discord_guild_id') LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_bot_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_bot_secret(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_bot_config_status()
RETURNS JSONB LANGUAGE PLPGSQL STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_web_admin() THEN RAISE EXCEPTION 'solo administradores'; END IF;
  RETURN JSONB_BUILD_OBJECT(
    'bot_token', EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'discord_bot_token'),
    'public_key', EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'discord_public_key'),
    'application_id', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'discord_application_id'),
    'guild_id', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'discord_guild_id'), '1546641331927908472')
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_bot_config_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_bot_config_status() TO authenticated;

-- ---------- 5. Resumen del panel ----------
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS JSONB LANGUAGE PLPGSQL STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_web_admin() THEN RAISE EXCEPTION 'solo administradores'; END IF;
  RETURN JSONB_BUILD_OBJECT(
    'users', (SELECT COUNT(*) FROM auth.users),
    'users_7d', (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '7 days'),
    'players', (SELECT COUNT(*) FROM public.players),
    'logins_24h', (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at > NOW() - INTERVAL '24 hours'),
    'plans', (SELECT COALESCE(JSONB_OBJECT_AGG(tier, n), '{}'::JSONB) FROM (SELECT LOWER(tier) tier, COUNT(DISTINCT player_id) n FROM public.entitlements WHERE is_active AND (expires_at IS NULL OR expires_at > NOW()) GROUP BY 1) x),
    'revenue_cents', (SELECT COALESCE(SUM(amount_cents), 0) FROM public.purchases WHERE payment_status IN ('paid', 'succeeded', 'complete', 'completed')),
    'purchases', (SELECT COUNT(*) FROM public.purchases),
    'tickets_open', (SELECT COUNT(*) FROM public.support_tickets WHERE status NOT IN ('closed', 'resolved')),
    'tournaments_live', (SELECT COUNT(*) FROM public.tournaments WHERE status IN ('registration', 'open', 'in_progress', 'live')),
    'events_upcoming', (SELECT COUNT(*) FROM public.events WHERE starts_at > NOW()),
    'commands_7d', (SELECT COUNT(*) FROM public.bot_command_runs WHERE created_at > NOW() - INTERVAL '7 days'),
    'providers', (SELECT COALESCE(JSONB_OBJECT_AGG(provider, n), '{}'::JSONB) FROM (SELECT provider, COUNT(*) n FROM auth.identities GROUP BY 1) p),
    'signups_14d', (SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT('d', d, 'n', n) ORDER BY d), '[]'::JSONB) FROM (
        SELECT g::DATE d, (SELECT COUNT(*) FROM auth.users u WHERE u.created_at::DATE = g::DATE) n
        FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, INTERVAL '1 day') g) s)
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;

-- Lista de usuarios con email y plan (solo admin)
CREATE OR REPLACE FUNCTION public.admin_players(p_search TEXT DEFAULT NULL)
RETURNS TABLE (player_id UUID, username TEXT, display_name TEXT, email TEXT, verified BOOLEAN, main_game TEXT, region TEXT,
               created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ, providers TEXT[], plan TEXT, is_admin BOOLEAN, discord_user_id TEXT)
LANGUAGE PLPGSQL STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_web_admin() THEN RAISE EXCEPTION 'solo administradores'; END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.display_name, u.email::TEXT, COALESCE(p.verified, FALSE), p.main_game, p.region,
         p.created_at, u.last_sign_in_at,
         (SELECT ARRAY_AGG(DISTINCT i.provider) FROM auth.identities i WHERE i.user_id = u.id),
         COALESCE((SELECT LOWER(e.tier) FROM public.entitlements e WHERE e.player_id = p.id AND e.is_active AND (e.expires_at IS NULL OR e.expires_at > NOW())
                   ORDER BY CASE LOWER(e.tier) WHEN 'elite' THEN 3 WHEN 'pro' THEN 2 WHEN 'basic' THEN 1 ELSE 0 END DESC LIMIT 1), 'free'),
         EXISTS (SELECT 1 FROM public.web_admins w WHERE w.user_id = u.id),
         COALESCE(p.discord_user_id, (SELECT d.discord_id FROM public.player_discord_accounts d WHERE d.player_id = p.id LIMIT 1))
  FROM public.players p LEFT JOIN auth.users u ON u.id = p.auth_user_id
  WHERE p_search IS NULL OR p_search = '' OR p.username ILIKE '%' || p_search || '%' OR p.display_name ILIKE '%' || p_search || '%' OR u.email ILIKE '%' || p_search || '%'
  ORDER BY p.created_at DESC LIMIT 200;
END $$;
REVOKE ALL ON FUNCTION public.admin_players(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_players(TEXT) TO authenticated;

-- Asignar o retirar plan manualmente
CREATE OR REPLACE FUNCTION public.admin_set_plan(p_player UUID, p_tier TEXT)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF COALESCE(public.web_admin_role(), '') NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'solo administradores'; END IF;
  IF p_tier NOT IN ('free', 'basic', 'pro', 'elite') THEN RAISE EXCEPTION 'plan no válido'; END IF;
  UPDATE public.entitlements SET is_active = FALSE WHERE player_id = p_player AND is_active AND source = 'admin';
  IF p_tier <> 'free' THEN
    INSERT INTO public.entitlements (player_id, entitlement_type, tier, source, is_active)
    VALUES (p_player, 'plan', p_tier, 'admin', TRUE);
  ELSE
    UPDATE public.entitlements SET is_active = FALSE WHERE player_id = p_player AND is_active;
  END IF;
  INSERT INTO public.audit_logs (actor_type, actor_id, action, target_type, target_id, metadata)
  VALUES ('web_admin', auth.uid()::TEXT, 'plan_set', 'player', p_player::TEXT, JSONB_BUILD_OBJECT('tier', p_tier));
END $$;
REVOKE ALL ON FUNCTION public.admin_set_plan(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(UUID, TEXT) TO authenticated;

-- ---------- 6. Zona premium: vista previa pública de ventajas ----------
CREATE OR REPLACE FUNCTION public.plan_content_teaser()
RETURNS TABLE (tier TEXT, kind TEXT, title TEXT, sort_order INTEGER)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT tier, kind, title, sort_order FROM public.plan_content WHERE published ORDER BY tier, sort_order
$$;
GRANT EXECUTE ON FUNCTION public.plan_content_teaser() TO anon, authenticated;

-- ---------- 7. Canales de Discord detectados ----------
INSERT INTO public.discord_channels (category, channel_id, guild_id, updated_by, updated_at) VALUES
  ('registros', '1553634435671396432', '1546641331927908472', 'setup', NOW()),
  ('logs',      '1553634435671396432', '1546641331927908472', 'setup', NOW()),
  ('ranked',    '1553938926320877669', '1546641331927908472', 'setup', NOW()),
  ('staff',     '1552513123397926982', '1546641331927908472', 'setup', NOW())
ON CONFLICT (category) DO NOTHING;
