import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { banco } from '../helpers/banco'
import { ADMIN, carregarApp, entrar, semearAdmin } from '../helpers/api'

let app: Express
beforeAll(async () => {
  banco.limpar()
  semearAdmin(banco)
  app = await carregarApp()
})

describe('login', () => {
  it('mesma mensagem para e-mail inexistente e senha errada (não revela quem tem conta)', async () => {
    const a = await request(app).post('/api/auth/login').send({ email: 'ninguem@x.com', senha: 'qualquer' })
    const b = await request(app).post('/api/auth/login').send({ email: ADMIN.email, senha: 'errada' })
    expect(a.status).toBe(401)
    expect(b.status).toBe(401)
    expect(a.body.error).toBe(b.body.error)
  })

  it('aceita o e-mail com espaços e maiúsculas e não devolve o hash da senha', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: '  ADMIN@igreja.com ', senha: ADMIN.senha })
    expect(r.status).toBe(200)
    expect(r.body.token).toBeTruthy()
    expect(r.body.usuario).not.toHaveProperty('senhaHash')
  })

  it('e-mail em formato inválido → 400', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'nao-e-email', senha: 'x' })).status).toBe(400)
  })

  it('com o token, o perfil é acessível', async () => {
    const auth = await entrar(app)
    const r = await request(app).get('/api/auth/perfil').set(auth)
    expect(r.status).toBe(200)
    expect(r.body.email).toBe(ADMIN.email)
  })
})

describe('troca de senha (usuário logado)', () => {
  it('fluxo completo: valida a senha atual, exige senha forte e troca', async () => {
    const auth = await entrar(app)
    const trocar = (senhaAtual: string, novaSenha: string) => request(app).put('/api/auth/senha').set(auth).send({ senhaAtual, novaSenha })

    expect((await trocar('errada', 'NovaSenha1234')).status).toBe(403)
    expect((await trocar(ADMIN.senha, 'curta1')).status).toBe(400)
    expect((await trocar(ADMIN.senha, 'NovaSenha1234')).status).toBe(204)

    expect((await request(app).post('/api/auth/login').send({ email: ADMIN.email, senha: 'NovaSenha1234' })).status).toBe(200)
    expect((await request(app).post('/api/auth/login').send({ email: ADMIN.email, senha: ADMIN.senha })).status).toBe(401)
  })
})
