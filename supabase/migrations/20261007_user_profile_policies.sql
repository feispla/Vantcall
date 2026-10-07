-- ============================================================
-- 20261007_user_profile_policies.sql
-- Políticas RLS y privilegios para edición/lectura de perfil de usuario
-- Aplica en: players, profiles
-- ============================================================

-- ---------- Privilegios de tabla (RLS filtra filas, GRANT da acceso) ----------
GRANT SELECT ON public.players TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.players TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- ---------- players: lectura pública (leaderboard, perfiles públicos) ----------
DROP POLICY IF EXISTS "players lectura publica" ON public.players;
CREATE POLICY "players lectura publica" ON public.players
  FOR SELECT TO anon, authenticated
  USING (true);

-- ---------- players: cada usuario lee su propia fila ----------
DROP POLICY IF EXISTS "usuario lee su player" ON public.players;
CREATE POLICY "usuario lee su player" ON public.players
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- ---------- players: cada usuario edita su propia fila ----------
DROP POLICY IF EXISTS "usuario edita su player" ON public.players;
CREATE POLICY "usuario edita su player" ON public.players
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ---------- profiles: lectura pública de perfiles públicos ----------
DROP POLICY IF EXISTS "profiles lectura publica" ON public.profiles;
CREATE POLICY "profiles lectura publica" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (
    visibility = 'public'
    OR player_id IN (SELECT id FROM public.players WHERE auth_user_id = auth.uid())
  );

-- ---------- profiles: cada usuario lee su propio perfil ----------
DROP POLICY IF EXISTS "usuario lee su profile" ON public.profiles;
CREATE POLICY "usuario lee su profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (player_id IN (SELECT id FROM public.players WHERE auth_user_id = auth.uid()));

-- ---------- profiles: cada usuario edita su propio perfil ----------
DROP POLICY IF EXISTS "usuario edita su profile" ON public.profiles;
CREATE POLICY "usuario edita su profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (player_id IN (SELECT id FROM public.players WHERE auth_user_id = auth.uid()))
  WITH CHECK (player_id IN (SELECT id FROM public.players WHERE auth_user_id = auth.uid()));
