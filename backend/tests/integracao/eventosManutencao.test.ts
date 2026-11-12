import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { criarAdmin, limparBanco, prisma } from '../helpers/bancoReal'
import { entrar } from '../helpers/api'

let app: Express
let auth: Record<string, string>
beforeAll(async () => { app = (await import('../../src/app')).default })
beforeEach(async () => {
  await limparBanco()
  await criarAdmin()
  auth = await entrar(app)
})
afterAll(() => prisma.$disconnect())

describe('eventos recorrentes no PostgreSQL', () => {
  const culto = { nome: 'Culto', tipo: 'CULTO', inicio: '2026-11-02T00:00:00.000Z', fusoMinutos: 180, recorrencia: 'SEMANAL', regraRecorrencia: { diasSemana: [0], intervalo: 1, criterioParada: { tipo: 'OCORRENCIAS', valor: 4 } } }

  it('grava a série: 1 evento pai + 3 ocorrências ligadas a ele', async () => {
    expect((await request(app).post('/api/eventos').set(auth).send(culto)).status).toBe(201)
    const todos = await prisma.evento.findMany({ orderBy: { inicio: 'asc' } })
    expect(todos).toHaveLength(4)
    expect(todos.slice(1).every((e) => e.eventoPaiId === todos[0].id)).toBe(true)
    expect(todos[0].regraRecorrencia).toMatchObject({ diasSemana: [0] })
  })

  it('consulta por intervalo, com ordem e limite', async () => {
    await request(app).post('/api/eventos').set(auth).send(culto)
    const r = await request(app).get('/api/eventos').query({ ate: '2026-12-01T00:00:00.000Z', ordem: 'desc', limite: 2 }).set(auth)
    expect(r.body.map((e: any) => e.inicio)).toEqual(['2026-11-23T00:00:00.000Z', '2026-11-16T00:00:00.000Z'])
  })

  it('excluir a série apaga todas as ocorrências (cascata no banco)', async () => {
    await request(app).post('/api/eventos').set(auth).send(culto)
    const pai = await prisma.evento.findFirst({ where: { eventoPaiId: null } })
    expect((await request(app).delete(`/api/eventos/${pai!.id}?escopo=serie`).set(auth)).status).toBe(204)
    expect(await prisma.evento.count()).toBe(0)
  })
})

describe('manutenção de ativos no PostgreSQL', () => {
  const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
  const criarAtivo = async (nome: string, periodicidadeDias: number) =>
    (await request(app).post('/api/ativos').set(auth).send({ nome, periodicidadeDias })).body.id as string
  const registrar = (id: string, data: string) =>
    request(app).post(`/api/ativos/${id}/manutencoes`).set(auth).send({ data, descricao: 'Limpeza dos filtros', responsavel: 'Técnico' })

  it('a situação é calculada a partir da última manutenção', async () => {
    const ar = await criarAtivo('Ar-condicionado', 90)
    const bebedouro = await criarAtivo('Bebedouro', 180)
    await criarAtivo('Caixa de som', 60)
    await registrar(ar, diasAtras(100))       // venceu há 10 dias
    await registrar(bebedouro, diasAtras(10)) // faltam 170 dias

    const status = Object.fromEntries((await request(app).get('/api/ativos').set(auth)).body.map((a: any) => [a.nome, a.status]))
    expect(status).toEqual({ 'Ar-condicionado': 'VENCIDO', Bebedouro: 'EM_DIA', 'Caixa de som': 'SEM_REGISTRO' })
  })

  it('registrar uma manutenção nova tira o ativo do vencido', async () => {
    const ar = await criarAtivo('Ar-condicionado', 90)
    await registrar(ar, diasAtras(100))
    const r = await registrar(ar, diasAtras(0))
    expect(r.status).toBe(201)
    expect(r.body.ativo.status).toBe('EM_DIA')
  })

  it('o histórico traz todas as manutenções do ativo, da mais recente para a mais antiga', async () => {
    const ar = await criarAtivo('Ar-condicionado', 90)
    await registrar(ar, '2026-01-10')
    await registrar(ar, '2026-04-10')
    const r = await request(app).get('/api/manutencoes/relatorio').set(auth)
    expect(r.body[0].manutencoes.map((m: any) => m.data.slice(0, 10))).toEqual(['2026-04-10', '2026-01-10'])
  })

  it('excluir o ativo apaga o histórico dele (cascata)', async () => {
    const ar = await criarAtivo('Ar-condicionado', 90)
    await registrar(ar, '2026-01-10')
    expect((await request(app).delete(`/api/ativos/${ar}`).set(auth)).status).toBe(204)
    expect(await prisma.manutencao.count()).toBe(0)
  })
})
