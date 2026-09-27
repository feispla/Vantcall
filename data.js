/* ============================================================
   VANTS — Datos de demostración
   Todos los equipos, jugadores, torneos y resultados son ficticios.
   ============================================================ */

const GAMES = {
  valorant: { slug: 'valorant', name: 'VALORANT', short: 'VAL', dot: 'dot--valorant' },
  cs2: { slug: 'cs2', name: 'Counter-Strike 2', short: 'CS2', dot: 'dot--cs2' },
  lol: { slug: 'lol', name: 'League of Legends', short: 'LoL', dot: 'dot--lol' },
};

const REGIONS = {
  latam: 'LATAM',
  na: 'Norteamérica',
  eu: 'Europa',
  br: 'Brasil',
  apac: 'Asia-Pacífico',
};

// Colores de escudo (propios, ficticios)
const CREST_COLORS = {
  eclipse: '#3d2f6e', nova: '#0f6e5c', iron: '#5a5f6b', night: '#1f2a44',
  zenith: '#8a4a12', vortex: '#2d5a8e', aurora: '#7a1f3d', apex: '#3e5c1f',
  polar: '#1f5c66', ember: '#8e2d1a', cipher: '#4a4458', tide: '#0e4a3a',
};

const TEAMS = [
  { id: 'eclipse-core', slug: 'eclipse-core', name: 'Eclipse Core', tag: 'ECL', game: 'lol', region: 'eu', crest: CREST_COLORS.eclipse, motto: 'Sombra y precisión' },
  { id: 'nova-strike', slug: 'nova-strike', name: 'Nova Strike', tag: 'NVS', game: 'valorant', region: 'latam', crest: CREST_COLORS.nova, motto: 'Impacto total' },
  { id: 'iron-wolves', slug: 'iron-wolves', name: 'Iron Wolves', tag: 'IRW', game: 'cs2', region: 'eu', crest: CREST_COLORS.iron, motto: 'Manada de acero' },
  { id: 'night-vector', slug: 'night-vector', name: 'Night Vector', tag: 'NVC', game: 'cs2', region: 'na', crest: CREST_COLORS.night, motto: 'Silencio letal' },
  { id: 'zenith-pulse', slug: 'zenith-pulse', name: 'Zenith Pulse', tag: 'ZNP', game: 'valorant', region: 'br', crest: CREST_COLORS.zenith, motto: 'Ritmo ascendente' },
  { id: 'vortex-atlas', slug: 'vortex-atlas', name: 'Vortex Atlas', tag: 'VXA', game: 'lol', region: 'latam', crest: CREST_COLORS.vortex, motto: 'El mapa del caos' },
  { id: 'aurora-blaze', slug: 'aurora-blaze', name: 'Aurora Blaze', tag: 'ABZ', game: 'valorant', region: 'eu', crest: CREST_COLORS.aurora, motto: 'Fuego en el horizonte' },
  { id: 'apex-falcon', slug: 'apex-falcon', name: 'Apex Falcon', tag: 'APF', game: 'lol', region: 'na', crest: CREST_COLORS.apex, motto: 'Vuelo supremo' },
  { id: 'polar-signal', slug: 'polar-signal', name: 'Polar Signal', tag: 'PSG', game: 'cs2', region: 'apac', crest: CREST_COLORS.polar, motto: 'Frecuencia ártica' },
  { id: 'ember-fox', slug: 'ember-fox', name: 'Ember Fox', tag: 'EMF', game: 'valorant', region: 'apac', crest: CREST_COLORS.ember, motto: 'Astucia incandescente' },
  { id: 'cipher-9', slug: 'cipher-9', name: 'Cipher Nine', tag: 'C9X', game: 'lol', region: 'br', crest: CREST_COLORS.cipher, motto: 'Código invicto' },
  { id: 'tide-breaker', slug: 'tide-breaker', name: 'Tide Breaker', tag: 'TDB', game: 'cs2', region: 'latam', crest: CREST_COLORS.tide, motto: 'Ola imparable' },
];

