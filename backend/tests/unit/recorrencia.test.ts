import { describe, expect, it } from 'vitest'
import { gerarOcorrencias } from '../../src/utils/recorrencia'

/** Data/hora em Brasília (UTC-3), para comparar com o que o usuário vê na tela. */
const brt = (d: Date) => new Date(d.getTime() - 180 * 60000).toISOString().slice(0, 16).replace('T', ' ')
// Domingo 01/11/2026 21:00 em Brasília = 00:00Z de 02/11
const domingoNoite = new Date('2026-11-02T00:00:00Z')

describe('gerarOcorrencias — eventos que se repetem', () => {
  describe('semanal', () => {
    it('repete no mesmo dia da semana, mesmo quando o horário cai no dia seguinte em UTC', () => {
      const r = gerarOcorrencias(domingoNoite, 'SEMANAL', { diasSemana: [0], criterioParada: { tipo: 'OCORRENCIAS', valor: 3 } })
      expect(r.map(brt)).toEqual(['2026-11-01 21:00', '2026-11-08 21:00', '2026-11-15 21:00'])
    })

    it('aceita vários dias na semana (terça e quinta)', () => {
      const r = gerarOcorrencias(new Date('2026-11-03T22:30:00Z'), 'SEMANAL', { diasSemana: [2, 4], criterioParada: { tipo: 'OCORRENCIAS', valor: 4 } })
      expect(r.map(brt)).toEqual(['2026-11-03 19:30', '2026-11-05 19:30', '2026-11-10 19:30', '2026-11-12 19:30'])
    })

    it('quinzenal até uma data (a data final é inclusiva)', () => {
      const r = gerarOcorrencias(new Date('2026-11-03T22:30:00Z'), 'SEMANAL', { diasSemana: [2], intervalo: 2, criterioParada: { tipo: 'DATA', valor: '2026-12-01' } })
      expect(r.map(brt)).toEqual(['2026-11-03 19:30', '2026-11-17 19:30', '2026-12-01 19:30'])
    })

    it('a primeira ocorrência é o primeiro dia que bate com a regra (qua → sex)', () => {
      const r = gerarOcorrencias(new Date('2026-11-04T22:30:00Z'), 'SEMANAL', { diasSemana: [2, 5], criterioParada: { tipo: 'OCORRENCIAS', valor: 2 } })
      expect(r.map(brt)).toEqual(['2026-11-06 19:30', '2026-11-10 19:30'])
    })

    it('limita a série a 200 ocorrências', () => {
      const r = gerarOcorrencias(domingoNoite, 'SEMANAL', { diasSemana: [0], criterioParada: { tipo: 'OCORRENCIAS', valor: 9999 } })
      expect(r).toHaveLength(200)
    })
  })

  describe('mensal', () => {
    it('dia 31 cai no último dia dos meses mais curtos', () => {
      const r = gerarOcorrencias(new Date('2026-01-31T15:00:00Z'), 'MENSAL', { criterioParada: { tipo: 'OCORRENCIAS', valor: 4 } })
      expect(r.map(brt)).toEqual(['2026-01-31 12:00', '2026-02-28 12:00', '2026-03-31 12:00', '2026-04-30 12:00'])
    })

    it('bimestral', () => {
      const r = gerarOcorrencias(new Date('2026-11-12T21:30:00Z'), 'MENSAL', { intervalo: 2, criterioParada: { tipo: 'DATA', valor: '2027-03-12' } })
      expect(r.map(brt)).toEqual(['2026-11-12 18:30', '2027-01-12 18:30', '2027-03-12 18:30'])
    })

    it('1ª terça-feira do mês', () => {
      const r = gerarOcorrencias(new Date('2026-11-03T22:30:00Z'), 'MENSAL', { mensalPor: 'DIA_DA_SEMANA', semanaDoMes: 1, diaSemanaMes: 2, criterioParada: { tipo: 'OCORRENCIAS', valor: 3 } })
      expect(r.map(brt)).toEqual(['2026-11-03 19:30', '2026-12-01 19:30', '2027-01-05 19:30'])
    })

    it('1º domingo: se o de novembro já passou, começa em dezembro', () => {
      const r = gerarOcorrencias(new Date('2026-11-08T21:00:00Z'), 'MENSAL', { mensalPor: 'DIA_DA_SEMANA', semanaDoMes: 1, diaSemanaMes: 0, criterioParada: { tipo: 'OCORRENCIAS', valor: 3 } })
      expect(r.map(brt)).toEqual(['2026-12-06 18:00', '2027-01-03 18:00', '2027-02-07 18:00'])
    })

    it('última sexta-feira do mês', () => {
      const r = gerarOcorrencias(new Date('2026-11-01T21:00:00Z'), 'MENSAL', { mensalPor: 'DIA_DA_SEMANA', semanaDoMes: -1, diaSemanaMes: 5, criterioParada: { tipo: 'DATA', valor: '2027-01-31' } })
      expect(r.map(brt)).toEqual(['2026-11-27 18:00', '2026-12-25 18:00', '2027-01-29 18:00'])
    })
  })

  describe('diária', () => {
    it('a cada 10 dias', () => {
      const r = gerarOcorrencias(new Date('2026-11-01T21:00:00Z'), 'DIARIA', { intervalo: 10, criterioParada: { tipo: 'OCORRENCIAS', valor: 3 } })
      expect(r.map(brt)).toEqual(['2026-11-01 18:00', '2026-11-11 18:00', '2026-11-21 18:00'])
    })

    it('todo dia até uma data', () => {
      const r = gerarOcorrencias(new Date('2026-11-01T21:00:00Z'), 'DIARIA', { criterioParada: { tipo: 'DATA', valor: '2026-11-03' } })
      expect(r.map(brt)).toEqual(['2026-11-01 18:00', '2026-11-02 18:00', '2026-11-03 18:00'])
    })
  })
})
