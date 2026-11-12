import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { criarAdmin, limparBanco, prisma } from '../helpers/bancoReal'
import { entrar } from '../helpers/api'

process.env.TRUST_PROXY = '1'
let visitante = 0
const ip = () => `10.1.${Math.floor(++visitante / 250)}.${visitante % 250}`

let app: Express
let auth: Record<string, string>
beforeAll(async () => { app = (await import('../../src/app')).default })
beforeEach(async () => {
  await limparBanco()
  await criarAdmin()
  auth = await entrar(app)
})
afterAll(() => prisma.$disconnect())

describe('campanha no PostgreSQL', () => {
  const criarItem = async (valorTotal: number) =>
    (await request(app).post('/api/campanha/itens').set(auth).send({ nome: 'Geladeira', valorTotal, chavePix: 'pix@igreja.org', whatsappTesoureiro: '83999990000' })).body.id as string
  const contribuir = (itemId: string, nomeContribuidor: string, valor: number) =>
    request(app).post(`/api/publico/campanha/${itemId}/contribuir`).set('X-Forwarded-For', ip()).send({ nomeContribuidor, valor })
  const arrecadado = async () => (await request(app).get('/api/publico/campanha')).body[0].valorArrecadado

  it('o arrecadado é a soma das contribuições CONFIRMADAS (calculado, não gravado)', async () => {
    const item = await criarItem(1000)
    const a = (await contribuir(item, 'Ana', 150.5)).body.id
    await contribuir(item, 'Bia', 200) // fica pendente
    expect(await arrecadado()).toBe(0)
    await request(app).patch(`/api/campanha/contribuicoes/${a}/confirmar`).set(auth)
    expect(await arrecadado()).toBe(150.5)
  })

  it('aprovações simultâneas que estourariam a meta: só uma passa (transação no banco)', async () => {
    const item = await criarItem(1000)
    const ids = [(await contribuir(item, 'Ana', 700)).body.id, (await contribuir(item, 'Bia', 700)).body.id]
    const respostas = await Promise.all(ids.map((id) => request(app).patch(`/api/campanha/contribuicoes/${id}/confirmar`).set(auth)))
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409])
    expect(await arrecadado()).toBe(700)
    expect(await prisma.contribuicao.count({ where: { status: 'CONFIRMADO' } })).toBe(1)
  })

  it('excluir o item apaga as contribuições dele (cascata)', async () => {
    const item = await criarItem(500)
    await contribuir(item, 'Ana', 50)
    await request(app).delete(`/api/campanha/itens/${item}`).set(auth)
    expect(await prisma.contribuicao.count()).toBe(0)
  })
})

describe('Mão Amiga no PostgreSQL', () => {
  it('meta → doação pública → confirmação → painel público atualizado', async () => {
    const meta = (await request(app).post('/api/mao-amiga/metas').set(auth).send({ nomeItem: 'Arroz', unidade: 'kg', quantidadeNecessaria: 10 })).body
    const doacao = await request(app).post('/api/publico/mao-amiga/doacoes').set('X-Forwarded-For', ip()).send({ nomeDoador: 'Ana', itens: [{ metaCestaId: meta.id, quantidade: 4 }] })
    expect(doacao.status).toBe(201)

    let [publica] = (await request(app).get('/api/publico/mao-amiga/metas')).body
    expect(publica).toMatchObject({ reservado: 4, restante: 6 })

    const pendente = await prisma.doacaoAlimento.findFirstOrThrow()
    expect((await request(app).patch(`/api/mao-amiga/doacoes/${pendente.id}/confirmar`).set(auth)).status).toBe(200)
    ;[publica] = (await request(app).get('/api/publico/mao-amiga/metas')).body
    expect(publica).toMatchObject({ reservado: 0, restante: 6 })
  })
})

describe('dashboard', () => {
  it('conta membros ativos e pendências', async () => {
    await request(app).post('/api/membros').set(auth).send({ nomeCompleto: 'Ana' })
    await request(app).post('/api/membros').set(auth).send({ nomeCompleto: 'Bruno', status: 'INATIVO' })
    const r = await request(app).get('/api/dashboard').set(auth)
    expect(r.status).toBe(200)
    expect(r.body.membros.total).toBe(1)
  })
})
