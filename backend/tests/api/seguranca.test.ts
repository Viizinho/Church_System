import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import type { Express } from 'express'
import { banco } from '../helpers/banco'
import { carregarApp, semearAdmin } from '../helpers/api'

let app: Express
beforeAll(async () => {
  banco.limpar()
  semearAdmin(banco)
  app = await carregarApp()
})

describe('cabeçalhos de segurança e rotas básicas', () => {
  it('GET /health responde 200 sem revelar o servidor', async () => {
    const r = await request(app).get('/health')
    expect(r.status).toBe(200)
    expect(r.headers['x-powered-by']).toBeUndefined()
    expect(r.headers['x-content-type-options']).toBe('nosniff')
    expect(r.headers['content-security-policy']).toMatch(/default-src 'self'/)
  })

  it('GET /ready consulta o banco', async () => {
    expect((await request(app).get('/ready')).status).toBe(200)
  })

  it('rota desconhecida da API responde 404 em JSON', async () => {
    const r = await request(app).get('/api/nao-existe')
    expect(r.status).toBe(404)
    expect(r.body.error).toBeTruthy()
  })
})

describe('autenticação obrigatória nas rotas do painel', () => {
  it.each(['/api/membros', '/api/eventos', '/api/ativos', '/api/dashboard', '/api/campanha/itens', '/api/mao-amiga/doacoes'])(
    '%s sem token → 401',
    async (rota) => expect((await request(app).get(rota)).status).toBe(401)
  )

  it('token inválido → 401', async () => {
    expect((await request(app).get('/api/membros').set('Authorization', 'Bearer lixo')).status).toBe(401)
  })

  it('token sem assinatura (alg: none) → 401', async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
    const semAlg = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'u1', nome: 'x' })}.`
    expect((await request(app).get('/api/membros').set('Authorization', `Bearer ${semAlg}`)).status).toBe(401)
  })

  it('token assinado com outro algoritmo (HS512) → 401', async () => {
    const t = jwt.sign({ sub: 'u1', nome: 'x' }, process.env.JWT_SECRET!, { algorithm: 'HS512' })
    expect((await request(app).get('/api/membros').set('Authorization', `Bearer ${t}`)).status).toBe(401)
  })

  it('token vencido → 401', async () => {
    const t = jwt.sign({ sub: 'u1', nome: 'x', exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET!, { algorithm: 'HS256' })
    expect((await request(app).get('/api/membros').set('Authorization', `Bearer ${t}`)).status).toBe(401)
  })
})

describe('entradas malformadas', () => {
  it('JSON quebrado → 400 (e não 500)', async () => {
    const r = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{json quebrado')
    expect(r.status).toBe(400)
    expect(r.body.error).toBe('JSON inválido.')
  })

  it('corpo maior que 100 kB → 413', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'a@a.com', senha: 'x'.repeat(200_000) })
    expect(r.status).toBe(413)
  })
})
