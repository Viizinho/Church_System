import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { banco } from '../helpers/banco'
import { carregarApp, entrar, semearAdmin } from '../helpers/api'

/** Campanha: contribuições públicas, aprovação pelo tesoureiro e as regras de negócio (RN-05). */
// Cada contribuição vem de um "visitante" diferente: sem isso o limite de 15 envios por IP seria atingido.
process.env.TRUST_PROXY = '1'
let visitante = 0
const ipNovo = () => `10.0.${Math.floor(++visitante / 250)}.${visitante % 250}`

let app: Express
let auth: Record<string, string>
beforeAll(async () => {
  banco.limpar()
  semearAdmin(banco)
  app = await carregarApp()
  auth = await entrar(app)
})
beforeEach(() => {
  banco.tabelas.contribuicao = []
  banco.tabelas.itemCampanha = [{ id: 'item1', nome: 'Geladeira', valorTotal: 1000, ativo: true, ordem: 1, chavePix: 'pix', whatsappTesoureiro: '5583999990000' }]
})

const contribuir = (dados: Record<string, unknown>) => request(app).post('/api/publico/campanha/item1/contribuir').set('X-Forwarded-For', ipNovo()).send({ nomeContribuidor: 'Maria', valor: 100, ...dados })
const confirmar = (id: string) => request(app).patch(`/api/campanha/contribuicoes/${id}/confirmar`).set(auth)
const arrecadado = async () => (await request(app).get('/api/publico/campanha')).body[0].valorArrecadado
const pendente = (nome: string) => banco.tabelas.contribuicao.find((c) => c.nomeContribuidor === nome)!

describe('contribuição pública', () => {
  it('aceita comprovante https', async () => {
    expect((await contribuir({ comprovanteUrl: 'https://exemplo.com/comprovante.png' })).status).toBe(201)
  })
  it.each(['javascript:alert(document.cookie)', 'data:text/html,<script>alert(1)</script>'])('recusa comprovante %s (XSS)', async (url) => {
    expect((await contribuir({ comprovanteUrl: url })).status).toBe(400)
  })
  it('recusa nome gigante e valor absurdo', async () => {
    expect((await contribuir({ nomeContribuidor: 'A'.repeat(500) })).status).toBe(400)
    expect((await contribuir({ valor: 99_999_999 })).status).toBe(400)
  })
  it('entra como PENDENTE e não conta no arrecadado até ser aprovada', async () => {
    await contribuir({})
    expect(pendente('Maria').status).toBe('PENDENTE')
    expect(await arrecadado()).toBe(0)
  })
})

describe('aprovação pelo tesoureiro', () => {
  it('ao aprovar, o valor entra no arrecadado (soma só das CONFIRMADAS)', async () => {
    await contribuir({})
    expect((await confirmar(pendente('Maria').id)).status).toBe(200)
    expect(await arrecadado()).toBe(100)
  })

  it('duas aprovações simultâneas: uma passa (200) e a outra é barrada (409) — conta uma vez só', async () => {
    await contribuir({})
    const [a, b] = await Promise.all([confirmar(pendente('Maria').id), confirmar(pendente('Maria').id)])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    expect(await arrecadado()).toBe(100)
  })

  it('aprovar exige login', async () => {
    await contribuir({})
    expect((await request(app).patch(`/api/campanha/contribuicoes/${pendente('Maria').id}/confirmar`)).status).toBe(401)
  })

  it('status inválido no filtro → 400', async () => {
    expect((await request(app).get('/api/campanha/contribuicoes?status=QUALQUER').set(auth)).status).toBe(400)
  })
})

describe('RN-05: o arrecadado nunca passa do valor total do item', () => {
  it('recusa contribuição acima do que falta e informa quanto falta', async () => {
    await contribuir({}); await confirmar(pendente('Maria').id) // 100 de 1000
    const r = await contribuir({ nomeContribuidor: 'Pedro', valor: 950 })
    expect(r.status).toBe(400)
    expect(r.body.error).toMatch(/Faltam R\$\s?900,00/)
  })

  it('pendentes não reservam valor, mas a aprovação que estouraria a meta é barrada', async () => {
    await contribuir({}); await confirmar(pendente('Maria').id)
    expect((await contribuir({ nomeContribuidor: 'Ana', valor: 900 })).status).toBe(201)
    expect((await contribuir({ nomeContribuidor: 'Bia', valor: 900 })).status).toBe(201)

    expect((await confirmar(pendente('Ana').id)).status).toBe(200)
    expect((await confirmar(pendente('Bia').id)).status).toBe(409)
    expect(pendente('Bia').status).toBe('PENDENTE')
    expect(await arrecadado()).toBe(1000)

    // item completo: não aceita mais, e a excedente pode ser recusada com motivo
    expect((await contribuir({ nomeContribuidor: 'Zé', valor: 10 })).status).toBe(409)
    const recusa = await request(app).patch(`/api/campanha/contribuicoes/${pendente('Bia').id}/recusar`).set(auth).send({ motivoRecusa: 'Item já completo' })
    expect(recusa.status).toBe(200)
    expect(pendente('Bia').status).toBe('RECUSADO')
  })

  it('o valor total do item não pode ficar abaixo do já arrecadado', async () => {
    await contribuir({ valor: 600 }); await confirmar(pendente('Maria').id)
    const r = await request(app).put('/api/campanha/itens/item1').set(auth).send({ nome: 'Geladeira', valorTotal: 500, chavePix: 'pix', whatsappTesoureiro: '5583999990000' })
    expect(r.status).toBe(400)
  })
})
