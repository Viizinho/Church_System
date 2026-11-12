import { describe, expect, it, vi } from 'vitest'
import dayjs from 'dayjs'
import { aniversariosNoCalendario, eventosNoCalendario } from './calendario'
import type { Evento } from '@/types'

const evento = (over: Partial<Evento>): Evento => ({ id: 'e1', nome: 'Culto', tipo: 'CULTO', inicio: '2026-11-15T21:00:00.000Z', recorrencia: 'NENHUMA', ...over } as Evento)

describe('eventosNoCalendario', () => {
  it('converte para o dia e a hora locais (18h em Brasília)', () => {
    const [item] = eventosNoCalendario([evento({})])
    expect(item).toMatchObject({ dia: '2026-11-15', hora: '18:00', titulo: 'Culto', cor: 'purple' })
  })
  it('cor por tipo e clique repassado', () => {
    const clique = vi.fn()
    const [item] = eventosNoCalendario([evento({ tipo: 'ESPECIAL' })], clique)
    expect(item.cor).toBe('amber')
    item.onClick!()
    expect(clique).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }))
  })
})

describe('aniversariosNoCalendario', () => {
  const membros = [
    { id: 'a', nomeCompleto: 'Ana', dataNascimento: '1990-11-05T00:00:00.000Z' },
    { id: 'b', nomeCompleto: 'Bia', dataNascimento: '2000-12-01T00:00:00.000Z' },
    { id: 'c', nomeCompleto: 'Sem data', dataNascimento: null },
    { id: 'd', nomeCompleto: 'Bissexto', dataNascimento: '2000-02-29T00:00:00.000Z' },
  ]

  it('mostra só quem faz aniversário no mês exibido, com a idade', () => {
    const itens = aniversariosNoCalendario(membros, dayjs('2026-11-01'))
    expect(itens).toHaveLength(1)
    expect(itens[0]).toMatchObject({ dia: '2026-11-05', titulo: 'Ana', detalhe: 'Aniversário · 36 anos', cor: 'pink' })
  })

  it('não desloca o dia por causa do fuso (05/11 continua 05/11)', () => {
    expect(aniversariosNoCalendario(membros, dayjs('2026-11-01'))[0].dia).toBe('2026-11-05')
  })

  it('quem nasceu em 29/02 aparece em 28/02 nos anos não bissextos', () => {
    expect(aniversariosNoCalendario(membros, dayjs('2027-02-01'))[0].dia).toBe('2027-02-28')
    expect(aniversariosNoCalendario(membros, dayjs('2028-02-01'))[0].dia).toBe('2028-02-29')
  })
})
