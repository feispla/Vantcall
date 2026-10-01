-- ============================================================
-- VANTS · Panel admin, comandos del bot desde Supabase y zona premium
-- ============================================================

-- ---------- 1. Administradores de la web ----------
create table if not exists public.web_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'moderator')),
  created_at timestamptz not null default now()
);
alter table public.web_admins enable row level security;

create or replace function public.web_admin_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.web_admins where user_id = auth.uid()
$$;
create or replace function public.is_web_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.web_admins where user_id = auth.uid())
$$;
revoke all on function public.web_admin_role() from public;
revoke all on function public.is_web_admin() from public;
grant execute on function public.web_admin_role() to authenticated;
grant execute on function public.is_web_admin() to authenticated;

drop policy if exists "admins leen admins" on public.web_admins;
create policy "admins leen admins" on public.web_admins for select to authenticated using (public.is_web_admin());
drop policy if exists "owner gestiona admins" on public.web_admins;
create policy "owner gestiona admins" on public.web_admins for all to authenticated
  using (public.web_admin_role() = 'owner') with check (public.web_admin_role() = 'owner');

-- Propietaria inicial: cuenta feiss (feisplaa@gmail.com)
insert into public.web_admins (user_id, role)
select id, 'owner' from auth.users where email = 'feisplaa@gmail.com'
on conflict (user_id) do update set role = 'owner';

-- ---------- 2. Acceso total de admin (RLS) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'players','profiles','seasons','season_player_stats','ranked_matches','ranked_rules','ranked_history',
    'tournaments','tournament_entries','tournament_matches','events','event_rsvps',
    'support_tickets','support_ticket_messages','purchases','entitlements','tickets','audit_logs',
    'vant_sync_events','postulaciones','plan_content','discord_channels','bot_admins','player_discord_accounts'
  ] loop
    execute format('drop policy if exists "admin web total" on public.%I', t);
    execute format('create policy "admin web total" on public.%I for all to authenticated using (public.is_web_admin()) with check (public.is_web_admin())', t);
  end loop;
end $$;

