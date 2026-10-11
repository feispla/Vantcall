import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildParams, fetchRows, setTokenGetter } from './db.js'

afterEach(() => {
  vi.restoreAllMocks()
  setTokenGetter(async () => null)
})

describe('buildParams', () => {
  it('serializa select, filtros, orden y limite', () => {
    const p = buildParams({
      select: 'id,name',
      filters: { status: 'eq.open', game: 'in.(a,b)' },
      order: 'mmr.desc',
      limit: 5,
    })
    expect(p.get('select')).toBe('id,name')
    expect(p.get('status')).toBe('eq.open')
    expect(p.get('game')).toBe('in.(a,b)')
    expect(p.get('order')).toBe('mmr.desc')
    expect(p.get('limit')).toBe('5')
  })
})

describe('fetchRows', () => {
  it('sin sesion usa el proxy publico', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ id: 1 }]), { status: 200 }),
    )
    const rows = await fetchRows('players', { limit: 1 })
    expect(rows).toEqual([{ id: 1 }])
    const url = String(spy.mock.calls[0][0])
    expect(url).toContain('vantsdata')
    expect(url).toContain('table=players')
  })

  it('con sesion usa la Data API con Bearer', async () => {
    setTokenGetter(async () => 'tok')
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }))
    await fetchRows('players')
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toContain('apirest')
    expect(init.headers.Authorization).toBe('Bearer tok')
  })

  it('lanza un error con status si la respuesta falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'nope' }), { status: 401 }),
    )
    await expect(fetchRows('players')).rejects.toMatchObject({ message: 'nope', status: 401 })
  })
})
