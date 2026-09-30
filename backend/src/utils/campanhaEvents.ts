import { Response } from 'express'

const clientes = new Set<Response>()

export function registrarClienteSSE(res: Response): () => void {
  clientes.add(res)
  return () => clientes.delete(res)
}

export function emitirAtualizacaoCampanha(itemId: string, valorArrecadado: number) {
  const payload = JSON.stringify({ itemId, valorArrecadado })
  for (const cliente of clientes) {
    cliente.write(`data: ${payload}\n\n`)
  }
}
