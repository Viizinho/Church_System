import { describe, expect, it } from 'vitest'
import { diasAteAniversario, proximoAniversario } from '../../src/utils/aniversario'

const nasc = (s: string) => new Date(s + 'T00:00:00.000Z') // como o Postgres DATE chega via Prisma
const agora = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min) // hora local do servidor

describe('diasAteAniversario', () => {
  it.each([
    ['à meia-noite', 0, 0],
    ['às 10h30', 10, 30],
    ['às 23h59', 23, 59],
  ])('aniversário hoje conta 0 dias %s', (_, h, min) => {
    expect(diasAteAniversario(nasc('1990-10-30'), agora(2026, 10, 30, h, min))).toBe(0)
  })

  it('amanhã = 1 dia', () => expect(diasAteAniversario(nasc('2000-10-31'), agora(2026, 10, 30, 15))).toBe(1))
  it('ontem = 364 dias (só no ano que vem)', () => expect(diasAteAniversario(nasc('2000-10-29'), agora(2026, 10, 30, 15))).toBe(364))
  it('daqui a uma semana = 7 dias', () => expect(diasAteAniversario(nasc('2000-11-06'), agora(2026, 10, 30, 15))).toBe(7))
  it('na virada do ano (31/12 → 02/01) = 2 dias', () => expect(diasAteAniversario(nasc('1980-01-02'), agora(2026, 12, 31, 9))).toBe(2))
  it('nascido em 01/01, no dia 01/01 = 0', () => expect(diasAteAniversario(nasc('1980-01-01'), agora(2027, 1, 1, 8))).toBe(0))
  it('não é afetado por mudança de horário', () => expect(diasAteAniversario(nasc('1990-11-15'), agora(2026, 3, 1, 12))).toBe(259))
})

describe('proximoAniversario', () => {
  it('se é hoje, devolve a data de hoje', () => {
    expect(proximoAniversario(nasc('1990-10-30'), agora(2026, 10, 30, 10, 30)).toISOString()).toMatch(/^2026-10-30/)
  })
  it('se já passou, devolve a data do ano que vem', () => {
    expect(proximoAniversario(nasc('1990-10-29'), agora(2026, 10, 30, 10, 30)).toISOString()).toMatch(/^2027-10-29/)
  })
})
