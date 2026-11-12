import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calcularProximaManutencao, calcularStatus } from '../../src/utils/manutencao'

describe('calcularProximaManutencao', () => {
  it('soma a periodicidade à data da última manutenção', () => {
    const r = calcularProximaManutencao(new Date(2026, 0, 31), 30)
    expect([r.getFullYear(), r.getMonth(), r.getDate()]).toEqual([2026, 2, 2]) // 31/01 + 30 dias = 02/03
  })
  it('não altera a data recebida', () => {
    const ultima = new Date(2026, 5, 1)
    calcularProximaManutencao(ultima, 90)
    expect(ultima.getMonth()).toBe(5)
  })
})

describe('calcularStatus (derivado na hora, nunca gravado)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 12, 15, 0)) }) // 12/11/2026 15h
  afterEach(() => vi.useRealTimers())

  const dia = (d: number, m = 11) => new Date(2026, m - 1, d)

  it('sem manutenção registrada → SEM_REGISTRO', () => expect(calcularStatus(null)).toBe('SEM_REGISTRO'))
  it('data já passou → VENCIDO', () => expect(calcularStatus(dia(11))).toBe('VENCIDO'))
  it('vence hoje → PROXIMO (ainda não venceu)', () => expect(calcularStatus(dia(12))).toBe('PROXIMO'))
  it('faltam exatamente 30 dias → PROXIMO (limite do aviso)', () => expect(calcularStatus(dia(12, 12))).toBe('PROXIMO'))
  it('faltam 31 dias → EM_DIA', () => expect(calcularStatus(dia(13, 12))).toBe('EM_DIA'))
})
