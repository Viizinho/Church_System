import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { banco } from '../helpers/banco'
import { carregarApp, entrar, semearAdmin } from '../helpers/api'

const META = '11111111-1111-4111-8111-111111111111'
let app: Express
let auth: Record<string, string>
beforeAll(async () => {
  banco.limpar()
  semearAdmin(banco)
  app = await carregarApp()
  auth = await entrar(app)
})
beforeEach(() => {
  banco.tabelas.doacaoAlimento = []
  banco.tabelas.metaCesta = [{ id: META, nomeItem: 'Arroz', unidade: 'kg', quantidadeNecessaria: 10, ativo: true }]
})

const doar = (quantidade: number, nomeDoador = 'Ana') =>
  request(app).post('/api/publico/mao-amiga/doacoes').send({ nomeDoador, itens: [{ metaCestaId: META, quantidade }] })

describe('Mão Amiga — doações de alimentos pela página pública', () => {
  it('registra a doação como pendente', async () => {
    expect((await doar(7)).status).toBe(201)
    expect(banco.tabelas.doacaoAlimento[0].status).toBe('PENDENTE')
  })

  it('não deixa passar da meta: depois de 7 de 10, uma doação de 7 é barrada', async () => {
    await doar(7)
    const r = await doar(7)
    expect(r.status).toBe(400)
    expect(r.body.error).toMatch(/Só faltam 3/)
  })

  it('as metas públicas mostram o reservado e o que ainda falta', async () => {
    await doar(7)
    const [meta] = (await request(app).get('/api/publico/mao-amiga/metas')).body
    expect(meta).toMatchObject({ reservado: 7, restante: 3 })
  })

  it('recusa doação sem itens e quantidade negativa', async () => {
    expect((await request(app).post('/api/publico/mao-amiga/doacoes').send({ nomeDoador: 'Ana', itens: [] })).status).toBe(400)
    expect((await doar(-1)).status).toBe(400)
  })

  it('Pix com comprovante javascript: é recusado', async () => {
    expect((await request(app).post('/api/publico/mao-amiga/pix').send({ nomeDoador: 'Zé', comprovanteUrl: 'javascript:1' })).status).toBe(400)
  })
})

describe('Mão Amiga — confirmação pela secretaria', () => {
  it('confirma uma vez; a segunda tentativa → 409', async () => {
    await doar(5)
    const id = banco.tabelas.doacaoAlimento[0].id
    expect((await request(app).patch(`/api/mao-amiga/doacoes/${id}/confirmar`).set(auth)).status).toBe(200)
    expect(banco.tabelas.doacaoAlimento[0].status).toBe('CONFIRMADO')
    expect((await request(app).patch(`/api/mao-amiga/doacoes/${id}/confirmar`).set(auth)).status).toBe(409)
  })

  it('recusa com motivo', async () => {
    await doar(5)
    const id = banco.tabelas.doacaoAlimento[0].id
    const r = await request(app).patch(`/api/mao-amiga/doacoes/${id}/recusar`).set(auth).send({ motivoRecusa: 'Não chegou' })
    expect(r.status).toBe(200)
    expect(banco.tabelas.doacaoAlimento[0]).toMatchObject({ status: 'RECUSADO', motivoRecusa: 'Não chegou' })
  })

  it('doação inexistente → 404', async () => {
    expect((await request(app).patch('/api/mao-amiga/doacoes/nao-existe/confirmar').set(auth)).status).toBe(404)
  })
})
