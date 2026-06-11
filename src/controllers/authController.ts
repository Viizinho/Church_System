import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  senha: z.string().min(1, 'Senha obrigatória.'),
})

export async function login(req: Request, res: Response) {
  const { email, senha } = loginSchema.parse(req.body)

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) throw new AppError('E-mail ou senha incorretos.', 401)

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash)
  if (!senhaValida) throw new AppError('E-mail ou senha incorretos.', 401)

  const token = jwt.sign(
    { sub: usuario.id, nome: usuario.nome },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
  )

  return res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  })
}

export async function perfil(req: Request, res: Response) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuarioId },
    select: { id: true, nome: true, email: true, criadoEm: true },
  })
  if (!usuario) throw new AppError('Usuário não encontrado.', 404)
  return res.json(usuario)
}
