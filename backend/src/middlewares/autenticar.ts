import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError'
import { env } from '../config/env'
import prisma from '../utils/prisma'

interface JwtPayload {
  sub: string
  nome: string
  iat?: number
}

declare global {
  namespace Express {
    interface Request {
      usuarioId: string
      usuarioNome: string
    }
  }
}

export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Token de autenticação não fornecido.', 401)
  }

  const token = authHeader.slice(7)
  let decoded: JwtPayload
  try {
    // Fixa o algoritmo: evita aceitar tokens "alg: none" ou trocados por outro algoritmo.
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload
  } catch {
    throw new AppError('Token inválido ou expirado.', 401)
  }

  // A conta ainda existe e a senha não foi trocada depois de emitido o token?
  // (assim, redefinir a senha derruba as sessões abertas, inclusive a de quem roubou o token)
  const usuario = await prisma.usuario.findUnique({ where: { id: decoded.sub }, select: { id: true, senhaAlteradaEm: true } })
  if (!usuario) throw new AppError('Token inválido ou expirado.', 401)
  if (usuario.senhaAlteradaEm && (decoded.iat ?? 0) < Math.floor(usuario.senhaAlteradaEm.getTime() / 1000)) {
    throw new AppError('Sessão encerrada: a senha foi alterada. Entre novamente.', 401)
  }

  req.usuarioId = decoded.sub
  req.usuarioNome = decoded.nome
  next()
}
