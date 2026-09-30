import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/AppError'
import { ZodError } from 'zod'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
    return res.status(400).json({ error: 'Dados inválidos.', detalhes: messages })
  }

  console.error(err)
  return res.status(500).json({ error: 'Erro interno do servidor.' })
}
