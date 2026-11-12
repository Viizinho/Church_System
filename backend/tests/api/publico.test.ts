import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { banco } from '../helpers/banco'
import { carregarApp, entrar, semearAdmin } from '../helpers/api'

let app: Express
let auth: Record<string, string>
beforeAll(async () => {
  banco.limpar()
  semearAdmin(banco)
  app = await carregarApp()
  auth = await entrar(app)
})

describe('configuração da página inicial', () => {
  it('exige login para alterar', async () => {
    expect((await request(app).put('/api/publico/config').send({ instagramUrl: 'https://x.com' })).status).toBe(401)
  })
  it('recusa link javascript:', async () => {
    expect((await request(app).put('/api/publico/config').set(auth).send({ instagramUrl: 'javascript:alert(1)' })).status).toBe(400)
  })
  it('salva link https e o texto "sobre"', async () => {
    expect((await request(app).put('/api/publico/config').set(auth).send({ instagramUrl: 'https://instagram.com/adju', sobre: 'Olá' })).status).toBe(200)
  })
})

describe('programação pública (GET /api/publico/eventos)', () => {
  beforeAll(() => {
    banco.tabelas.evento = [
      { id: 'e1', nome: 'Culto de outubro', tipo: 'CULTO', inicio: new Date(2026, 9, 25, 18) },
      { id: 'e2', nome: 'Culto de novembro', tipo: 'CULTO', inicio: new Date(2026, 10, 15, 18) },
      { id: 'e3', nome: 'Culto de dezembro', tipo: 'CULTO', inicio: new Date(2026, 11, 6, 18) },
    ]
  })

  it('sem parâmetros, não exige login e devolve doMes e proximos', async () => {
    const r = await request(app).get('/api/publico/eventos')
    expect(r.status).toBe(200)
    expect(r.body).toHaveProperty('doMes')
    expect(r.body).toHaveProperty('proximos')
  })

  it('com mes/ano, devolve os eventos daquele mês (calendário)', async () => {
    const r = await request(app).get('/api/publico/eventos?mes=12&ano=2026')
    expect(r.body.doMes.map((e: any) => e.nome)).toEqual(['Culto de dezembro'])
  })

  it('mês inválido → 400', async () => {
    expect((await request(app).get('/api/publico/eventos?mes=13&ano=2026')).status).toBe(400)
  })
})
