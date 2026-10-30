import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError'
import { env } from '../config/env'

interface JwtPayload {
  sub: string
  nome: string
}

declare global {
  namespace Express {
    interface Request {
      usuarioId: string
      usuarioNome: string
    }
  }
}

export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Token de autenticação não fornecido.', 401)
  }

  const token = authHeader.slice(7)
  try {
    // Fixa o algoritmo: evita aceitar tokens "alg: none" ou trocados por outro algoritmo.
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload
    req.usuarioId = decoded.sub
    req.usuarioNome = decoded.nome
    next()
  } catch {
    throw new AppError('Token inválido ou expirado.', 401)
  }
}