// Jugadores ficticios (5 por equipo principal)
const PLAYERS = [
  { slug: 'kryoz', name: 'Kryoz', team: 'nova-strike', game: 'valorant', role: 'Duelista', rating: 2841, kd: 1.31, acs: 268, hs: 24, trend: 2 },
  { slug: 'sh1nya', name: 'sh1nya', team: 'nova-strike', game: 'valorant', role: 'Iniciador', rating: 2712, kd: 1.12, acs: 231, hs: 19, trend: 1 },
  { slug: 'davexx', name: 'Davexx', team: 'nova-strike', game: 'valorant', role: 'Controlador', rating: 2650, kd: 1.05, acs: 219, hs: 17, trend: 0 },
  { slug: 'mortal1n', name: 'Mortal1n', team: 'nova-strike', game: 'valorant', role: 'Centinela', rating: 2588, kd: 1.08, acs: 214, hs: 21, trend: -1 },
  { slug: 'ravenlord', name: 'RavenLord', team: 'nova-strike', game: 'valorant', role: 'Flex', rating: 2534, kd: 0.98, acs: 205, hs: 16, trend: 3 },
  { slug: 'blazko', name: 'Blazko', team: 'iron-wolves', game: 'cs2', role: 'Entry', rating: 2798, kd: 1.22, adr: 88.4, kast: 74.2, hs: 41, trend: 4 },
  { slug: 'frozent', name: 'Frozent', team: 'iron-wolves', game: 'cs2', role: 'AWPer', rating: 2866, kd: 1.28, adr: 82.1, kast: 72.8, hs: 32, trend: 1 },
  { slug: 'niktez', name: 'Niktez', team: 'iron-wolves', game: 'cs2', role: 'IGL', rating: 2410, kd: 0.94, adr: 68.9, kast: 70.1, hs: 38, trend: 0 },
  { slug: 'karv', name: 'Karv', team: 'iron-wolves', game: 'cs2', role: 'Support', rating: 2533, kd: 0.99, adr: 71.5, kast: 75.6, hs: 35, trend: 2 },
  { slug: 'voltar', name: 'Voltar', team: 'iron-wolves', game: 'cs2', role: 'Lurker', rating: 2610, kd: 1.11, adr: 79.8, kast: 73.3, hs: 44, trend: -2 },
  { slug: 'seraphlun', name: 'SeraphLun', team: 'eclipse-core', game: 'lol', role: 'Mid', rating: 2905, kda: 6.8, csmin: 9.4, dpm: 612, trend: 5 },
  { slug: 'thornweaver', name: 'ThornWeaver', team: 'eclipse-core', game: 'lol', role: 'Jungle', rating: 2740, kda: 5.1, csmin: 6.1, dpm: 388, trend: 1 },
  { slug: 'galeforce', name: 'GaleForce', team: 'eclipse-core', game: 'lol', role: 'Top', rating: 2688, kda: 4.6, csmin: 8.8, dpm: 521, trend: -1 },
  { slug: 'lunaris', name: 'Lunaris', team: 'eclipse-core', game: 'lol', role: 'ADC', rating: 2812, kda: 7.2, csmin: 10.1, dpm: 689, trend: 2 },
  { slug: 'obsidianwall', name: 'ObsidianWall', team: 'eclipse-core', game: 'lol', role: 'Support', rating: 2495, kda: 4.9, csmin: 1.2, dpm: 210, trend: 0 },
  { slug: 'fenrira', name: 'Fenrira', team: 'zenith-pulse', game: 'valorant', role: 'Duelista', rating: 2776, kd: 1.26, acs: 259, hs: 26, trend: 6 },
  { slug: 'pandamonium', name: 'PandaMonium', team: 'zenith-pulse', game: 'valorant', role: 'Iniciador', rating: 2644, kd: 1.09, acs: 224, hs: 18, trend: 1 },
  { slug: 'vexil', name: 'Vexil', team: 'vortex-atlas', game: 'lol', role: 'Mid', rating: 2699, kda: 5.4, csmin: 9.1, dpm: 574, trend: 3 },
  { slug: 'stormfang', name: 'StormFang', team: 'vortex-atlas', game: 'lol', role: 'Jungle', rating: 2611, kda: 4.2, csmin: 5.8, dpm: 356, trend: -3 },
  { slug: 'quasarbit', name: 'QuasarBit', team: 'aurora-blaze', game: 'valorant', role: 'Controlador', rating: 2592, kd: 1.02, acs: 218, hs: 20, trend: 2 },
  { slug: 'nightowlz', name: 'NightOwlz', team: 'night-vector', game: 'cs2', role: 'AWPer', rating: 2701, kd: 1.15, adr: 80.3, kast: 71.9, hs: 30, trend: 1 },
  { slug: 'acehigh', name: 'AceHigh', team: 'apex-falcon', game: 'lol', role: 'ADC', rating: 2733, kda: 6.1, csmin: 9.8, dpm: 645, trend: 4 },
  { slug: 'glacierpeak', name: 'GlacierPeak', team: 'polar-signal', game: 'cs2', role: 'IGL', rating: 2470, kd: 0.97, adr: 66.2, kast: 72.4, hs: 33, trend: 0 },
  { slug: 'solarflare', name: 'SolarFlare', team: 'ember-fox', game: 'valorant', role: 'Duelista', rating: 2665, kd: 1.18, acs: 247, hs: 28, trend: -2 },
  { slug: 'hexcode', name: 'HexCode', team: 'cipher-9', game: 'lol', role: 'Top', rating: 2588, kda: 4.4, csmin: 8.6, dpm: 508, trend: 1 },
  { slug: 'tidalsurge', name: 'TidalSurge', team: 'tide-breaker', game: 'cs2', role: 'Entry', rating: 2601, kd: 1.08, adr: 76.7, kast: 73.1, hs: 39, trend: 3 },
  { slug: 'lumenx', name: 'LumenX', team: 'aurora-blaze', game: 'valorant', role: 'Duelista', rating: 2690, kd: 1.21, acs: 251, hs: 25, trend: 2 },
  { slug: 'driftk1ng', name: 'DriftK1ng', team: 'aurora-blaze', game: 'valorant', role: 'Iniciador', rating: 2571, kd: 1.04, acs: 221, hs: 18, trend: 1 },
  { slug: 'solstice', name: 'Solstice', team: 'aurora-blaze', game: 'valorant', role: 'Centinela', rating: 2549, kd: 1.01, acs: 216, hs: 22, trend: -1 },
  { slug: 'ardentfox', name: 'ArdentFox', team: 'aurora-blaze', game: 'valorant', role: 'Flex', rating: 2503, kd: 0.96, acs: 208, hs: 15, trend: 0 },
  { slug: 'wraithsong', name: 'WraithSong', team: 'vortex-atlas', game: 'lol', role: 'ADC', rating: 2655, kda: 5.8, csmin: 9.6, dpm: 618, trend: 2 },
  { slug: 'galevane', name: 'GaleVane', team: 'vortex-atlas', game: 'lol', role: 'Top', rating: 2567, kda: 4.1, csmin: 8.4, dpm: 495, trend: 0 },
  { slug: 'cobaltward', name: 'CobaltWard', team: 'vortex-atlas', game: 'lol', role: 'Support', rating: 2480, kda: 4.7, csmin: 1.1, dpm: 205, trend: 1 },
  { slug: 'riotbloom', name: 'RiotBloom', team: 'zenith-pulse', game: 'valorant', role: 'Controlador', rating: 2602, kd: 1.06, acs: 222, hs: 19, trend: 2 },
  { slug: 'zephyr', name: 'Zephyr', team: 'zenith-pulse', game: 'valorant', role: 'Centinela', rating: 2544, kd: 1.0, acs: 213, hs: 21, trend: 0 },
  { slug: 'axiom', name: 'Axiom', team: 'zenith-pulse', game: 'valorant', role: 'Flex', rating: 2519, kd: 0.97, acs: 206, hs: 17, trend: 1 },
  { slug: 'staticsh0ck', name: 'StaticSh0ck', team: 'night-vector', game: 'cs2', role: 'Entry', rating: 2633, kd: 1.09, adr: 74.8, kast: 72.6, hs: 40, trend: 2 },
  { slug: 'kaido', name: 'Kaido', team: 'night-vector', game: 'cs2', role: 'IGL', rating: 2455, kd: 0.95, adr: 65.4, kast: 71.2, hs: 34, trend: 0 },
  { slug: 'miragerun', name: 'MirageRun', team: 'night-vector', game: 'cs2', role: 'Lurker', rating: 2578, kd: 1.07, adr: 75.9, kast: 73.8, hs: 37, trend: 1 },
  { slug: 'borealis', name: 'Borealis', team: 'polar-signal', game: 'cs2', role: 'AWPer', rating: 2618, kd: 1.12, adr: 78.2, kast: 72.1, hs: 31, trend: 3 },
  { slug: 'yukiro', name: 'Yukiro', team: 'polar-signal', game: 'cs2', role: 'Entry', rating: 2552, kd: 1.05, adr: 73.4, kast: 74.5, hs: 38, trend: 1 },
  { slug: 'frostbyte', name: 'FrostByte', team: 'polar-signal', game: 'cs2', role: 'Support', rating: 2489, kd: 0.98, adr: 69.7, kast: 73.9, hs: 36, trend: -1 },
  { slug: 'coralix', name: 'Coralix', team: 'tide-breaker', game: 'cs2', role: 'AWPer', rating: 2560, kd: 1.06, adr: 74.1, kast: 71.8, hs: 29, trend: 1 },
  { slug: 'maelstr0m', name: 'Maelstr0m', team: 'tide-breaker', game: 'cs2', role: 'IGL', rating: 2441, kd: 0.93, adr: 64.8, kast: 70.9, hs: 33, trend: 0 },
  { slug: 'abysso', name: 'Abysso', team: 'tide-breaker', game: 'cs2', role: 'Lurker', rating: 2531, kd: 1.03, adr: 72.5, kast: 73.2, hs: 35, trend: 2 },
  { slug: 'kindlex', name: 'KindleX', team: 'ember-fox', game: 'valorant', role: 'Iniciador', rating: 2595, kd: 1.07, acs: 226, hs: 18, trend: 1 },
  { slug: 'ashwing', name: 'AshWing', team: 'ember-fox', game: 'valorant', role: 'Controlador', rating: 2548, kd: 1.02, acs: 219, hs: 20, trend: 2 },
  { slug: 'pyrelight', name: 'PyreLight', team: 'ember-fox', game: 'valorant', role: 'Centinela', rating: 2512, kd: 0.99, acs: 211, hs: 23, trend: -1 },
  { slug: 'cinderfox', name: 'CinderFox', team: 'ember-fox', game: 'valorant', role: 'Flex', rating: 2495, kd: 0.95, acs: 204, hs: 16, trend: 0 },
  { slug: 'ironveil', name: 'IronVeil', team: 'apex-falcon', game: 'lol', role: 'Mid', rating: 2621, kda: 5.2, csmin: 9.2, dpm: 586, trend: 2 },
  { slug: 'skyquill', name: 'SkyQuill', team: 'apex-falcon', game: 'lol', role: 'Jungle', rating: 2554, kda: 4.3, csmin: 5.9, dpm: 362, trend: 1 },
  { slug: 'stormcrest', name: 'StormCrest', team: 'apex-falcon', game: 'lol', role: 'Top', rating: 2517, kda: 4.0, csmin: 8.5, dpm: 489, trend: -1 },
  { slug: 'duskrune', name: 'DuskRune', team: 'apex-falcon', game: 'lol', role: 'Support', rating: 2462, kda: 4.5, csmin: 1.1, dpm: 198, trend: 0 },
  { slug: 'nightcode', name: 'NightCode', team: 'cipher-9', game: 'lol', role: 'Mid', rating: 2601, kda: 5.0, csmin: 9.0, dpm: 561, trend: 3 },
  { slug: 'voidstep', name: 'VoidStep', team: 'cipher-9', game: 'lol', role: 'Jungle', rating: 2533, kda: 4.1, csmin: 5.7, dpm: 349, trend: -2 },
  { slug: 'prismblade', name: 'PrismBlade', team: 'cipher-9', game: 'lol', role: 'ADC', rating: 2572, kda: 5.5, csmin: 9.7, dpm: 604, trend: 1 },
  { slug: 'wardensigil', name: 'WardenSigil', team: 'cipher-9', game: 'lol', role: 'Support', rating: 2450, kda: 4.4, csmin: 1.0, dpm: 194, trend: 0 },
];

