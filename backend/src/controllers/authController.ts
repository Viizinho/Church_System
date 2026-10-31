import crypto from 'crypto'
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'
import { env, isProd } from '../config/env'
import { enviarEmail } from '../utils/notificacoes'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.').max(254),
  senha: z.string().min(1, 'Senha obrigatória.').max(200),
})

const novaSenhaSchema = z
  .string()
  .min(10, 'A nova senha deve ter ao menos 10 caracteres.')
  .max(200)
  .refine((s) => /[a-zA-Z]/.test(s) && /\d/.test(s), 'Use letras e números.')

const senhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual.').max(200),
  novaSenha: novaSenhaSchema,
})

const esqueciSchema = z.object({ email: z.string().trim().toLowerCase().email('E-mail inválido.').max(254) })
const redefinirSchema = z.object({
  token: z.string().min(20).max(200),
  novaSenha: novaSenhaSchema,
})

const VALIDADE_TOKEN_MS = 30 * 60 * 1000 // 30 minutos
const INTERVALO_ENTRE_PEDIDOS_MS = 2 * 60 * 1000 // no máx. 1 e-mail a cada 2 min por conta
const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex')

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

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash: await bcrypt.hash(novaSenha, 12), senhaAlteradaEm: new Date() },
  })
  return res.status(204).send()
}

// ─── Recuperação de senha ──────────────────────────────────────────────────────
// Regras: resposta idêntica exista ou não o e-mail (sem enumeração de contas) e sem esperar o envio
// (sem diferença de tempo); token aleatório de 256 bits, só o hash fica no banco; expira em 30 min;
// uso único; pedido novo invalida os anteriores; redefinir derruba as sessões abertas e avisa por e-mail.

const MENSAGEM_ESQUECI = 'Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha. Ele vale por 30 minutos.'

async function enviarLinkDeRecuperacao(email: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) return

  // Freia quem tenta encher a caixa de entrada de alguém: no máximo um e-mail a cada 2 minutos por conta.
  const recente = await prisma.tokenRecuperacaoSenha.findMany({
    where: { usuarioId: usuario.id, criadoEm: { gte: new Date(Date.now() - INTERVALO_ENTRE_PEDIDOS_MS) } },
    take: 1,
  })
  if (recente.length > 0) return

  const token = crypto.randomBytes(32).toString('base64url')
  // Pedido novo invalida os links anteriores ainda abertos.
  await prisma.tokenRecuperacaoSenha.updateMany({ where: { usuarioId: usuario.id, usadoEm: null }, data: { usadoEm: new Date() } })
  await prisma.tokenRecuperacaoSenha.create({
    data: { usuarioId: usuario.id, tokenHash: sha256(token), expiraEm: new Date(Date.now() + VALIDADE_TOKEN_MS) },
  })

  // O token vai no fragmento (#) da URL: não é enviado ao servidor nem aparece em logs ou no cabeçalho Referer.
  const link = `${env.APP_URL.replace(/\/$/, '')}/redefinir-senha#token=${token}`

  if (isProd && !process.env.SMTP_HOST) {
    // Sem SMTP em produção: nunca escreva o link nos logs (qualquer um com acesso aos logs tomaria a conta).
    console.error('[recuperação de senha] SMTP_HOST não configurado: e-mail NÃO enviado.')
    return
  }
  await enviarEmail(
    usuario.email,
    'Redefinição de senha — Igreja Gestão',
    `Olá, ${usuario.nome}.\n\nRecebemos um pedido para redefinir a senha da sua conta. Use o link abaixo (vale por 30 minutos e só pode ser usado uma vez):\n\n${link}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.`,
  )
}

export async function esqueciSenha(req: Request, res: Response) {
  const { email } = esqueciSchema.parse(req.body)
  // Responde já; a busca no banco e o envio acontecem depois, então o tempo de resposta não revela se o e-mail existe.
  res.status(202).json({ mensagem: MENSAGEM_ESQUECI })
  enviarLinkDeRecuperacao(email).catch((e) => console.error('[recuperação de senha] falha:', e instanceof Error ? e.message : e))
}

export async function redefinirSenha(req: Request, res: Response) {
  const { token, novaSenha } = redefinirSchema.parse(req.body)
  const agora = new Date()
  const registro = await prisma.tokenRecuperacaoSenha.findUnique({ where: { tokenHash: sha256(token) } })

  // Uma única mensagem para token inexistente, vencido ou já usado.
  const invalido = new AppError('Link inválido ou expirado. Peça um novo link de recuperação.', 400)
  if (!registro || registro.usadoEm || registro.expiraEm <= agora) throw invalido

  // Consumo atômico: se dois cliques chegarem juntos, só um ganha.
  const consumido = await prisma.tokenRecuperacaoSenha.updateMany({
    where: { id: registro.id, usadoEm: null, expiraEm: { gte: agora } },
    data: { usadoEm: agora },
  })
  if (consumido.count !== 1) throw invalido

  const usuario = await prisma.usuario.update({
    where: { id: registro.usuarioId },
    data: { senhaHash: await bcrypt.hash(novaSenha, 12), senhaAlteradaEm: agora },
  })
  // Invalida qualquer outro link pendente dessa conta.
  await prisma.tokenRecuperacaoSenha.updateMany({ where: { usuarioId: usuario.id, usadoEm: null }, data: { usadoEm: agora } })

  // Avisa o dono da conta (se não foi ele, percebe na hora).
  enviarEmail(
    usuario.email,
    'Sua senha foi alterada — Igreja Gestão',
    `Olá, ${usuario.nome}.\n\nA senha da sua conta acabou de ser alterada. Se não foi você, entre em contato com a administração imediatamente.`,
  ).catch((e) => console.error('[recuperação de senha] aviso não enviado:', e instanceof Error ? e.message : e))

  return res.status(204).send()
}
