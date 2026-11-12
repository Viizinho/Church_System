import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { chaveMesDia, compararData, compararTexto, diasAteAniversario, ordenar } from './ordenacao'

describe('compararTexto', () => {
  it('ignora acentos e maiúsculas (ordem alfabética em português)', () => {
    expect(['Érica', 'ana', 'Álvaro', 'Bruno'].sort(compararTexto)).toEqual(['Álvaro', 'ana', 'Bruno', 'Érica'])
    expect(compararTexto('João', 'joao')).toBe(0)
  })
  it('trata nulo como texto vazio', () => expect(compararTexto(null, 'a')).toBeLessThan(0))
})

describe('compararData', () => {
  it('ordena datas ISO e manda as vazias para o fim', () => {
    const lista = ['2026-03-01', null, '2026-01-01']
    expect([...lista].sort(compararData)).toEqual(['2026-01-01', '2026-03-01', null])
  })
})

describe('ordenar', () => {
  it('devolve uma cópia ordenada sem alterar a original', () => {
    const original = [3, 1, 2]
    expect(ordenar(original, (a, b) => a - b)).toEqual([1, 2, 3])
    expect(original).toEqual([3, 1, 2])
  })
})

describe('diasAteAniversario', () => {
  const hoje = dayjs('2026-11-12')
  it('hoje = 0, amanhã = 1, ontem = 364', () => {
    expect(diasAteAniversario('1990-11-12T00:00:00.000Z', hoje)).toBe(0)
    expect(diasAteAniversario('1990-11-13T00:00:00.000Z', hoje)).toBe(1)
    expect(diasAteAniversario('1990-11-11T00:00:00.000Z', hoje)).toBe(364)
  })
  it('sem data vai para o fim', () => expect(diasAteAniversario(null, hoje)).toBe(Infinity))
})

describe('chaveMesDia', () => {
  it('usa só mês e dia, ignorando o ano', () => {
    expect(chaveMesDia('1980-03-05T00:00:00.000Z')).toBe('03-05')
    expect(chaveMesDia(null)).toBe('99-99')
  })
})
