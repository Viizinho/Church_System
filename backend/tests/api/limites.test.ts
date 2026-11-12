import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { banco } from '../helpers/banco'
import { ADMIN, carregarApp, semearAdmin } from '../helpers/api'

/** Limites de tentativas por IP (proteção contra força bruta e spam). */
let app: Express
beforeAll(async () => {
  banco.limpar()
  semearAdmin(banco)
  app = await carregarApp()
})

describe('limite de tentativas', () => {
  it('login: depois de 10 senhas erradas, responde 429', async () => {
    const status: number[] = []
    for (let i = 0; i < 12; i++) status.push((await request(app).post('/api/auth/login').send({ email: ADMIN.email, senha: 'errada' + i })).status)
    expect(status.slice(0, 10).every((s) => s === 401)).toBe(true)
    expect(status.at(-1)).toBe(429)
  })

  it('esqueci-senha: no máximo 5 pedidos por hora', async () => {
    let ultimo = 0
    for (let i = 0; i < 6; i++) ultimo = (await request(app).post('/api/auth/esqueci-senha').send({ email: `x${i}@x.com` })).status
    expect(ultimo).toBe(429)
  })
})