-- ---------- 3. Catálogo de comandos del bot ----------
create table if not exists public.bot_commands (
  name text primary key check (name ~ '^[a-z0-9_-]{1,32}$'),
  description text not null check (char_length(description) between 1 and 100),
  kind text not null default 'custom' check (kind in ('builtin', 'custom')),
  category text not null default 'comunidad',
  enabled boolean not null default true,
  staff_only boolean not null default false,
  min_plan text not null default 'free' check (min_plan in ('free', 'basic', 'pro', 'elite')),
  response_title text check (char_length(response_title) <= 256),
  response_body text check (char_length(response_body) <= 3500),
  response_url text check (response_url is null or response_url ~ '^https://'),
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  ephemeral boolean not null default false,
  sort_order integer not null default 100,
  uses integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bot_commands enable row level security;
drop policy if exists "comandos públicos" on public.bot_commands;
create policy "comandos públicos" on public.bot_commands for select to anon, authenticated using (enabled and not staff_only);
drop policy if exists "admin web total" on public.bot_commands;
create policy "admin web total" on public.bot_commands for all to authenticated using (public.is_web_admin()) with check (public.is_web_admin());

insert into public.bot_commands (name, description, kind, category, staff_only, sort_order) values
  ('ayuda',      'Lista de comandos de VANTS',                         'builtin', 'general',   false, 10),
  ('perfil',     'Tu perfil competitivo VANTS (o el de otro jugador)', 'builtin', 'ranked',    false, 20),
  ('ranking',    'Top 10 de la temporada ranked',                      'builtin', 'ranked',    false, 30),
  ('torneos',    'Torneos abiertos y próximos',                        'builtin', 'torneos',   false, 40),
  ('torneo',     'Inscríbete en un torneo VANTS',                      'builtin', 'torneos',   false, 50),
  ('eventos',    'Próximos eventos de la comunidad',                   'builtin', 'calendario',false, 60),
  ('calendario', 'Lo que viene en los próximos 7 días',                'builtin', 'calendario',false, 70),
  ('planes',     'Planes BASIC, PRO y ELITE',                          'builtin', 'planes',    false, 80),
  ('zona',       'Tus ventajas exclusivas según tu plan',              'builtin', 'planes',    false, 85),
  ('vincular',   'Conecta tu Discord con tu cuenta de la web',         'builtin', 'general',   false, 90),
  ('web',        'Enlaces de la plataforma VANTS',                     'builtin', 'general',   false, 95),
  ('vants',      'Herramientas de staff de VANTS',                     'builtin', 'staff',     true,  200)
on conflict (name) do update set kind = 'builtin', staff_only = excluded.staff_only;

insert into public.bot_commands (name, description, kind, category, response_title, response_body, color, sort_order) values
  ('reglas', 'Código de conducta de VANTS', 'custom', 'comunidad', 'Código de conducta VANTS',
   E'1. Respeto total: sin insultos, acoso ni discriminación.\n2. Juego limpio: nada de cheats, smurfs ni boosting.\n3. Puntualidad: llega 10 minutos antes al check-in.\n4. Reporta resultados con captura en el canal del torneo.\n5. El staff tiene la última palabra en disputas.', '#ff4655', 110),
  ('soporte', 'Cómo pedir ayuda al staff', 'custom', 'comunidad', 'Soporte VANTS',
   E'Abre un ticket desde **Mi cuenta → Soporte** en la web o escribe a feispla@hotmail.com.\nTiempo de respuesta: 24 h (PRO y ELITE tienen prioridad).', '#5865f2', 120)
on conflict (name) do nothing;

-- Registro de uso de comandos (analítica del panel)
create table if not exists public.bot_command_runs (
  id bigint generated always as identity primary key,
  command text not null,
  discord_id text,
  guild_id text,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists bot_command_runs_created_idx on public.bot_command_runs (created_at desc);
alter table public.bot_command_runs enable row level security;
drop policy if exists "admin web lee" on public.bot_command_runs;
create policy "admin web lee" on public.bot_command_runs for select to authenticated using (public.is_web_admin());

-- ---------- 4. Configuración del bot (Vault) ----------
-- Solo admins pueden escribir; solo service_role puede leer el valor.
create or replace function public.admin_set_bot_secret(p_name text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  if coalesce(public.web_admin_role(), '') not in ('owner', 'admin') then raise exception 'solo administradores'; end if;
  if p_name not in ('discord_bot_token', 'discord_public_key', 'discord_application_id', 'discord_guild_id') then raise exception 'nombre no permitido'; end if;
  if p_value is null or char_length(trim(p_value)) < 5 or char_length(p_value) > 200 then raise exception 'valor no válido'; end if;
  select id into sid from vault.secrets where name = p_name;
  if sid is null then perform vault.create_secret(trim(p_value), p_name, 'VANTS bot');
  else perform vault.update_secret(sid, trim(p_value)); end if;
  insert into public.audit_logs (actor_type, actor_id, action, target_type, target_id, metadata)
  values ('web_admin', auth.uid()::text, 'bot_secret_set', 'vault', p_name, '{}'::jsonb);
end $$;
revoke all on function public.admin_set_bot_secret(text, text) from public;
grant execute on function public.admin_set_bot_secret(text, text) to authenticated;

create or replace function public.get_bot_secret(p_name text)
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = p_name and p_name in ('discord_bot_token', 'discord_public_key', 'discord_application_id', 'discord_guild_id') limit 1
$$;
revoke all on function public.get_bot_secret(text) from public, anon, authenticated;
grant execute on function public.get_bot_secret(text) to service_role;

create or replace function public.admin_bot_config_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_web_admin() then raise exception 'solo administradores'; end if;
  return jsonb_build_object(
    'bot_token', exists (select 1 from vault.secrets where name = 'discord_bot_token'),
    'public_key', exists (select 1 from vault.secrets where name = 'discord_public_key'),
    'application_id', (select decrypted_secret from vault.decrypted_secrets where name = 'discord_application_id'),
    'guild_id', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'discord_guild_id'), '1546641331927908472')
  );
end $$;
revoke all on function public.admin_bot_config_status() from public;
grant execute on function public.admin_bot_config_status() to authenticated;

-- ---------- 5. Resumen del panel ----------
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_web_admin() then raise exception 'solo administradores'; end if;
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'players', (select count(*) from public.players),
    'logins_24h', (select count(*) from auth.users where last_sign_in_at > now() - interval '24 hours'),
    'plans', (select coalesce(jsonb_object_agg(tier, n), '{}'::jsonb) from (select lower(tier) tier, count(distinct player_id) n from public.entitlements where is_active and (expires_at is null or expires_at > now()) group by 1) x),
    'revenue_cents', (select coalesce(sum(amount_cents), 0) from public.purchases where payment_status in ('paid', 'succeeded', 'complete', 'completed')),
    'purchases', (select count(*) from public.purchases),
    'tickets_open', (select count(*) from public.support_tickets where status not in ('closed', 'resolved')),
    'tournaments_live', (select count(*) from public.tournaments where status in ('registration', 'open', 'in_progress', 'live')),
    'events_upcoming', (select count(*) from public.events where starts_at > now()),
    'commands_7d', (select count(*) from public.bot_command_runs where created_at > now() - interval '7 days'),
    'providers', (select coalesce(jsonb_object_agg(provider, n), '{}'::jsonb) from (select provider, count(*) n from auth.identities group by 1) p),
    'signups_14d', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb) from (
        select g::date d, (select count(*) from auth.users u where u.created_at::date = g::date) n
        from generate_series(current_date - 13, current_date, interval '1 day') g) s)
  );
