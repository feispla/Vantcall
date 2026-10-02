-- ============================================================
-- VANTS — Datos iniciales
-- Ejecutar DESPUÉS de schema.sql en el SQL Editor de Supabase
-- ============================================================

-- EQUIPOS
INSERT INTO teams (slug, name, tag, game, region, crest, motto) VALUES
  ('eclipse-core', 'Eclipse Core', 'ECL', 'lol', 'eu', '#3d2f6e', 'Sombra y precisión'),
  ('nova-strike', 'Nova Strike', 'NVS', 'valorant', 'latam', '#0f6e5c', 'Impacto total'),
  ('iron-wolves', 'Iron Wolves', 'IRW', 'cs2', 'eu', '#5a5f6b', 'Manada de acero'),
  ('night-vector', 'Night Vector', 'NVC', 'cs2', 'na', '#1f2a44', 'Silencio letal'),
  ('zenith-pulse', 'Zenith Pulse', 'ZNP', 'valorant', 'br', '#8a4a12', 'Ritmo ascendente'),
  ('vortex-atlas', 'Vortex Atlas', 'VXA', 'lol', 'latam', '#2d5a8e', 'El mapa del caos'),
  ('aurora-blaze', 'Aurora Blaze', 'ABZ', 'valorant', 'eu', '#7a1f3d', 'Fuego en el horizonte'),
  ('apex-falcon', 'Apex Falcon', 'APF', 'lol', 'na', '#3e5c1f', 'Vuelo supremo'),
  ('polar-signal', 'Polar Signal', 'PSG', 'cs2', 'apac', '#1f5c66', 'Frecuencia ártica'),
  ('ember-fox', 'Ember Fox', 'EMF', 'valorant', 'apac', '#8e2d1a', 'Astucia incandescente'),
  ('cipher-9', 'Cipher Nine', 'C9X', 'lol', 'br', '#4a4458', 'Código invicto'),
  ('tide-breaker', 'Tide Breaker', 'TDB', 'cs2', 'latam', '#0e4a3a', 'Ola imparable')
ON CONFLICT (slug) DO NOTHING;

-- JUGADORES
INSERT INTO players (slug, name, game, role, rating, stats, trend) VALUES
  ('kryoz', 'Kryoz', 'valorant', 'Duelista', 2841, '{"kd":1.31,"acs":268,"hs":24}', 2),
  ('sh1nya', 'sh1nya', 'valorant', 'Iniciador', 2712, '{"kd":1.12,"acs":231,"hs":19}', 1),
  ('davexx', 'Davexx', 'valorant', 'Controlador', 2650, '{"kd":1.05,"acs":219,"hs":17}', 0),
  ('mortal1n', 'Mortal1n', 'valorant', 'Centinela', 2588, '{"kd":1.08,"acs":214,"hs":21}', -1),
  ('ravenlord', 'RavenLord', 'valorant', 'Flex', 2534, '{"kd":0.98,"acs":205,"hs":16}', 3),
  ('fenrira', 'Fenrira', 'valorant', 'Duelista', 2776, '{"kd":1.26,"acs":259,"hs":26}', 6),
  ('blazko', 'Blazko', 'cs2', 'Entry', 2798, '{"kd":1.22,"adr":88.4,"kast":74.2,"hs":41}', 4),
  ('frozent', 'Frozent', 'cs2', 'AWPer', 2866, '{"kd":1.28,"adr":82.1,"kast":72.8,"hs":32}', 1),
  ('seraphlun', 'SeraphLun', 'lol', 'Mid', 2905, '{"kda":6.8,"csmin":9.4,"dpm":612}', 5),
  ('lunaris', 'Lunaris', 'lol', 'ADC', 2812, '{"kda":7.2,"csmin":10.1,"dpm":689}', 2),
  ('nightowlz', 'NightOwlz', 'cs2', 'AWPer', 2701, '{"kd":1.15,"adr":80.3,"kast":71.9,"hs":30}', 1),
  ('quasarbit', 'QuasarBit', 'valorant', 'Controlador', 2592, '{"kd":1.02,"acs":218,"hs":20}', 2),
  ('lumenx', 'LumenX', 'valorant', 'Duelista', 2690, '{"kd":1.21,"acs":251,"hs":25}', 2),
  ('tidalsurge', 'TidalSurge', 'cs2', 'Entry', 2601, '{"kd":1.08,"adr":76.7,"kast":73.1,"hs":39}', 3)
ON CONFLICT (slug) DO NOTHING;

-- Vincular jugadores a equipos
UPDATE players p SET team_id = t.id FROM teams t WHERE t.slug = 'nova-strike' AND p.slug IN ('kryoz','sh1nya','davexx','mortal1n','ravenlord');
UPDATE players p SET team_id = t.id FROM teams t WHERE t.slug = 'zenith-pulse' AND p.slug = 'fenrira';
UPDATE players p SET team_id = t.id FROM teams t WHERE t.slug = 'iron-wolves' AND p.slug IN ('blazko','frozent');
UPDATE players p SET team_id = t.id FROM teams t WHERE t.slug = 'night-vector' AND p.slug = 'nightowlz';
UPDATE players p SET team_id = t.id FROM teams t WHERE t.slug = 'aurora-blaze' AND p.slug IN ('quasarbit','lumenx');
UPDATE players p SET team_id = t.id FROM teams t WHERE t.slug = 'eclipse-core' AND p.slug IN ('seraphlun','lunaris');
UPDATE players p SET team_id = t.id FROM teams t WHERE t.slug = 'tide-breaker' AND p.slug = 'tidalsurge';

-- TORNEOS
INSERT INTO tournaments (slug, name, game, region, format, status, prize, dates, participants, hue, description) VALUES
  ('vants-pro-circuit-temporada-3', 'VANTS Pro Circuit — Temporada 3', 'valorant', 'latam', 'Grupos + Playoffs', 'live', '$25,000 USD', '12 sep — 18 oct 2026', 12, 260, 'El circuito profesional insignia de VANTS en LATAM.'),
  ('challenger-series-cs2', 'VANTS Challenger Series — CS2', 'cs2', 'eu', 'Suizo + Eliminación directa', 'live', '$10,000 USD', '20 sep — 11 oct 2026', 16, 30, 'La puerta de entrada al circuito profesional europeo de VANTS.'),
  ('summer-cup-lol', 'VANTS Summer Cup — LoL', 'lol', 'eu', 'Round robin + Final BO5', 'completed', '$8,000 USD', '8 — 24 ago 2026', 8, 210, 'La copa de verano de League of Legends.'),
  ('open-qualifier-latam', 'Clasificatorio Abierto LATAM', 'valorant', 'latam', 'Eliminación directa (BO1/BO3)', 'upcoming', '2 plazas al Pro Circuit', '4 — 6 oct 2026', 64, 340, 'Torneo abierto con dos plazas directas a la Temporada 4.'),
  ('winter-clash-apac', 'VANTS Winter Clash — APAC', 'cs2', 'apac', 'Fase de grupos + Playoffs', 'upcoming', '$12,000 USD', '15 — 22 nov 2026', 10, 190, 'El evento de cierre de temporada para Asia-Pacífico.')
ON CONFLICT (slug) DO NOTHING;
