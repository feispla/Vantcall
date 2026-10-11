import { describe, expect, it } from 'vitest'
import { formatDate, gameProfileUrl, playerName, statusLabel, winRate } from './format.js'

describe('winRate', () => {
  it('calcula el porcentaje con un decimal', () => {
    expect(winRate(7, 3)).toBe(70)
    expect(winRate(1, 2)).toBe(33.3)
  })
  it('sin partidas devuelve 0', () => {
    expect(winRate(0, 0)).toBe(0)
    expect(winRate(undefined, null)).toBe(0)
  })
})

describe('playerName', () => {
  it('prefiere display_name y cae a username', () => {
    expect(playerName({ display_name: 'Feis', username: 'feis1' })).toBe('Feis')
    expect(playerName({ username: 'feis1' })).toBe('feis1')
    expect(playerName(null)).toBe('Jugador')
  })
})

describe('formatDate', () => {
  it('devuelve guion con fecha vacia o invalida', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate('no-es-fecha')).toBe('—')
  })
  it('formatea una fecha valida', () => {
    expect(formatDate('2026-10-06T12:00:00Z')).toMatch(/2026/)
  })
})

describe('statusLabel', () => {
  it('traduce estados conocidos y conserva los desconocidos', () => {
    expect(statusLabel('registration')).toBe('Inscripción abierta')
    expect(statusLabel('raro')).toBe('raro')
    expect(statusLabel(undefined)).toBe('—')
  })
})

describe('gameProfileUrl', () => {
  it('usa profile_url si existe', () => {
    expect(gameProfileUrl({ game: 'steam', handle: '1', profile_url: 'https://x.test/p' })).toBe('https://x.test/p')
  })
  it('construye URLs por juego y escapa el handle', () => {
    expect(gameProfileUrl({ game: 'riot', handle: 'Nombre#1234' })).toBe(
      'https://tracker.gg/valorant/profile/riot/Nombre%231234',
    )
    expect(gameProfileUrl({ game: 'steam', handle: '765' })).toBe('https://steamcommunity.com/profiles/765')
    expect(gameProfileUrl({ game: 'otro', handle: 'x' })).toBeNull()
  })
})
