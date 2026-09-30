import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'
import { calcularProximaManutencao, calcularStatus } from '../utils/manutencao'

const ativoSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional().nullable(),
  periodicidadeDias: z.number().int().positive('Periodicidade deve ser positiva.'),
})

const manutencaoSchema = z.object({
  data: z.string(),
  descricao: z.string().min(2),
  responsavel: z.string().min(2),
})

async function enriquecerAtivo(ativoId: string) {
  const ativo = await prisma.ativo.findUnique({
    where: { id: ativoId },
    include: { manutencoes: { orderBy: { data: 'desc' }, take: 1 } },
  })
  if (!ativo) return null

  const ultima = ativo.manutencoes[0] ?? null
  const proximaManutencao = ultima ? calcularProximaManutencao(ultima.data, ativo.periodicidadeDias) : null
  const status = calcularStatus(proximaManutencao)

  return { ...ativo, ultimaManutencao: ultima, proximaManutencao, status }
}

export async function listarAtivos(_req: Request, res: Response) {
  const ativos = await prisma.ativo.findMany({
    include: { manutencoes: { orderBy: { data: 'desc' }, take: 1 } },
    orderBy: { nome: 'asc' },
  })

  const enriquecidos = ativos.map((a) => {
    const ultima = a.manutencoes[0] ?? null
    const proximaManutencao = ultima ? calcularProximaManutencao(ultima.data, a.periodicidadeDias) : null
    const status = calcularStatus(proximaManutencao)
    return { ...a, ultimaManutencao: ultima, proximaManutencao, status }
  })

  return res.json(enriquecidos)
}

export async function obterAtivo(req: Request, res: Response) {
  const ativo = await enriquecerAtivo(req.params.id)
  if (!ativo) throw new AppError('Ativo não encontrado.', 404)

  const historico = await prisma.manutencao.findMany({
    where: { ativoId: req.params.id },
    orderBy: { data: 'desc' },
  })

  return res.json({ ...ativo, historico })
}

export async function criarAtivo(req: Request, res: Response) {
  const dados = ativoSchema.parse(req.body)
  const ativo = await prisma.ativo.create({ data: dados })
  return res.status(201).json(ativo)
}

export async function atualizarAtivo(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.ativo.findUnique({ where: { id } })
  if (!existente) throw new AppError('Ativo não encontrado.', 404)

  const dados = ativoSchema.parse(req.body)
  const ativo = await prisma.ativo.update({ where: { id }, data: dados })
  return res.json(ativo)
}

export async function removerAtivo(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.ativo.findUnique({ where: { id } })
  if (!existente) throw new AppError('Ativo não encontrado.', 404)

  await prisma.ativo.delete({ where: { id } })
  return res.status(204).send()
}

export async function registrarManutencao(req: Request, res: Response) {
  const { id: ativoId } = req.params
  const existente = await prisma.ativo.findUnique({ where: { id: ativoId } })
  if (!existente) throw new AppError('Ativo não encontrado.', 404)

  const dados = manutencaoSchema.parse(req.body)
  const manutencao = await prisma.manutencao.create({
    data: {
      ativoId,
      data: new Date(dados.data),
      descricao: dados.descricao,
      responsavel: dados.responsavel,
      realizadaPor: req.usuarioId,
    },
  })

  const ativoAtualizado = await enriquecerAtivo(ativoId)
  return res.status(201).json({ manutencao, ativo: ativoAtualizado })
}

export async function alertas(_req: Request, res: Response) {
  const ativos = await prisma.ativo.findMany({
    include: { manutencoes: { orderBy: { data: 'desc' }, take: 1 } },
  })

  const alertas = ativos
    .map((a) => {
      const ultima = a.manutencoes[0] ?? null
      const proximaManutencao = ultima ? calcularProximaManutencao(ultima.data, a.periodicidadeDias) : null
      const status = calcularStatus(proximaManutencao)
      return { ...a, ultimaManutencao: ultima, proximaManutencao, status }
    })
    .filter((a) => a.status === 'VENCIDO' || a.status === 'PROXIMO' || a.status === 'SEM_REGISTRO')
    .sort((a, b) => {
      const ordem = { VENCIDO: 0, SEM_REGISTRO: 1, PROXIMO: 2, EM_DIA: 3 }
      return ordem[a.status] - ordem[b.status]
    })

  return res.json(alertas)
}
