/**
 * Utilidades dos testes de API: sobe o Express real ligado ao banco em memória.
 * O mock do Prisma é ligado em `tests/helpers/mockPrisma.ts` (setupFiles do projeto "api").
 */
import bcrypt from 'bcryptjs'
import request from 'supertest'
import type { Express } from 'express'
import type { BancoEmMemoria } from './bancoEmMemoria'

export const ADMIN = { id: 'u1', nome: 'Admin', email: 'admin@igreja.com', senha: 'SenhaForte123' }

/** Cadastra o administrador padrão (senha com custo baixo de bcrypt para o teste ser rápido). */
export function semearAdmin(banco: BancoEmMemoria, senha = ADMIN.senha) {
  banco.tabelas.usuario = [{ id: ADMIN.id, nome: ADMIN.nome, email: ADMIN.email, senhaHash: bcrypt.hashSync(senha, 4), criadoEm: new Date() }]
}

export async function carregarApp(): Promise<Express> {
  return (await import('../../src/app')).default
}

/** Faz login e devolve o cabeçalho Authorization pronto. */
export async function entrar(app: Express, email = ADMIN.email, senha = ADMIN.senha) {
  const r = await request(app).post('/api/auth/login').send({ email, senha })
  if (r.status !== 200) throw new Error(`login falhou: ${r.status} ${JSON.stringify(r.body)}`)
  return { Authorization: `Bearer ${r.body.token}` }
}