const TOURNAMENTS = [
  {
    slug: 'vants-pro-circuit-temporada-3', name: 'VANTS Pro Circuit — Temporada 3', game: 'valorant',
    region: 'latam', format: 'Grupos + Playoffs', status: 'live', prize: '$25,000 USD',
    dates: '12 sep — 18 oct 2026', participants: 12, hue: 260,
    description: 'El circuito profesional insignia de VANTS. Doce equipos de la región LATAM disputan la fase de grupos y un playoff de doble eliminación por el título de temporada.',
  },
  {
    slug: 'challenger-series-cs2', name: 'VANTS Challenger Series — CS2', game: 'cs2',
    region: 'eu', format: 'Suizo + Eliminación directa', status: 'live', prize: '$10,000 USD',
    dates: '20 sep — 11 oct 2026', participants: 16, hue: 30,
    description: 'Formato suizo de cinco rondas seguido de playoffs a eliminación directa. La puerta de entrada al circuito profesional europeo de VANTS.',
  },
  {
    slug: 'summer-cup-lol', name: 'VANTS Summer Cup — LoL', game: 'lol',
    region: 'eu', format: 'Round robin + Final BO5', status: 'completed', prize: '$8,000 USD',
    dates: '8 — 24 ago 2026', participants: 8, hue: 210,
    description: 'La copa de verano de League of Legends cerró su tercera edición con una final a cinco mapas que se decidió en el minuto 42 del último juego.',
  },
  {
    slug: 'open-qualifier-latam', name: 'Clasificatorio Abierto LATAM', game: 'valorant',
    region: 'latam', format: 'Eliminación directa (BO1/BO3)', status: 'upcoming', prize: '2 plazas al Pro Circuit',
    dates: '4 — 6 oct 2026', participants: 64, hue: 340,
    description: 'Torneo abierto de inscripción gratuita. Sesenta y cuatro equipos, doble llave de eliminación directa y dos plazas directas a la Temporada 4 del Pro Circuit.',
    registration: 'open',
  },
  {
    slug: 'winter-clash-apac', name: 'VANTS Winter Clash — APAC', game: 'cs2',
    region: 'apac', format: 'Fase de grupos + Playoffs', status: 'upcoming', prize: '$12,000 USD',
    dates: '15 — 22 nov 2026', participants: 10, hue: 190,
    description: 'El evento de cierre de temporada para la región Asia-Pacífico. Grupos de round robin y playoffs en escenario presencial.',
  },
  {
    slug: 'community-showdown-br', name: 'Community Showdown — Brasil', game: 'valorant',
    region: 'br', format: 'Showmatch + All-Star', status: 'upcoming', prize: 'Premios de comunidad',
    dates: '30 nov 2026', participants: 8, hue: 100,
    description: 'Exhibición de cierre de año votada por la comunidad: jugadores estrella, modos alternativos y el clásico 1v1 por el título de rey del offseason.',
  },
];

