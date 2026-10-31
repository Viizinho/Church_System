import 'dotenv/config'
import { z } from 'zod'

const bool = z.enum(['true', 'false']).transform((v) => v === 'true')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória.'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET é obrigatória.'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  /** Origens permitidas no CORS, separadas por vírgula. Vazio = só mesma origem em produção. */
  CORS_ORIGINS: z.string().default(''),
  /** Quantos proxies confiáveis existem na frente (Render/Nginx = 1). Necessário para o rate limit ver o IP real. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Liga/desliga o job diário de alertas (desligue em réplicas extras). */
  ENABLE_CRON: bool.default(true),
  /** Endereço público do sistema (usado no link do e-mail de recuperação de senha). */
  APP_URL: z.string().url().default('http://localhost:5173'),
  /** Pasta do build do frontend para servir junto com a API. */
  FRONTEND_DIST: z.string().optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  const detalhes = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
  console.error(`❌ Configuração de ambiente inválida:\n${detalhes}`)
  process.exit(1)
}

export const env = parsed.data
export const isProd = env.NODE_ENV === 'production'

// Em produção, recusa segredo fraco ou o valor de exemplo do .env.example.
if (isProd) {
  const fraco = env.JWT_SECRET.length < 32 || /troque-por|change-me|secret$/i.test(env.JWT_SECRET)
  if (fraco) {
    console.error('❌ JWT_SECRET fraco para produção: use 32+ caracteres aleatórios (ex.: `openssl rand -hex 48`).')
    process.exit(1)
  }
}

// O link de recuperação vai por e-mail: em produção precisa apontar para o site real, em HTTPS.
if (isProd && !/^https:\/\//.test(env.APP_URL)) {
  console.error('❌ APP_URL deve ser o endereço público em HTTPS (ex.: https://app.suaigreja.org) — usado no link de recuperação de senha.')
  process.exit(1)
}

export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
