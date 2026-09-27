-- ============================================================
-- VANTS — Datos iniciales (demo, ficticios)
-- Ejecutar DESPUÉS de schema.sql en el SQL Editor de Supabase
-- ============================================================

-- EQUIPOS
insert into teams (slug, name, tag, game, region, crest, motto) values
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
on conflict (slug) do nothing;

-- JUGADORES (equipo por slug)
insert into players (slug, name, game, role, rating, stats, trend) values
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
on conflict (slug) do nothing;

-- Vincular jugadores a sus equipos
update players p set team_id = t.id from teams t where t.slug = 'nova-strike' and p.slug in ('kryoz','sh1nya','davexx','mortal1n','ravenlord');
update players p set team_id = t.id from teams t where t.slug = 'zenith-pulse' and p.slug = 'fenrira';
update players p set team_id = t.id from teams t where t.slug = 'iron-wolves' and p.slug in ('blazko','frozent');
update players p set team_id = t.id from teams t where t.slug = 'night-vector' and p.slug = 'nightowlz';
update players p set team_id = t.id from teams t where t.slug = 'aurora-blaze' and p.slug in ('quasarbit','lumenx');
update players p set team_id = t.id from teams t where t.slug = 'eclipse-core' and p.slug in ('seraphlun','lunaris');
update players p set team_id = t.id from teams t where t.slug = 'tide-breaker' and p.slug = 'tidalsurge';

-- TORNEOS
insert into tournaments (slug, name, game, region, format, status, prize, dates, participants, hue, description) values
  ('vants-pro-circuit-temporada-3', 'VANTS Pro Circuit — Temporada 3', 'valorant', 'latam', 'Grupos + Playoffs', 'live', '$25,000 USD', '12 sep — 18 oct 2026', 12, 260, 'El circuito profesional insignia de VANTS en LATAM.'),
  ('challenger-series-cs2', 'VANTS Challenger Series — CS2', 'cs2', 'eu', 'Suizo + Eliminación directa', 'live', '$10,000 USD', '20 sep — 11 oct 2026', 16, 30, 'La puerta de entrada al circuito profesional europeo de VANTS.'),
  ('summer-cup-lol', 'VANTS Summer Cup — LoL', 'lol', 'eu', 'Round robin + Final BO5', 'completed', '$8,000 USD', '8 — 24 ago 2026', 8, 210, 'La copa de verano de League of Legends.'),
  ('open-qualifier-latam', 'Clasificatorio Abierto LATAM', 'valorant', 'latam', 'Eliminación directa (BO1/BO3)', 'upcoming', '2 plazas al Pro Circuit', '4 — 6 oct 2026', 64, 340, 'Torneo abierto con dos plazas directas a la Temporada 4.'),
  ('winter-clash-apac', 'VANTS Winter Clash — APAC', 'cs2', 'apac', 'Fase de grupos + Playoffs', 'upcoming', '$12,000 USD', '15 — 22 nov 2026', 10, 190, 'El evento de cierre de temporada para Asia-Pacífico.')
on conflict (slug) do nothing;

-- SERIES (partidos) — scheduled_at en hora de Venezuela (America/Caracas, UTC-4)
insert into match_series (public_id, tournament_id, game, stage, best_of, status, scheduled_at, team_a_id, team_b_id, team_a_label, team_b_label, score_a, score_b, winner, mvp, current_map)
select 'm-live-1', t.id, 'valorant', 'Playoffs · Semifinal', 3, 'live', now() - interval '42 minutes',
  (select id from teams where slug='nova-strike'), (select id from teams where slug='aurora-blaze'), null, null, 1, 1, null, null, 'Haven · Ronda 18'
from tournaments t where t.slug='vants-pro-circuit-temporada-3'
on conflict (public_id) do nothing;

insert into match_series (public_id, tournament_id, game, stage, best_of, status, scheduled_at, team_a_id, team_b_id, score_a, score_b, winner, mvp)
select 'm-live-2', t.id, 'cs2', 'Ronda suiza 4', 3, 'live', now() - interval '65 minutes',
  (select id from teams where slug='iron-wolves'), (select id from teams where slug='night-vector'), 0, 1, null, null
from tournaments t where t.slug='challenger-series-cs2'
on conflict (public_id) do nothing;

insert into match_series (public_id, tournament_id, game, stage, best_of, status, scheduled_at, team_a_id, team_b_id, score_a, score_b)
select 'm-up-1', t.id, 'cs2', 'Ronda suiza 5', 3, 'upcoming', now() + interval '5 hours',
  (select id from teams where slug='iron-wolves'), (select id from teams where slug='tide-breaker'), null, null
from tournaments t where t.slug='challenger-series-cs2'
on conflict (public_id) do nothing;

