import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'

const itemSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional().nullable(),
  valorTotal: z.number().positive('Valor total deve ser positivo.'),
  chavePix: z.string().min(3),
  whatsappTesoureiro: z.string().min(8),
  ativo: z.boolean().default(true),
  ordem: z.number().int().default(0),
})

const contribuicaoSchema = z.object({
  nomeContribuidor: z.string().min(2),
  valor: z.number().positive('Valor deve ser positivo.'),
  comprovanteUrl: z.string().url().optional().nullable(),
})

const confirmarSchema = z.object({
  motivoRecusa: z.string().optional().nullable(),
})

async function somarArrecadado(itemId: string): Promise<number> {
  const result = await prisma.contribuicao.aggregate({
    where: { itemId, status: 'CONFIRMADO' },
    _sum: { valor: true },
  })
  return Number(result._sum.valor ?? 0)
}

export async function listarItens(_req: Request, res: Response) {
  const itens = await prisma.itemCampanha.findMany({
    where: { ativo: true },
    orderBy: { ordem: 'asc' },
    include: { _count: { select: { contribuicoes: true } } },
  })

  const comValor = await Promise.all(
    itens.map(async (item) => ({
      ...item,
      valorArrecadado: await somarArrecadado(item.id),
    }))
  )

  return res.json(comValor)
}

export async function obterItem(req: Request, res: Response) {
  const item = await prisma.itemCampanha.findUnique({
    where: { id: req.params.id },
    include: { contribuicoes: { orderBy: { criadoEm: 'desc' } } },
  })
  if (!item) throw new AppError('Item não encontrado.', 404)

  return res.json({ ...item, valorArrecadado: await somarArrecadado(item.id) })
}

export async function criarItem(req: Request, res: Response) {
  const dados = itemSchema.parse(req.body)
  const item = await prisma.itemCampanha.create({ data: { ...dados, valorTotal: dados.valorTotal } })
  return res.status(201).json(item)
}

export async function atualizarItem(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.itemCampanha.findUnique({ where: { id } })
  if (!existente) throw new AppError('Item não encontrado.', 404)

  const dados = itemSchema.parse(req.body)
  const item = await prisma.itemCampanha.update({ where: { id }, data: dados })
  return res.json(item)
}

export async function removerItem(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.itemCampanha.findUnique({ where: { id } })
  if (!existente) throw new AppError('Item não encontrado.', 404)

  await prisma.itemCampanha.delete({ where: { id } })
  return res.status(204).send()
}

// ─── Contribuições ────────────────────────────────────────────────────────────

export async function listarPendentes(_req: Request, res: Response) {
  const pendentes = await prisma.contribuicao.findMany({
    where: { status: 'PENDENTE' },
    include: { item: { select: { id: true, nome: true } } },
    orderBy: { criadoEm: 'asc' },
  })
  return res.json(pendentes)
}

export async function criarContribuicao(req: Request, res: Response) {
  const { itemId } = req.params
  const item = await prisma.itemCampanha.findUnique({ where: { id: itemId } })
  if (!item || !item.ativo) throw new AppError('Item não encontrado ou inativo.', 404)

  const dados = contribuicaoSchema.parse(req.body)
  const contrib = await prisma.contribuicao.create({
    data: { ...dados, itemId, valor: dados.valor },
  })
  return res.status(201).json(contrib)
}

export async function confirmarContribuicao(req: Request, res: Response) {
  const { id } = req.params
  const contrib = await prisma.contribuicao.findUnique({ where: { id } })
  if (!contrib) throw new AppError('Contribuição não encontrada.', 404)
  if (contrib.status !== 'PENDENTE') throw new AppError('Contribuição já processada.')

  const atualizada = await prisma.contribuicao.update({
    where: { id },
    data: { status: 'CONFIRMADO' },
  })
  return res.json(atualizada)
}

export async function recusarContribuicao(req: Request, res: Response) {
  const { id } = req.params
  const { motivoRecusa } = confirmarSchema.parse(req.body)

  const contrib = await prisma.contribuicao.findUnique({ where: { id } })
  if (!contrib) throw new AppError('Contribuição não encontrada.', 404)
  if (contrib.status !== 'PENDENTE') throw new AppError('Contribuição já processada.')

  const atualizada = await prisma.contribuicao.update({
    where: { id },
    data: { status: 'RECUSADO', motivoRecusa: motivoRecusa ?? null },
  })
  return res.json(atualizada)
}
