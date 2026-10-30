import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'
import { env } from '../config/env'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(254),
  senha: z.string().min(1, 'Senha obrigatória.').max(200),
})

const senhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual.').max(200),
  novaSenha: z
    .string()
    .min(10, 'A nova senha deve ter ao menos 10 caracteres.')
    .max(200)
    .refine((s) => /[a-zA-Z]/.test(s) && /\d/.test(s), 'Use letras e números.'),
})

// Hash descartável: compara contra ele quando o e-mail não existe, para que o tempo de
// resposta não revele quais e-mails estão cadastrados.
const HASH_FALSO = bcrypt.hashSync('senha-que-ninguem-usa', 10)

export async function login(req: Request, res: Response) {
  const { email, senha } = loginSchema.parse(req.body)

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  const senhaValida = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO)
  if (!usuario || !senhaValida) throw new AppError('E-mail ou senha incorretos.', 401)

  const token = jwt.sign({ sub: usuario.id, nome: usuario.nome }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions)

  return res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } })
}

export async function perfil(req: Request, res: Response) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuarioId },
    select: { id: true, nome: true, email: true, criadoEm: true },
  })
  if (!usuario) throw new AppError('Usuário não encontrado.', 404)
  return res.json(usuario)
}

export async function alterarSenha(req: Request, res: Response) {
  const { senhaAtual, novaSenha } = senhaSchema.parse(req.body)

  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } })
  if (!usuario) throw new AppError('Usuário não encontrado.', 404)

  if (!(await bcrypt.compare(senhaAtual, usuario.senhaHash))) throw new AppError('A senha atual está incorreta.', 403)
  if (senhaAtual === novaSenha) throw new AppError('A nova senha deve ser diferente da atual.')

  await prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash: await bcrypt.hash(novaSenha, 12) } })
  return res.status(204).send()
}
