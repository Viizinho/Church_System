import { Response } from 'express'

const MAX_CLIENTES = 500
const HEARTBEAT_MS = 25_000

const clientes = new Set<Response>()

// Comentário SSE a cada 25 s: mantém a conexão viva atrás de proxies/balanceadores (que fecham conexões ociosas).
const heartbeat = setInterval(() => {
  for (const cliente of clientes) cliente.write(': ping\n\n')
}, HEARTBEAT_MS)
heartbeat.unref()

/** Registra o cliente SSE. Retorna `null` se o limite de conexões simultâneas foi atingido. */
export function registrarClienteSSE(res: Response): (() => void) | null {
  if (clientes.size >= MAX_CLIENTES) return null
  clientes.add(res)
  return () => clientes.delete(res)
}

export function emitirAtualizacaoCampanha(itemId: string, valorArrecadado: number) {
  const payload = JSON.stringify({ itemId, valorArrecadado })
  for (const cliente of clientes) {
    cliente.write(`data: ${payload}\n\n`)
  }
}
