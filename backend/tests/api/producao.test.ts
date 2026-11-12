import { beforeAll, describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import request from 'supertest'
import type { Express } from 'express'

/**
 * Modo produção: a API serve o frontend (SPA), com cache dos assets, CSP e CORS restrito.
 * Precisa do build do frontend (`npm run build -w frontend`); sem ele, os testes são pulados.
 */
const dist = path.resolve(__dirname, '../../../frontend/dist')
const temBuild = fs.existsSync(path.join(dist, 'index.html'))

process.env.NODE_ENV = 'production'
process.env.JWT_SECRET = 'a'.repeat(48)
process.env.CORS_ORIGINS = 'https://app.exemplo.org'
process.env.APP_URL = 'https://app.exemplo.org'
process.env.FRONTEND_DIST = dist

let app: Express
beforeAll(async () => {
  if (temBuild) app = (await import('../../src/app')).default
})

describe.skipIf(!temBuild)('servidor em produção', () => {
  it('GET / entrega o index.html com CSP restritiva', async () => {
    const r = await request(app).get('/')
    expect(r.status).toBe(200)
    expect(r.text).toContain('<div id="root">')
    expect(r.headers['content-security-policy']).toMatch(/script-src 'self'/)
  })

  it('rotas do React (/membros) caem no index.html', async () => {
    const r = await request(app).get('/membros')
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toContain('text/html')
  })

  it('/api/* desconhecida responde JSON 404, não HTML', async () => {
    const r = await request(app).get('/api/inexistente')
    expect(r.status).toBe(404)
    expect(r.headers['content-type']).toContain('json')
  })

  it('arquivos com hash em /assets têm cache imutável', async () => {
    const arquivo = fs.readdirSync(path.join(dist, 'assets')).find((f) => f.endsWith('.js'))!
    const r = await request(app).get(`/assets/${arquivo}`)
    expect(r.headers['cache-control']).toMatch(/immutable/)
  })

  it('CORS: só a origem configurada é liberada', async () => {
    const malicioso = await request(app).get('/health').set('Origin', 'https://malicioso.com')
    expect(malicioso.headers['access-control-allow-origin']).toBeUndefined()
    const permitido = await request(app).get('/health').set('Origin', 'https://app.exemplo.org')
    expect(permitido.headers['access-control-allow-origin']).toBe('https://app.exemplo.org')
  })
})
