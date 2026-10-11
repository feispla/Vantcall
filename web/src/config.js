// Configuracion publica. Un client id de SPA es publico por diseno: no hay secretos aqui.
export const AUTH0_DOMAIN = 'vants.eu.auth0.com'
export const AUTH0_CLIENT_ID = 'oaOmNizh7HrASWfmfM29bN284IMJvqPG'
export const AUTH0_AUDIENCE = 'https://api.vants.app'

// Neon Data API (PostgREST): exige siempre un JWT de Auth0.
export const NEON_DATA_API =
  'https://ep-autumn-scene-b4opu2ip.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1'

// Neon Function "vantsdata": lecturas publicas sin sesion.
export const PUBLIC_PROXY =
  'https://br-sweet-shape-b42xhogj-vantsdata.compute.c-6.us-east-2.aws.neon.tech/'

// Modo de pruebas e2e (vite --mode e2e): sesion simulada, sin red.
export const IS_E2E = import.meta.env.MODE === 'e2e'
