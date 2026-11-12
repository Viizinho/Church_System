import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import crypto from 'crypto'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import type { Express } from 'express'
import { banco } from '../helpers/banco'
import { ADMIN, carregarApp, semearAdmin } from '../helpers/api'

/**
 * "Esqueci minha senha". Sem e-mail configurado, em desenvolvimento/teste o sistema escreve o
 * e-mail no console como "[email:simulado]" — é isso que o teste captura.
 */
let app: Express
const emails: string[] = []
const esperar = () => new Promise((r) => setTimeout(r, 150)) // o e-mail é enviado depois da resposta

beforeAll(async () => {
  banco.limpar()
  semearAdmin(banco)
  app = await carregarApp()
  const logOriginal = console.log
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
    const t = a.join(' ')
    if (t.startsWith('[email:simulado]')) emails.push(t)
    else logOriginal(...a)
  })
})
afterAll(() => vi.restoreAllMocks())

const pedir = (email: string) => request(app).post('/api/auth/esqueci-senha').send({ email })
const redefinir = (token: string, novaSenha: string) => request(app).post('/api/auth/redefinir-senha').send({ token, novaSenha })

describe('recuperação de senha', () => {
  let token = ''

  it('responde igual para e-mail cadastrado e não cadastrado (não revela quem tem conta)', async () => {
    const naoExiste = await pedir('ninguem@x.com')
    const existe = await pedir(' Admin@igreja.com ')
    await esperar()
    expect(naoExiste.status).toBe(202)
    expect(existe.status).toBe(202)
    expect(naoExiste.body).toEqual(existe.body)
  })

  it('envia o e-mail só para a conta existente, com link de token longo no fragmento (#)', () => {
    expect(emails).toHaveLength(1)
    expect(emails[0]).toContain(`Para: ${ADMIN.email}`)
    token = emails[0].match(/redefinir-senha#token=([A-Za-z0-9_-]+)/)?.[1] ?? ''
    expect(token.length).toBeGreaterThanOrEqual(40)
    expect(emails[0]).not.toContain('?token=')
  })

  it('o banco guarda só o hash SHA-256 do token, nunca o token', () => {
    const [registro] = banco.tabelas.tokenRecuperacaoSenha
    expect(banco.tabelas.tokenRecuperacaoSenha).toHaveLength(1)
    expect(registro.tokenHash).toHaveLength(64)
    expect(registro.tokenHash).not.toBe(token)
  })

  it('um novo pedido em menos de 2 minutos não gera outro e-mail (anti-spam)', async () => {
    await pedir(ADMIN.email)
    await esperar()
    expect(emails).toHaveLength(1)
  })

  it('recusa token inexistente e senha fraca (o link continua valendo)', async () => {
    expect((await redefinir('x'.repeat(43), 'OutraSenha1234')).status).toBe(400)
    expect((await redefinir(token, 'fraca')).status).toBe(400)
  })

  it('o link é de uso único, mesmo com dois cliques ao mesmo tempo', async () => {
    const [a, b] = await Promise.all([redefinir(token, 'SenhaRecuperada99'), redefinir(token, 'SenhaRecuperada99')])
    expect([a.status, b.status].sort()).toEqual([204, 400])
    expect((await redefinir(token, 'OutraSenha1234')).status).toBe(400)
  })

  it('a nova senha passa a valer e a antiga deixa de valer', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: ADMIN.email, senha: 'SenhaRecuperada99' })).status).toBe(200)
    expect((await request(app).post('/api/auth/login').send({ email: ADMIN.email, senha: ADMIN.senha })).status).toBe(401)
  })

  it('sessões abertas antes da redefinição são encerradas', async () => {
    const antigo = jwt.sign({ sub: ADMIN.id, nome: 'Admin', iat: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '1h' })
    expect((await request(app).get('/api/auth/perfil').set('Authorization', `Bearer ${antigo}`)).status).toBe(401)
  })

  it('o dono da conta recebe o aviso de "senha alterada"', async () => {
    await esperar()
    expect(emails).toHaveLength(2)
    expect(emails[1]).toMatch(/alterada/i)
  })

  it('link vencido → 400 com mensagem genérica', async () => {
    const vencido = 'vencido'.repeat(8)
    banco.tabelas.tokenRecuperacaoSenha.push({
      id: 'old', usuarioId: ADMIN.id, tokenHash: crypto.createHash('sha256').update(vencido).digest('hex'),
      expiraEm: new Date(Date.now() - 1000), usadoEm: null, criadoEm: new Date(),
    })
    const r = await redefinir(vencido, 'OutraSenha1234')
    expect(r.status).toBe(400)
    expect(r.body.error).toMatch(/inválido ou expirado/)
  })
})
