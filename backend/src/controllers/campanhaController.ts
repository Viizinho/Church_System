import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'
import { emitirAtualizacaoCampanha, registrarClienteSSE } from '../utils/campanhaEvents'
import { enumQuery, telefone, textoCurto, textoLongo, urlHttp } from '../utils/validacao'

const itemSchema = z.object({
  nome: textoCurto(2, 120),
  descricao: textoLongo(500),
  valorTotal: z.number().positive('Valor total deve ser positivo.').max(10_000_000),
  chavePix: z.string().trim().min(3).max(140),
  whatsappTesoureiro: telefone.pipe(z.string().min(8)),
  ativo: z.boolean().default(true),
  ordem: z.number().int().default(0),
})

const contribuicaoSchema = z.object({
  nomeContribuidor: textoCurto(2, 120),
  valor: z.number().positive('Valor deve ser positivo.').max(1_000_000),
  comprovanteUrl: urlHttp.optional().nullable(),
})

const recusarSchema = z.object({
  motivoRecusa: textoLongo(300),
})

const STATUS = ['PENDENTE', 'CONFIRMADO', 'RECUSADO'] as const

/** Totais confirmados de vários itens em UMA consulta (evita 1 consulta por item). */
async function somarArrecadadoPorItem(itemIds: string[]): Promise<Map<string, number>> {
  if (itemIds.length === 0) return new Map()
  const grupos = await prisma.contribuicao.groupBy({
    by: ['itemId'],
    where: { itemId: { in: itemIds }, status: 'CONFIRMADO' },
    _sum: { valor: true },
  })
  return new Map(grupos.map((g) => [g.itemId, Number(g._sum.valor ?? 0)]))
}

/** Limite de linhas por listagem administrativa (o histórico é paginado por data, mais recente primeiro). */
const LIMITE_LISTAGEM = 500

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

  const totais = await somarArrecadadoPorItem(itens.map((i) => i.id))
  return res.json(itens.map((item) => ({ ...item, valorArrecadado: totais.get(item.id) ?? 0 })))
}

export async function obterItem(req: Request, res: Response) {
  const item = await prisma.itemCampanha.findUnique({
    where: { id: req.params.id },
    include: { contribuicoes: { orderBy: { criadoEm: 'desc' } } },
  })
  if (!item) throw new AppError('Item não encontrado.', 404)

  return res.json({ ...item, valorArrecadado: await somarArrecadado(item.id) })
}

// Server-Sent Events: o front assina esse endpoint e recebe o novo total
// toda vez que uma contribuição é confirmada, sem precisar recarregar a página.
export function eventosCampanha(req: Request, res: Response) {
  const remover = registrarClienteSSE(res)
  if (!remover) return res.status(503).json({ error: 'Muitos acessos ao vivo no momento. Atualize a página mais tarde.' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Nginx: não armazenar o stream em buffer
  res.flushHeaders()
  req.on('close', remover)
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
    take: LIMITE_LISTAGEM,
  })
  return res.json(pendentes)
}

export async function listarContribuicoes(req: Request, res: Response) {
  if (req.query.status && !enumQuery(req.query.status, STATUS)) throw new AppError('Status inválido.')
  const status = enumQuery(req.query.status, STATUS)

  const contribuicoes = await prisma.contribuicao.findMany({
    where: status ? { status } : {},
    include: { item: { select: { id: true, nome: true } } },
    orderBy: { criadoEm: 'desc' },
    take: LIMITE_LISTAGEM,
  })
  return res.json(contribuicoes)
}

export async function criarContribuicao(req: Request, res: Response) {
  const { itemId } = req.params
  const item = await prisma.itemCampanha.findUnique({ where: { id: itemId } })
  if (!item || !item.ativo) throw new AppError('Item não encontrado ou inativo.', 404)

  const dados = contribuicaoSchema.parse(req.body)
  const contrib = await prisma.contribuicao.create({ data: { ...dados, itemId, valor: dados.valor } })
  return res.status(201).json(contrib)
}

export async function confirmarContribuicao(req: Request, res: Response) {
  const { id } = req.params
  const contrib = await prisma.contribuicao.findUnique({ where: { id } })
  if (!contrib) throw new AppError('Contribuição não encontrada.', 404)

  // Condição no próprio UPDATE: se dois administradores clicarem ao mesmo tempo, só um vence.
  const { count } = await prisma.contribuicao.updateMany({
    where: { id, status: 'PENDENTE' },
    data: { status: 'CONFIRMADO', confirmadoPor: req.usuarioId, confirmadoEm: new Date() },
  })
  if (count === 0) throw new AppError('Contribuição já processada.', 409)

  const atualizada = await prisma.contribuicao.findUniqueOrThrow({ where: { id } })
  emitirAtualizacaoCampanha(atualizada.itemId, await somarArrecadado(atualizada.itemId))
  return res.json(atualizada)
}

export async function recusarContribuicao(req: Request, res: Response) {
  const { id } = req.params
  const { motivoRecusa } = recusarSchema.parse(req.body ?? {})

  const contrib = await prisma.contribuicao.findUnique({ where: { id } })
  if (!contrib) throw new AppError('Contribuição não encontrada.', 404)

  const { count } = await prisma.contribuicao.updateMany({
    where: { id, status: 'PENDENTE' },
    data: { status: 'RECUSADO', motivoRecusa, confirmadoPor: req.usuarioId, confirmadoEm: new Date() },
  })
  if (count === 0) throw new AppError('Contribuição já processada.', 409)

  return res.json(await prisma.contribuicao.findUniqueOrThrow({ where: { id } }))
}
