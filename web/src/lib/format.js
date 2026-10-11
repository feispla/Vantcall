/** Porcentaje de victorias con 1 decimal. Sin partidas devuelve 0. */
export function winRate(wins, losses) {
  const w = Number(wins) || 0
  const l = Number(losses) || 0
  const total = w + l
  return total === 0 ? 0 : Math.round((w / total) * 1000) / 10
}

/** Fecha corta en espanol; si no hay fecha, un guion. */
export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Nombre a mostrar de un jugador. */
export function playerName(p) {
  if (!p) return 'Jugador'
  return p.display_name || p.username || 'Jugador'
}

/** Etiqueta legible del estado de un torneo. */
export function statusLabel(status) {
  const map = {
    draft: 'Borrador',
    registration: 'Inscripción abierta',
    open: 'Abierto',
    upcoming: 'Próximamente',
    in_progress: 'En curso',
    live: 'En directo',
    closed: 'Cerrado',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
  }
  return map[status] || status || '—'
}

/** URL de perfil para una cuenta de juego vinculada. */
export function gameProfileUrl(account) {
  if (!account) return null
  if (account.profile_url) return account.profile_url
  if (account.game === 'steam') return `https://steamcommunity.com/profiles/${encodeURIComponent(account.handle)}`
  if (account.game === 'riot') return `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(account.handle)}`
  if (account.game === 'faceit') return `https://www.faceit.com/es/players/${encodeURIComponent(account.handle)}`
  return null
}
