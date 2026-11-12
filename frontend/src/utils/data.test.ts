import { describe, expect, it } from 'vitest'
import { formatarData, formatarDiaMes, formatarMoeda, paraInputData } from './data'

describe('datas vindas do banco (DATE)', () => {
  it('não mostram o dia anterior em UTC-3', () => {
    expect(formatarData('2026-10-29T00:00:00.000Z')).toBe('29/10/2026')
    expect(formatarDiaMes('1990-01-01T00:00:00.000Z')).toBe('01/01')
  })
  it('vazio vira travessão', () => {
    expect(formatarData(null)).toBe('—')
    expect(formatarDiaMes(undefined)).toBe('—')
  })
  it('formato do <input type="date">', () => expect(paraInputData('2026-10-29T00:00:00.000Z')).toBe('2026-10-29'))
})

describe('formatarMoeda', () => {
  it('formata em reais', () => {
    expect(formatarMoeda(1650).replace(/\s/g, ' ')).toBe('R$ 1.650,00')
    expect(formatarMoeda('10.5').replace(/\s/g, ' ')).toBe('R$ 10,50')
    expect(formatarMoeda(null).replace(/\s/g, ' ')).toBe('R$ 0,00')
  })
})