// Partidos (serie). Estados: live | upcoming | completed
// Fechas relativas a "hoy" en días (offset) para que el calendario siempre luzca vigente.
const MATCHES = [
  // --- En vivo ---
  { id: 'm-live-1', tournament: 'vants-pro-circuit-temporada-3', game: 'valorant', stage: 'Playoffs · Semifinal', bestOf: 3, status: 'live', dayOffset: 0, time: '17:30', elapsed: '42 min', teamA: 'nova-strike', teamB: 'aurora-blaze', scoreA: 1, scoreB: 1, currentMap: 'Haven · Ronda 18', maps: [
    { name: 'Ascent', scoreA: 13, scoreB: 9, winner: 'A' },
    { name: 'Bind', scoreA: 10, scoreB: 13, winner: 'B' },
    { name: 'Haven', scoreA: 9, scoreB: 10, winner: null },
  ]},
  { id: 'm-live-2', tournament: 'challenger-series-cs2', game: 'cs2', stage: 'Ronda suiza 4', bestOf: 3, status: 'live', dayOffset: 0, time: '12:00', elapsed: '1 h 05 min', teamA: 'iron-wolves', teamB: 'night-vector', scoreA: 0, scoreB: 1, currentMap: 'Mirage · Ronda 14', maps: [
    { name: 'Ancient', scoreA: 11, scoreB: 13, winner: 'B' },
    { name: 'Mirage', scoreA: 7, scoreB: 7, winner: null },
    { name: 'Nuke', scoreA: null, scoreB: null, winner: null },
  ]},
  // --- Próximos ---
  { id: 'm-up-1', tournament: 'challenger-series-cs2', game: 'cs2', stage: 'Ronda suiza 5', bestOf: 3, status: 'upcoming', dayOffset: 0, time: '20:00', teamA: 'iron-wolves', teamB: 'tide-breaker', scoreA: null, scoreB: null },
  { id: 'm-up-2', tournament: 'vants-pro-circuit-temporada-3', game: 'valorant', stage: 'Playoffs · Final', bestOf: 5, status: 'upcoming', dayOffset: 3, time: '18:00', teamA: null, teamB: null, teamAName: 'Ganador SF1', teamBName: 'Ganador SF2', scoreA: null, scoreB: null },
  { id: 'm-up-3', tournament: 'open-qualifier-latam', game: 'valorant', stage: 'Ronda 1 · BO1', bestOf: 1, status: 'upcoming', dayOffset: 7, time: '16:00', teamA: 'nova-strike', teamB: 'ember-fox', scoreA: null, scoreB: null },
  { id: 'm-up-4', tournament: 'challenger-series-cs2', game: 'cs2', stage: 'Cuartos de final', bestOf: 3, status: 'upcoming', dayOffset: 5, time: '19:00', teamA: 'polar-signal', teamB: 'night-vector', scoreA: null, scoreB: null },
  { id: 'm-up-5', tournament: 'winter-clash-apac', game: 'cs2', stage: 'Fase de grupos', bestOf: 1, status: 'upcoming', dayOffset: 49, time: '11:00', teamA: 'polar-signal', teamB: 'tide-breaker', scoreA: null, scoreB: null },
  { id: 'm-up-6', tournament: 'vants-pro-circuit-temporada-3', game: 'valorant', stage: 'Playoffs · Semifinal', bestOf: 3, status: 'upcoming', dayOffset: 1, time: '17:00', teamA: 'zenith-pulse', teamB: 'aurora-blaze', scoreA: null, scoreB: null },
  // --- Finalizados ---
  { id: 'm-done-1', tournament: 'summer-cup-lol', game: 'lol', stage: 'Final · BO5', bestOf: 5, status: 'completed', dayOffset: -34, time: '16:00', teamA: 'eclipse-core', teamB: 'vortex-atlas', scoreA: 3, scoreB: 2, mvp: 'Lunaris', maps: [
    { name: 'Juego 1', scoreA: 1, scoreB: 0, winner: 'A' },
    { name: 'Juego 2', scoreA: 1, scoreB: 0, winner: 'A' },
    { name: 'Juego 3', scoreA: 0, scoreB: 1, winner: 'B' },
    { name: 'Juego 4', scoreA: 0, scoreB: 1, winner: 'B' },
    { name: 'Juego 5', scoreA: 1, scoreB: 0, winner: 'A' },
  ]},
  { id: 'm-done-2', tournament: 'vants-pro-circuit-temporada-3', game: 'valorant', stage: 'Grupos · Jornada 5', bestOf: 3, status: 'completed', dayOffset: -2, time: '19:00', teamA: 'nova-strike', teamB: 'zenith-pulse', scoreA: 2, scoreB: 0, mvp: 'Kryoz', maps: [
    { name: 'Lotus', scoreA: 13, scoreB: 5, winner: 'A' },
    { name: 'Split', scoreA: 13, scoreB: 11, winner: 'A' },
  ]},
  { id: 'm-done-3', tournament: 'challenger-series-cs2', game: 'cs2', stage: 'Ronda suiza 3', bestOf: 3, status: 'completed', dayOffset: -3, time: '15:30', teamA: 'night-vector', teamB: 'polar-signal', scoreA: 2, scoreB: 1, mvp: 'NightOwlz', maps: [
    { name: 'Anubis', scoreA: 13, scoreB: 8, winner: 'A' },
    { name: 'Inferno', scoreA: 9, scoreB: 13, winner: 'B' },
    { name: 'Overpass', scoreA: 13, scoreB: 10, winner: 'A' },
  ]},
  { id: 'm-done-4', tournament: 'vants-pro-circuit-temporada-3', game: 'valorant', stage: 'Grupos · Jornada 4', bestOf: 3, status: 'completed', dayOffset: -5, time: '18:00', teamA: 'aurora-blaze', teamB: 'ember-fox', scoreA: 2, scoreB: 1, mvp: 'QuasarBit', maps: [
    { name: 'Icebox', scoreA: 13, scoreB: 7, winner: 'A' },
    { name: 'Sunset', scoreA: 8, scoreB: 13, winner: 'B' },
    { name: 'Ascent', scoreA: 13, scoreB: 9, winner: 'A' },
  ]},
  { id: 'm-done-5', tournament: 'challenger-series-cs2', game: 'cs2', stage: 'Ronda suiza 2', bestOf: 3, status: 'completed', dayOffset: -6, time: '13:00', teamA: 'iron-wolves', teamB: 'tide-breaker', scoreA: 2, scoreB: 0, mvp: 'Frozent', maps: [
    { name: 'Mirage', scoreA: 13, scoreB: 6, winner: 'A' },
    { name: 'Dust II', scoreA: 13, scoreB: 11, winner: 'A' },
  ]},
  { id: 'm-done-6', tournament: 'summer-cup-lol', game: 'lol', stage: 'Semifinal', bestOf: 5, status: 'completed', dayOffset: -38, time: '17:00', teamA: 'eclipse-core', teamB: 'cipher-9', scoreA: 3, scoreB: 1, mvp: 'SeraphLun', maps: [
    { name: 'Juego 1', scoreA: 1, scoreB: 0, winner: 'A' },
    { name: 'Juego 2', scoreA: 0, scoreB: 1, winner: 'B' },
    { name: 'Juego 3', scoreA: 1, scoreB: 0, winner: 'A' },
    { name: 'Juego 4', scoreA: 1, scoreB: 0, winner: 'A' },
  ]},
];

