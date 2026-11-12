import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { ADMIN_REAL, criarAdmin, limparBanco, prisma } from '../helpers/bancoReal'

/** Login e "esqueci minha senha" gravando e lendo tokens no PostgreSQL. */
let app: Express
const emails: string[] = []
beforeAll(async () => {
  await limparBanco()
  await criarAdmin()
  app = (await import('../../src/app')).default
  const log = console.log
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
    const t = a.join(' ')
    if (t.startsWith('[email:simulado]')) emails.push(t)
    else log(...a)
  })
})
afterAll(async () => { vi.restoreAllMocks(); await prisma.$disconnect() })

describe('autenticação com banco real', () => {
  it('login com a senha certa devolve o token', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: ADMIN_REAL.email, senha: ADMIN_REAL.senha })
    expect(r.status).toBe(200)
    expect(r.body.token).toBeTruthy()
  })

  it('esqueci a senha → link por e-mail → nova senha', async () => {
    expect((await request(app).post('/api/auth/esqueci-senha').send({ email: ADMIN_REAL.email })).status).toBe(202)
    await vi.waitFor(() => expect(emails).toHaveLength(1))
    expect(await prisma.tokenRecuperacaoSenha.count()).toBe(1)

    const token = emails[0].match(/#token=([A-Za-z0-9_-]+)/)![1]
    expect((await request(app).post('/api/auth/redefinir-senha').send({ token, novaSenha: 'SenhaNova2026' })).status).toBe(204)

    const registro = await prisma.tokenRecuperacaoSenha.findFirstOrThrow()
    expect(registro.usadoEm).not.toBeNull()
    expect((await request(app).post('/api/auth/login').send({ email: ADMIN_REAL.email, senha: 'SenhaNova2026' })).status).toBe(200)
  })
})
