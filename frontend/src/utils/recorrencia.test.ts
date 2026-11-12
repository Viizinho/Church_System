import { describe, expect, it } from 'vitest'
import { descreverRecorrencia } from './recorrencia'

describe('descreverRecorrencia — texto mostrado na lista de eventos', () => {
  it.each([
    ['evento único', 'NENHUMA', null, undefined, 'Evento único'],
    ['todo domingo', 'SEMANAL', { diasSemana: [0] }, undefined, 'Todo domingo'],
    ['terça e quinta', 'SEMANAL', { diasSemana: [4, 2] }, undefined, 'Toda semana (terça e quinta)'],
    ['quinzenal', 'SEMANAL', { diasSemana: [1], intervalo: 2 }, undefined, 'A cada 2 semanas (segunda)'],
    ['mensal no dia', 'MENSAL', {}, 12, 'Todo mês, no dia 12'],
    ['1ª terça do mês', 'MENSAL', { mensalPor: 'DIA_DA_SEMANA', semanaDoMes: 1, diaSemanaMes: 2 }, undefined, 'Toda primeira terça-feira do mês'],
    ['último sábado do mês', 'MENSAL', { mensalPor: 'DIA_DA_SEMANA', semanaDoMes: -1, diaSemanaMes: 6 }, undefined, 'Todo último sábado do mês'],
    ['a cada 15 dias', 'PERSONALIZADA', { unidade: 'DIAS', intervalo: 15 }, undefined, 'A cada 15 dias'],
  ] as const)('%s', (_, tipo, regra, dia, esperado) => {
    expect(descreverRecorrencia(tipo as any, regra as any, dia)).toBe(esperado)
  })

  it('mostra a data final quando a série termina numa data', () => {
    expect(descreverRecorrencia('SEMANAL', { diasSemana: [0], criterioParada: { tipo: 'DATA', valor: '2026-12-20' } } as any)).toBe('Todo domingo · até 20/12/2026')
  })
})