insert into match_series (public_id, tournament_id, game, stage, best_of, status, scheduled_at, team_a_label, team_b_label)
select 'm-up-2', t.id, 'valorant', 'Playoffs · Final', 5, 'upcoming', now() + interval '3 days',
  'Ganador SF1', 'Ganador SF2'
from tournaments t where t.slug='vants-pro-circuit-temporada-3'
on conflict (public_id) do nothing;

insert into match_series (public_id, tournament_id, game, stage, best_of, status, scheduled_at, team_a_id, team_b_id, score_a, score_b, winner, mvp)
select 'm-done-1', t.id, 'lol', 'Final · BO5', 5, 'completed', now() - interval '34 days',
  (select id from teams where slug='eclipse-core'), (select id from teams where slug='vortex-atlas'), 3, 2, 'a', 'Lunaris'
from tournaments t where t.slug='summer-cup-lol'
on conflict (public_id) do nothing;

insert into match_series (public_id, tournament_id, game, stage, best_of, status, scheduled_at, team_a_id, team_b_id, score_a, score_b, winner, mvp)
select 'm-done-2', t.id, 'valorant', 'Grupos · Jornada 5', 3, 'completed', now() - interval '2 days',
  (select id from teams where slug='nova-strike'), (select id from teams where slug='zenith-pulse'), 2, 0, 'a', 'Kryoz'
from tournaments t where t.slug='vants-pro-circuit-temporada-3'
on conflict (public_id) do nothing;

insert into match_series (public_id, tournament_id, game, stage, best_of, status, scheduled_at, team_a_id, team_b_id, score_a, score_b, winner, mvp)
select 'm-done-3', t.id, 'cs2', 'Ronda suiza 3', 3, 'completed', now() - interval '3 days',
  (select id from teams where slug='night-vector'), (select id from teams where slug='polar-signal'), 2, 1, 'a', 'NightOwlz'
from tournaments t where t.slug='challenger-series-cs2'
on conflict (public_id) do nothing;

-- MAPAS de la final de la Summer Cup
insert into match_maps (series_id, sequence, name, score_a, score_b, winner)
select s.id, v.seq, v.name, v.sa, v.sb, v.w
from match_series s, (values
  (1, 'Juego 1', 1, 0, 'a'),
  (2, 'Juego 2', 1, 0, 'a'),
  (3, 'Juego 3', 0, 1, 'b'),
  (4, 'Juego 4', 0, 1, 'b'),
  (5, 'Juego 5', 1, 0, 'a')
) as v(seq, name, sa, sb, w)
where s.public_id = 'm-done-1'
  and not exists (select 1 from match_maps m where m.series_id = s.id);

-- NOTICIAS
insert into news_articles (slug, title, excerpt, body, author, game, hue, published_at) values
  ('nova-strike-clasifica-final-pro-circuit',
   'Nova Strike asegura su plaza en la final del Pro Circuit',
   'El conjunto venezolano selló su pase tras una serie a tres mapas llena de remontadas.',
   '["Nova Strike volvió a demostrar por qué es el equipo a batir de la Temporada 3 del VANTS Pro Circuit. En una semifinal que se extendió por más de dos horas, el conjunto caraqueño superó a Aurora Blaze y dejó la serie 2-1 para acceder a la gran final del próximo domingo.", "La final se disputará al mejor de cinco mapas. El rival saldrá del cruce entre Zenith Pulse y Ember Fox, que se disputa este lunes."]::jsonb',
   'Redacción VANTS', 'valorant', 260, now() - interval '2 hours')
on conflict (slug) do nothing;

insert into news_articles (slug, title, excerpt, body, author, game, hue, published_at) values
  ('iron-wolves-perfecto-suizo',
   'Iron Wolves firma un suizo perfecto en la Challenger Series',
   'Cuatro victorias en cuatro rondas. El plantel europeo llega invicto a los playoffs del torneo de CS2.',
   '["Iron Wolves completó la fase suiza de la VANTS Challenger Series con récord perfecto: cuatro series ganadas y un único mapa cedido en doce disputados.", "Los playoffs arrancan el próximo jueves con cuartos de final al mejor de tres."]::jsonb',
   'Redacción VANTS', 'cs2', 30, now() - interval '1 day')
on conflict (slug) do nothing;

insert into news_articles (slug, title, excerpt, body, author, game, hue, published_at) values
  ('seraphlun-mvp-summer-cup',
   'SeraphLun, MVP de la Summer Cup',
   'El midlaner de Eclipse Core promedió 6.8 de K/D/A en la final ante Vortex Atlas.',
   '["Eclipse Core levantó la VANTS Summer Cup tras una final a cinco juegos que ya se considera un clásico instantáneo. SeraphLun, con 6.8 de K/D/A y 612 de daño por minuto, fue elegido MVP del torneo."]::jsonb',
   'Redacción VANTS', 'lol', 210, now() - interval '34 days')
on conflict (slug) do nothing;
