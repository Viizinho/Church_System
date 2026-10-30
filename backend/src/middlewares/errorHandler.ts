import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { AppError } from '../utils/AppError'
import { isProd } from '../config/env'

type ErroHttp = { status?: number; type?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  if (err instanceof ZodError) {
    const detalhes = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
    return res.status(400).json({ error: 'Dados inválidos.', detalhes })
  }

  // Erros conhecidos do Prisma viram respostas claras em vez de 500
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe um registro com esses dados.' })
    if (err.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' })
    if (err.code === 'P2003') return res.status(409).json({ error: 'Este registro está em uso e não pode ser alterado/removido.' })
    if (err.code === 'P2034') return res.status(409).json({ error: 'Muitas pessoas agiram ao mesmo tempo. Tente novamente.' })
  }

  // Erros do body-parser (JSON malformado, corpo grande demais)
  const http = err as ErroHttp
  if (http?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' })
  if (http?.type === 'entity.too.large') return res.status(413).json({ error: 'Requisição grande demais.' })

  console.error(`[erro] ${req.method} ${req.path}`, isProd ? (err as Error)?.message : err)
  return res.status(500).json({ error: 'Erro interno do servidor.' })
}