// Clasificación del Pro Circuit (grupo único, demo)
const STANDINGS = {
  'vants-pro-circuit-temporada-3': [
    { team: 'nova-strike', played: 10, wins: 8, losses: 2, mapsFor: 21, mapsAgainst: 9, points: 24 },
    { team: 'aurora-blaze', played: 10, wins: 7, losses: 3, mapsFor: 19, mapsAgainst: 11, points: 21 },
    { team: 'zenith-pulse', played: 10, wins: 6, losses: 4, mapsFor: 16, mapsAgainst: 14, points: 18 },
    { team: 'ember-fox', played: 10, wins: 4, losses: 6, mapsFor: 12, mapsAgainst: 18, points: 12 },
    { team: 'apex-falcon', played: 10, wins: 3, losses: 7, mapsFor: 10, mapsAgainst: 20, points: 9 },
    { team: 'cipher-9', played: 10, wins: 2, losses: 8, mapsFor: 8, mapsAgainst: 21, points: 6 },
  ],
  'challenger-series-cs2': [
    { team: 'iron-wolves', played: 4, wins: 4, losses: 0, mapsFor: 8, mapsAgainst: 1, points: 12 },
    { team: 'night-vector', played: 4, wins: 3, losses: 1, mapsFor: 7, mapsAgainst: 3, points: 9 },
    { team: 'polar-signal', played: 4, wins: 2, losses: 2, mapsFor: 5, mapsAgainst: 5, points: 6 },
    { team: 'tide-breaker', played: 4, wins: 1, losses: 3, mapsFor: 3, mapsAgainst: 7, points: 3 },
  ],
};

