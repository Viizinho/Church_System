/** Modo produção: serve o frontend, SPA fallback, cache de assets, CSP e CORS restrito. Requer `npm run build` do frontend. */
process.env.NODE_ENV = 'production'
process.env.DATABASE_URL = 'postgres://teste'
process.env.JWT_SECRET = 'a'.repeat(48)
process.env.CORS_ORIGINS = 'https://app.exemplo.org'
process.env.FRONTEND_DIST = require('path').resolve(__dirname, '../../frontend/dist')

import Module from 'module'
import http from 'http'
import fs from 'fs'
import path from 'path'
const original = (Module as any)._load
;(Module as any)._load = function (req: string, ...a: any[]) {
  if (req.endsWith('utils/prisma')) return { default: {}, __esModule: true }
  if (req === '@prisma/client') return { PrismaClient: class {}, Prisma: { PrismaClientKnownRequestError: class extends Error {} } }
  return original.call(this, req, ...a)
}
let falhas = 0
const ok = (c: boolean, m: string) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) falhas++ }

;(async () => {
  const app = (await import('../src/app')).default
  const server = http.createServer(app)
  await new Promise<void>((r) => server.listen(0, r))
  const base = `http://127.0.0.1:${(server.address() as any).port}`

  const raiz = await fetch(base + '/')
  ok(raiz.status === 200 && (await raiz.text()).includes('<div id="root">'), 'GET / entrega o index.html')
  ok(/script-src 'self'/.test(raiz.headers.get('content-security-policy') ?? ''), 'CSP restritiva em produção')
  const spa = await fetch(base + '/membros')
  ok(spa.status === 200 && (spa.headers.get('content-type') ?? '').includes('text/html'), 'rota do React (/membros) cai no index.html')
  const api404 = await fetch(base + '/api/inexistente')
  ok(api404.status === 404 && (api404.headers.get('content-type') ?? '').includes('json'), '/api/* desconhecida responde JSON 404 (não HTML)')

  const arquivo = fs.readdirSync(path.join(process.env.FRONTEND_DIST!, 'assets')).find((f) => f.endsWith('.js'))!
  const asset = await fetch(`${base}/assets/${arquivo}`)
  ok(/immutable/.test(asset.headers.get('cache-control') ?? '') && (asset.headers.get('content-encoding') ?? '') !== undefined, 'assets com hash: cache imutável')

  const cors = await fetch(base + '/health', { headers: { origin: 'https://malicioso.com' } })
  ok(!cors.headers.get('access-control-allow-origin'), 'CORS: origem desconhecida não é liberada')
  const corsOk = await fetch(base + '/health', { headers: { origin: 'https://app.exemplo.org' } })
  ok(corsOk.headers.get('access-control-allow-origin') === 'https://app.exemplo.org', 'CORS: origem configurada é liberada')

  server.close()
  process.exit(falhas ? 1 : 0)
})()
