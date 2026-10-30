import { env } from './config/env'
import app from './app'
import prisma from './utils/prisma'
import { iniciarCronManutencao } from './jobs/verificarManutencao'

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${env.PORT} (${env.NODE_ENV})`)
  if (env.ENABLE_CRON) iniciarCronManutencao()
})

// Mantém conexões ociosas (e o SSE) abertas por mais tempo que o idle do balanceador.
server.keepAliveTimeout = 65_000
server.headersTimeout = 66_000

async function encerrar(sinal: string) {
  console.log(`\n${sinal} recebido — encerrando...`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref() // SSE abertos não deixam o close terminar
}
process.on('SIGTERM', () => encerrar('SIGTERM'))
process.on('SIGINT', () => encerrar('SIGINT'))

// Uma promessa rejeitada sem tratamento derrubaria o processo (Node ≥ 15): registra e segue.
process.on('unhandledRejection', (motivo) => console.error('[unhandledRejection]', motivo))