// Bracket del Pro Circuit (playoffs, demo)
const BRACKETS = {
  'vants-pro-circuit-temporada-3': [
    { round: 'Semifinales', matches: [
      { id: 'm-live-1', a: 'nova-strike', b: 'aurora-blaze', scoreA: 1, scoreB: 1, status: 'live' },
      { id: 'm-up-6', a: 'zenith-pulse', b: 'ember-fox', scoreA: null, scoreB: null, status: 'upcoming' },
    ]},
    { round: 'Final', matches: [
      { id: 'm-up-2', a: null, b: null, scoreA: null, scoreB: null, status: 'upcoming', labelA: 'Ganador SF1', labelB: 'Ganador SF2' },
    ]},
  ],
};

// Rankings VANTS (rating ficticio)
const RANKINGS = {
  valorant: {
    teams: [
      { team: 'nova-strike', rating: 1932, change: 1, matches: 42, winRate: 76 },
      { team: 'zenith-pulse', rating: 1904, change: 2, matches: 38, winRate: 71 },
      { team: 'aurora-blaze', rating: 1888, change: -1, matches: 40, winRate: 68 },
      { team: 'ember-fox', rating: 1810, change: 3, matches: 36, winRate: 58 },
      { team: 'cipher-9', rating: 1766, change: 0, matches: 35, winRate: 51 },
    ],
    players: [
      { player: 'kryoz', rating: 2841, change: 2, matches: 42, winRate: 76 },
      { player: 'fenrira', rating: 2776, change: 6, matches: 38, winRate: 71 },
      { player: 'quasarbit', rating: 2592, change: 2, matches: 40, winRate: 68 },
      { player: 'solarflare', rating: 2665, change: -2, matches: 36, winRate: 58 },
      { player: 'ravenlord', rating: 2534, change: 3, matches: 42, winRate: 76 },
    ],
  },
  cs2: {
    teams: [
      { team: 'iron-wolves', rating: 1951, change: 2, matches: 44, winRate: 79 },
      { team: 'night-vector', rating: 1907, change: 0, matches: 41, winRate: 66 },
      { team: 'polar-signal', rating: 1833, change: 1, matches: 39, winRate: 62 },
      { team: 'tide-breaker', rating: 1770, change: -2, matches: 40, winRate: 55 },
    ],
    players: [
      { player: 'frozent', rating: 2866, change: 1, matches: 44, winRate: 79 },
      { player: 'blazko', rating: 2798, change: 4, matches: 44, winRate: 79 },
      { player: 'nightowlz', rating: 2701, change: 1, matches: 41, winRate: 66 },
      { player: 'voltar', rating: 2610, change: -2, matches: 44, winRate: 79 },
      { player: 'tidalsurge', rating: 2601, change: 3, matches: 40, winRate: 55 },
    ],
  },
  lol: {
    teams: [
      { team: 'eclipse-core', rating: 1968, change: 3, matches: 36, winRate: 83 },
      { team: 'vortex-atlas', rating: 1902, change: 0, matches: 36, winRate: 69 },
      { team: 'apex-falcon', rating: 1855, change: -1, matches: 34, winRate: 64 },
      { team: 'cipher-9', rating: 1788, change: 1, matches: 33, winRate: 57 },
    ],
    players: [
      { player: 'seraphlun', rating: 2905, change: 5, matches: 36, winRate: 83 },
      { player: 'lunaris', rating: 2812, change: 2, matches: 36, winRate: 83 },
      { player: 'acehigh', rating: 2733, change: 4, matches: 34, winRate: 64 },
      { player: 'thornweaver', rating: 2740, change: 1, matches: 36, winRate: 83 },
      { player: 'vexil', rating: 2699, change: 3, matches: 36, winRate: 69 },
    ],
  },
};