end $$;
revoke all on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;

-- Lista de usuarios con email y plan (solo admin)
create or replace function public.admin_players(p_search text default null)
returns table (player_id uuid, username text, display_name text, email text, verified boolean, main_game text, region text,
               created_at timestamptz, last_sign_in_at timestamptz, providers text[], plan text, is_admin boolean, discord_user_id text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_web_admin() then raise exception 'solo administradores'; end if;
  return query
  select p.id, p.username, p.display_name, u.email::text, coalesce(p.verified, false), p.main_game, p.region,
         p.created_at, u.last_sign_in_at,
         (select array_agg(distinct i.provider) from auth.identities i where i.user_id = u.id),
         coalesce((select lower(e.tier) from public.entitlements e where e.player_id = p.id and e.is_active and (e.expires_at is null or e.expires_at > now())
                   order by case lower(e.tier) when 'elite' then 3 when 'pro' then 2 when 'basic' then 1 else 0 end desc limit 1), 'free'),
         exists (select 1 from public.web_admins w where w.user_id = u.id),
         coalesce(p.discord_user_id, (select d.discord_id from public.player_discord_accounts d where d.player_id = p.id limit 1))
  from public.players p left join auth.users u on u.id = p.auth_user_id
  where p_search is null or p_search = '' or p.username ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%'
  order by p.created_at desc limit 200;
end $$;
revoke all on function public.admin_players(text) from public;
grant execute on function public.admin_players(text) to authenticated;

-- Asignar o retirar plan manualmente
create or replace function public.admin_set_plan(p_player uuid, p_tier text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.web_admin_role(), '') not in ('owner', 'admin') then raise exception 'solo administradores'; end if;
  if p_tier not in ('free', 'basic', 'pro', 'elite') then raise exception 'plan no válido'; end if;
  update public.entitlements set is_active = false where player_id = p_player and is_active and source = 'admin';
  if p_tier <> 'free' then
    insert into public.entitlements (player_id, entitlement_type, tier, source, is_active)
    values (p_player, 'plan', p_tier, 'admin', true);
  else
    update public.entitlements set is_active = false where player_id = p_player and is_active;
  end if;
  insert into public.audit_logs (actor_type, actor_id, action, target_type, target_id, metadata)
  values ('web_admin', auth.uid()::text, 'plan_set', 'player', p_player::text, jsonb_build_object('tier', p_tier));
end $$;
revoke all on function public.admin_set_plan(uuid, text) from public;
grant execute on function public.admin_set_plan(uuid, text) to authenticated;

-- ---------- 6. Zona premium: vista previa pública de ventajas ----------
create or replace function public.plan_content_teaser()
returns table (tier text, kind text, title text, sort_order integer)
language sql stable security definer set search_path = '' as $$
  select tier, kind, title, sort_order from public.plan_content where published order by tier, sort_order
$$;
grant execute on function public.plan_content_teaser() to anon, authenticated;

-- ---------- 7. Canales de Discord detectados en el servidor VANTS ----------
insert into public.discord_channels (category, channel_id, guild_id, updated_by, updated_at) values
  ('registros', '1553634435671396432', '1546641331927908472', 'setup', now()),
  ('logs',      '1553634435671396432', '1546641331927908472', 'setup', now()),
  ('ranked',    '1553938926320877669', '1546641331927908472', 'setup', now()),
  ('staff',     '1552513123397926982', '1546641331927908472', 'setup', now())
on conflict (category) do nothing;
