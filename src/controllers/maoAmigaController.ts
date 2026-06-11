import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'

const doacaoSchema = z.object({
  membroId: z.string().uuid().optional().nullable(),
  nomeDoador: z.string().optional().nullable(),
  data: z.string(),
  itemDoado: z.string().min(2),
  quantidade: z.string().min(1),
  tipo: z.enum(['FISICA', 'PIX']),
  comprovanteUrl: z.string().url().optional().nullable(),
})

const pixPublicoSchema = z.object({
  nomeDoador: z.string().min(2),
  comprovanteUrl: z.string().url().optional().nullable(),
})

export async function listar(req: Request, res: Response) {
  const { status, tipo } = req.query

  const doacoes = await prisma.doacaoAlimento.findMany({
    where: {
      ...(status ? { status: status as 'PENDENTE' | 'CONFIRMADO' | 'RECUSADO' } : {}),
      ...(tipo ? { tipo: tipo as 'FISICA' | 'PIX' } : {}),
    },
    include: { membro: { select: { id: true, nomeCompleto: true } } },
    orderBy: { data: 'desc' },
  })

  return res.json(doacoes)
}

export async function listarPendentes(_req: Request, res: Response) {
  const pendentes = await prisma.doacaoAlimento.findMany({
    where: { status: 'PENDENTE' },
    include: { membro: { select: { id: true, nomeCompleto: true } } },
    orderBy: { criadoEm: 'asc' },
  })
  return res.json(pendentes)
}

export async function registrar(req: Request, res: Response) {
  const dados = doacaoSchema.parse(req.body)

  if (!dados.membroId && !dados.nomeDoador) {
    throw new AppError('Informe o membro ou o nome do doador.')
  }

  if (dados.membroId) {
    const membro = await prisma.membro.findUnique({ where: { id: dados.membroId } })
    if (!membro) throw new AppError('Membro não encontrado.', 404)
  }

  const doacao = await prisma.doacaoAlimento.create({
    data: { ...dados, data: new Date(dados.data), status: 'CONFIRMADO' },
    include: { membro: { select: { id: true, nomeCompleto: true } } },
  })

  return res.status(201).json(doacao)
}

export async function registrarPixPublico(req: Request, res: Response) {
  const dados = pixPublicoSchema.parse(req.body)

  const doacao = await prisma.doacaoAlimento.create({
    data: {
      nomeDoador: dados.nomeDoador,
      data: new Date(),
      itemDoado: 'Pix — compra de alimentos',
      quantidade: '—',
      tipo: 'PIX',
      comprovanteUrl: dados.comprovanteUrl ?? null,
      status: 'PENDENTE',
    },
  })

  return res.status(201).json(doacao)
}

export async function confirmar(req: Request, res: Response) {
  const { id } = req.params
  const doacao = await prisma.doacaoAlimento.findUnique({ where: { id } })
  if (!doacao) throw new AppError('Doação não encontrada.', 404)
  if (doacao.status !== 'PENDENTE') throw new AppError('Doação já processada.')

  const atualizada = await prisma.doacaoAlimento.update({
    where: { id },
    data: { status: 'CONFIRMADO' },
  })
  return res.json(atualizada)
}

export async function recusar(req: Request, res: Response) {
  const { id } = req.params
  const doacao = await prisma.doacaoAlimento.findUnique({ where: { id } })
  if (!doacao) throw new AppError('Doação não encontrada.', 404)
  if (doacao.status !== 'PENDENTE') throw new AppError('Doação já processada.')

  const atualizada = await prisma.doacaoAlimento.update({
    where: { id },
    data: { status: 'RECUSADO' },
  })
  return res.json(atualizada)
}