// Noticias ficticias
const NEWS = [
  {
    slug: 'nova-strike-clasifica-final-pro-circuit', title: 'Nova Strike asegura su plaza en la final del Pro Circuit',
    excerpt: 'El conjunto venezolano selló su pase tras una serie a tres mapas llena de remontadas. Kryoz firmó un 1.31 de K/D en el cierre.',
    game: 'valorant', tournament: 'vants-pro-circuit-temporada-3', date: 'Hace 2 horas', author: 'Redacción VANTS', hue: 260,
    body: [
      'Nova Strike volvió a demostrar por qué es el equipo a batir de la Temporada 3 del VANTS Pro Circuit. En una semifinal que se extendió por más de dos horas, el conjunto caraqueño superó a Aurora Blaze y dejó la serie 2-1 para acceder a la gran final del próximo domingo.',
      'El primer mapa, Ascent, fue un paseo para los locales: una defensa casi perfecta cerró el 13-9 con Kryoz imparable en la entrada a bombsite B. En Bind, sin embargo, Aurora Blaze corrigió su economía y forzó el tercero con un quiebre rotacional que dejó a Nova Strike sin respuestas.',
      'La decisión en Haven llegó hasta la ronda 18, con ambos equipos alternando el control del marcador. Un clutch 1v2 de Mortal1n en la ronda 16 cambió el impulso definitivamente, y el cierre llegó con una ejecución limpia sobre el sitio C.',
      'La final se disputará al mejor de cinco mapas. El rival saldrá del cruce entre Zenith Pulse y Ember Fox, que se disputa este lunes. Desde la organización de VANTS confirman que la transmisión oficial contará con narración en español y portugués.',
    ],
  },
  {
    slug: 'iron-wolves-perfecto-suizo', title: 'Iron Wolves firma un suizo perfecto en la Challenger Series',
    excerpt: 'Cuatro victorias en cuatro rondas. El plantel europeo llega invicto a los playoffs del torneo de CS2 con Frozent liderando el rating individual.',
    game: 'cs2', tournament: 'challenger-series-cs2', date: 'Ayer', author: 'Redacción VANTS', hue: 30,
    body: [
      'Iron Wolves completó la fase suiza de la VANTS Challenger Series con récord perfecto: cuatro series ganadas y un único mapa cedido en doce disputados.',
      'La clave del equipo ha estado en su estructura defensiva. Con Frozent en el AWP y un Karv que aporta utilidad quirúrgica, el conjunto europeo limita a sus rivales a menos de 70 de ADR promedio por jugador.',
      'El entrenador del equipo declaró tras la clasificación que el objetivo no es solo el título, sino "consolidar un sistema de juego que nos sirva para todo el año". Los playoffs arrancan el próximo jueves con cuartos de final al mejor de tres.',
    ],
  },
  {
    slug: 'seraphlun-mvp-summer-cup', title: 'SeraphLun, MVP de la Summer Cup: "El trabajo en scrims nos dio el título"',
    excerpt: 'El midlaner de Eclipse Core promedió 6.8 de K/D/A en la final ante Vortex Atlas y recogió el galardón individual del torneo de LoL.',
    game: 'lol', tournament: 'summer-cup-lol', date: '24 ago 2026', author: 'Redacción VANTS', hue: 210,
    body: [
      'Eclipse Core levantó la VANTS Summer Cup tras una final a cinco juegos que ya se considera un clásico instantáneo. SeraphLun, con 6.8 de K/D/A y 612 de daño por minuto, fue elegido MVP del torneo.',
      'La serie ante Vortex Atlas se decidió en el minuto 42 del quinto juego, con una robada de Barón que Lunaris convirtió en el empujón final. El bot lane de Eclipse Core firmó el mejor rendimiento de la final con 689 de DPM.',
      'Con este título, Eclipse Core encabeza el ranking europeo de League of Legends con 1968 puntos VANTS, la mayor cifra registrada por un equipo en la región desde el lanzamiento de la plataforma.',
    ],
  },
  {
    slug: 'clasificatorio-abierto-latam-inscripcion', title: 'Abierta la inscripción al Clasificativo Abierto LATAM de VALORANT',
    excerpt: '64 plazas, inscripción gratuita y dos lugares directos para la Temporada 4 del Pro Circuit. Los equipos pueden registrarse desde su perfil VANTS.',
    game: 'valorant', tournament: 'open-qualifier-latam', date: 'Hace 3 días', author: 'Comunidad VANTS', hue: 340,
    body: [
      'La Temporada 4 del VANTS Pro Circuit comienza con las puertas abiertas. El Clasificativo Abierto LATAN reunirá a 64 equipos en una llave de eliminación directa que se disputará del 4 al 6 de octubre.',
      'La inscripción es gratuita y se realiza desde el perfil de equipo en VANTS: solo el capitán necesita confirmar el roster de cinco jugadores antes del cierre de registro. Las plazas se asignan por orden de inscripción confirmada.',
      'Los dos finalistas obtienen su pase directo a la fase de grupos de la Temporada 4, con viaje y hospedaje cubiertos para la fase presencial. Desde VANTS recordamos que todos los participantes deben aceptar el código de conducta y verificar su cuenta antes de jugar.',
    ],
  },
  {
    slug: 'vants-anuncia-winter-clash', title: 'VANTS anuncia el Winter Clash APAC con final presencial',
    excerpt: 'El torneo de cierre de temporada para Asia-Pacífico se jugará del 15 al 22 de noviembre con $12,000 en premios y gran final en escenario.',
    game: 'cs2', tournament: 'winter-clash-apac', date: 'Hace 1 semana', author: 'Redacción VANTS', hue: 190,
    body: [
      'VANTS confirma su primer evento presencial en Asia-Pacífico. El Winter Clash reunirá a diez equipos de la región en un formato de grupos y playoffs, con la gran final el 22 de noviembre en escenario.',
      'La bolsa total de premios es de $12,000 USD, repartida entre los cuatro primeros puestos. Los equipos invitados se anunciarán por fases según el ranking regional VANTS del mes de octubre.',
      'Las entradas para la final presencial estarán disponibles próximamente a través de la plataforma, con descuento para usuarios con cuenta verificada.',
    ],
  },
  {
    slug: 'como-funciona-rating-vants', title: 'Cómo funciona el rating VANTS: la métrica que ordena el competitive',
    excerpt: 'Explicamos la base del sistema de puntuación propio de VANTS: por juego, por temporada y con protección contra smurfing.',
    game: null, tournament: null, date: 'Hace 2 semanas', author: 'Producto VANTS', hue: 100,
    body: [
      'El rating VANTS es la métrica oficial de la plataforma para ordenar jugadores y equipos. Cada juego tiene su propia escala: el rating de VALORANT nunca se mezcla con el de CS2 o League of Legends.',
      'El sistema parte de una base de 1200 puntos y ajusta el valor tras cada serie oficial registrada en la plataforma. El peso de cada resultado depende del formato: una final al mejor de cinco vale más que un BO1 de grupo.',
      'Para evitar cuentas alternativas, el rating se vincula a la identidad verificada del jugador, no al nickname. Los equipos también tienen rating propio, calculado sobre su historial de series en torneos VANTS.',
      'Puedes consultar tu rating actual y su evolución desde tu perfil, y compararlo con los rankings regionales en la sección de Rankings.',
    ],
  },
];

// Utilidades de datos
function teamById(id) { return TEAMS.find(t => t.id === id || t.slug === id); }
function playerBySlug(slug) { return PLAYERS.find(p => p.slug === slug); }
function tournamentBySlug(slug) { return TOURNAMENTS.find(t => t.slug === slug); }
function matchById(id) { return MATCHES.find(m => m.id === id); }

function matchTeams(m) {
  const a = m.teamA ? teamById(m.teamA) : null;
  const b = m.teamB ? teamById(m.teamB) : null;
  return {
    aName: a ? a.name : (m.teamAName || 'Por definir'),
    bName: b ? b.name : (m.teamBName || 'Por definir'),
    aTag: a ? a.tag : '—',
    bTag: b ? b.tag : '—',
    aCrest: a ? a.crest : '#3a3f4a',
    bCrest: b ? b.crest : '#3a3f4a',
    aSlug: a ? a.slug : null,
    bSlug: b ? b.slug : null,
  };
}

function dayLabel(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const fmt = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const today = offset === 0 ? 'Hoy · ' : (offset === 1 ? 'Mañana · ' : (offset === -1 ? 'Ayer · ' : ''));
  return today + fmt.format(d);
}

function dateLabel(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(d);
}
