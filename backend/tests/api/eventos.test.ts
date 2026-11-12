import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { banco } from '../helpers/banco'
import { carregarApp, entrar, semearAdmin } from '../helpers/api'

/** Data/hora em Brasília (UTC-3). */
const brt = (d: Date | string) => new Date(new Date(d).getTime() - 180 * 60000).toISOString().slice(0, 16).replace('T', ' ')
// Domingo 01/11/2026 21:00 em Brasília
const base = { nome: 'EBD', tipo: 'REUNIAO', inicio: '2026-11-02T00:00:00.000Z', fusoMinutos: 180 }

let app: Express
let auth: Record<string, string>
beforeAll(async () => {
  banco.limpar()
  semearAdmin(banco)
  app = await carregarApp()
  auth = await entrar(app)
})
beforeEach(() => { banco.tabelas.evento = [] })

const eventos = () => [...banco.tabelas.evento].sort((a, b) => a.inicio - b.inicio)
const criar = (corpo: Record<string, unknown>) => request(app).post('/api/eventos').set(auth).send({ ...base, ...corpo })
const semanal = (valor: number) => ({ recorrencia: 'SEMANAL', regraRecorrencia: { diasSemana: [0], intervalo: 1, criterioParada: { tipo: 'OCORRENCIAS', valor } } })

describe('criar eventos', () => {
  it('evento semanal cria todas as ocorrências ligadas ao primeiro (pai)', async () => {
    expect((await criar(semanal(4))).status).toBe(201)
    const lista = eventos()
    expect(lista.map((e) => brt(e.inicio))).toEqual(['2026-11-01 21:00', '2026-11-08 21:00', '2026-11-15 21:00', '2026-11-22 21:00'])
    expect(lista.slice(1).every((e) => e.eventoPaiId === lista[0].id)).toBe(true)
  })

  it('a prévia calcula as datas sem gravar nada', async () => {
    const r = await request(app).post('/api/eventos/previa').set(auth).send({ ...base, recorrencia: 'MENSAL', regraRecorrencia: { intervalo: 1, criterioParada: { tipo: 'OCORRENCIAS', valor: 3 } } })
    expect(r.body.total).toBe(3)
    expect(eventos()).toHaveLength(0)
  })

  it('semanal sem nenhum dia marcado é recusado', async () => {
    const r = await criar({ recorrencia: 'SEMANAL', regraRecorrencia: { diasSemana: [], criterioParada: { tipo: 'OCORRENCIAS', valor: 3 } } })
    expect(r.status).toBe(400)
  })

  it('1ª terça do mês grava a regra e as datas certas', async () => {
    await criar({ nome: 'Ceia', tipo: 'CULTO', inicio: '2026-11-03T22:30:00.000Z', recorrencia: 'MENSAL', regraRecorrencia: { mensalPor: 'DIA_DA_SEMANA', semanaDoMes: 1, diaSemanaMes: 2, intervalo: 1, criterioParada: { tipo: 'OCORRENCIAS', valor: 3 } } })
    expect(eventos().map((e) => brt(e.inicio))).toEqual(['2026-11-03 19:30', '2026-12-01 19:30', '2027-01-05 19:30'])
    expect(eventos()[0].regraRecorrencia.mensalPor).toBe('DIA_DA_SEMANA')
  })

  it('personalizado: a cada 15 dias', async () => {
    await criar({ nome: 'Mutirão', inicio: '2026-11-03T11:00:00.000Z', recorrencia: 'PERSONALIZADA', regraRecorrencia: { unidade: 'DIAS', intervalo: 15, criterioParada: { tipo: 'OCORRENCIAS', valor: 3 } } })
    expect(eventos().map((e) => brt(e.inicio))).toEqual(['2026-11-03 08:00', '2026-11-18 08:00', '2026-12-03 08:00'])
  })
})

describe('editar e excluir eventos recorrentes', () => {
  it('editar "só este dia" muda apenas uma ocorrência', async () => {
    await criar(semanal(4))
    const terceira = eventos()[2]
    await request(app).put(`/api/eventos/${terceira.id}?escopo=ocorrencia`).set(auth).send({ ...base, nome: 'EBD especial', inicio: '2026-11-15T12:00:00.000Z', recorrencia: 'SEMANAL' })
    expect(eventos().filter((e) => e.nome === 'EBD especial')).toHaveLength(1)
  })

  it('editar "toda a série" muda local e horário de todas', async () => {
    await criar(semanal(4))
    const segunda = eventos()[1]
    await request(app).put(`/api/eventos/${segunda.id}?escopo=serie`).set(auth).send({ ...base, local: 'Salão', inicio: '2026-11-08T23:00:00.000Z', recorrencia: 'SEMANAL' })
    expect(eventos().every((e) => e.local === 'Salão')).toBe(true)
    expect(eventos().map((e) => brt(e.inicio).slice(11))).toEqual(['20:00', '20:00', '20:00', '20:00'])
  })

  it('transformar a série em evento único apaga as demais ocorrências', async () => {
    await criar(semanal(4))
    await request(app).put(`/api/eventos/${eventos()[0].id}`).set(auth).send({ ...base, recorrencia: 'NENHUMA' })
    expect(eventos()).toHaveLength(1)
    expect(eventos()[0].regraRecorrencia).toBeNull()
  })

  it('excluir só um dia ou a série inteira', async () => {
    await criar({ recorrencia: 'MENSAL', regraRecorrencia: { intervalo: 1, criterioParada: { tipo: 'OCORRENCIAS', valor: 3 } } })
    expect(eventos()).toHaveLength(3)
    await request(app).delete(`/api/eventos/${eventos()[1].id}?escopo=ocorrencia`).set(auth)
    expect(eventos()).toHaveLength(2)
    await request(app).delete(`/api/eventos/${eventos()[1].id}?escopo=serie`).set(auth)
    expect(eventos()).toHaveLength(0)
  })
})

describe('listar eventos (abas Passados / Esta semana / Futuros e calendário)', () => {
  beforeEach(async () => { await criar(semanal(5)) }) // 01, 08, 15, 22 e 29/11 às 21h

  it('por mês', async () => {
    const r = await request(app).get('/api/eventos?mes=11&ano=2026').set(auth)
    expect(r.body).toHaveLength(5)
    expect(r.body[2].serieId).toBe(eventos()[0].id)
  })

  it('por intervalo: o fim ("ate") não entra', async () => {
    const r = await request(app).get('/api/eventos').query({ de: '2026-11-08T00:00:00.000Z', ate: '2026-11-16T00:00:00.000Z' }).set(auth)
    expect(r.body.map((e: any) => brt(e.inicio))).toEqual(['2026-11-08 21:00'])
  })

  it('passados: do mais recente para o mais antigo, com limite', async () => {
    const r = await request(app).get('/api/eventos').query({ ate: '2026-11-25T00:00:00.000Z', ordem: 'desc', limite: 2 }).set(auth)
    expect(r.body.map((e: any) => brt(e.inicio))).toEqual(['2026-11-22 21:00', '2026-11-15 21:00'])
  })

  it('data inválida → 400', async () => {
    expect((await request(app).get('/api/eventos?de=data-ruim').set(auth)).status).toBe(400)
  })
})
