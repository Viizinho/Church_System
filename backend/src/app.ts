import 'express-async-errors'
import path from 'path'
import fs from 'fs'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import router from './routes'
import prisma from './utils/prisma'
import { errorHandler } from './middlewares/errorHandler'
import { limiteApi } from './middlewares/rateLimit'
import { env, isProd, corsOrigins } from './config/env'

const app = express()

app.disable('x-powered-by')
// Atrás de proxy (Render, Nginx...) o IP real vem de X-Forwarded-For; sem isto o rate limit enxerga só o proxy.
if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY)

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'style-src': ["'self'", "'unsafe-inline'"], // Tailwind gera CSS estático; inline só para barras de progresso
        'script-src': ["'self'"],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'object-src': ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
)

// CORS: em produção, só as origens listadas (ou mesma origem quando o frontend é servido junto).
app.use(
  cors({
    origin: isProd ? (corsOrigins.length ? corsOrigins : false) : true,
    maxAge: 600,
  })
)

// Compressão — exceto no stream SSE, que precisa ser enviado na hora.
app.use(compression({ filter: (req, res) => !req.path.endsWith('/campanha/eventos') && compression.filter(req, res) }))
app.use(express.json({ limit: '100kb' }))

// Liveness (barato) e readiness (confere o banco) para o provedor de hospedagem.
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ready' })
  } catch {
    res.status(503).json({ status: 'database-unavailable' })
  }
})

app.use('/api', limiteApi, router)
app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }))

// Em produção a API pode servir o build do frontend (1 serviço só, mesma origem → sem CORS).
const dist = env.FRONTEND_DIST ?? path.resolve(__dirname, '../../frontend/dist')
if (isProd && fs.existsSync(path.join(dist, 'index.html'))) {
  app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' })) // nomes com hash
  app.use(express.static(dist, { maxAge: '5m', index: false }))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'))) // SPA fallback
}

app.use(errorHandler)

export default app
