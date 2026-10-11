import { reactive } from 'vue'
import {
  AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID,
  AUTH0_DOMAIN,
  IS_E2E,
} from '../config.js'
import { setTokenGetter } from './db.js'

/** Estado de sesion reactivo y compartido por toda la app. */
export const session = reactive({
  ready: false,
  loggedIn: false,
  user: null, // { sub, name, email, picture }
  error: null,
})

let client = null

export async function initAuth() {
  if (IS_E2E) {
    // Modo e2e: la sesion la decide window.__E2E_USER__ (solo existe en este modo).
    const u = window.__E2E_USER__ || null
    session.user = u
    session.loggedIn = !!u
    setTokenGetter(async () => (u ? 'e2e-token' : null))
    session.ready = true
    return
  }

  try {
    const { createAuth0Client } = await import('@auth0/auth0-spa-js')
    client = await createAuth0Client({
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: window.location.origin + window.location.pathname,
        audience: AUTH0_AUDIENCE,
        scope: 'openid profile email',
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
    })

    const q = window.location.search
    if (q.includes('code=') && q.includes('state=')) {
      await client.handleRedirectCallback()
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash)
    }

    setTokenGetter(async () => {
      try {
        return await client.getTokenSilently()
      } catch {
        return null
      }
    })

    session.loggedIn = await client.isAuthenticated()
    session.user = session.loggedIn ? await client.getUser() : null
  } catch (e) {
    session.error = e && e.message ? e.message : String(e)
  } finally {
    session.ready = true
  }
}

export function login(connection) {
  if (!client) return
  return client.loginWithRedirect({
    authorizationParams: connection ? { connection } : {},
  })
}

export function logout() {
  if (IS_E2E) {
    session.user = null
    session.loggedIn = false
    return
  }
  if (!client) return
  return client.logout({
    logoutParams: { returnTo: window.location.origin + window.location.pathname },
  })
}
