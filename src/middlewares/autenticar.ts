import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError'

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

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    req.usuarioId = decoded.sub
    req.usuarioNome = decoded.nome
    next()
  } catch {
    throw new AppError('Token inválido ou expirado.', 401)
  }
}
