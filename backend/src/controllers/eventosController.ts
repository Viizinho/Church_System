import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'
import { gerarOcorrencias, RegraRecorrencia } from '../utils/recorrencia'

const regraRecorrenciaSchema = z.object({
  diasSemana: z.array(z.number().int().min(0).max(6)).min(1),
  intervaloSemanas: z.number().int().min(1).default(1),
  criterioParada: z.union([
    z.object({ tipo: z.literal('DATA'), valor: z.string() }),
    z.object({ tipo: z.literal('OCORRENCIAS'), valor: z.number().int().positive() }),
  ]),
})

const eventoSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional().nullable(),
  local: z.string().optional().nullable(),
  inicio: z.string().datetime({ message: 'Data/hora inválida. Use formato ISO 8601.' }),
  tipo: z.enum(['CULTO', 'REUNIAO', 'ESPECIAL']),
  recorrencia: z.enum(['NENHUMA', 'SEMANAL', 'MENSAL', 'PERSONALIZADA']).default('NENHUMA'),
  regraRecorrencia: regraRecorrenciaSchema.optional().nullable(),
})

export async function listar(req: Request, res: Response) {
  const { mes, ano } = req.query

  const now = new Date()
  const y = ano ? Number(ano) : now.getFullYear()
  const m = mes ? Number(mes) - 1 : now.getMonth()

  const inicio = new Date(y, m, 1)
  const fim = new Date(y, m + 1, 0, 23, 59, 59)

  const eventos = await prisma.evento.findMany({
    where: { inicio: { gte: inicio, lte: fim } },
    orderBy: { inicio: 'asc' },
  })

  return res.json(eventos)
}

export async function proximosSete(_req: Request, res: Response) {
  const hoje = new Date()
  const em7dias = new Date()
  em7dias.setDate(em7dias.getDate() + 7)

  const eventos = await prisma.evento.findMany({
    where: { inicio: { gte: hoje, lte: em7dias } },
    orderBy: { inicio: 'asc' },
    take: 10,
  })
  return res.json(eventos)
}

export async function obter(req: Request, res: Response) {
  const evento = await prisma.evento.findUnique({ where: { id: req.params.id } })
  if (!evento) throw new AppError('Evento não encontrado.', 404)
  return res.json(evento)
}

export async function criar(req: Request, res: Response) {
  const dados = eventoSchema.parse(req.body)

  if (dados.recorrencia === 'PERSONALIZADA' && !dados.regraRecorrencia) {
    throw new AppError('Informe a regra de recorrência personalizada.')
  }

  const evento = await prisma.evento.create({
    data: {
      nome: dados.nome,
      descricao: dados.descricao,
      local: dados.local,
      inicio: new Date(dados.inicio),
      tipo: dados.tipo,
      recorrencia: dados.recorrencia,
      regraRecorrencia: dados.regraRecorrencia ?? undefined,
    },
  })

  // Gera as ocorrências filhas físicas de acordo com a regra personalizada,
  // igual às listagens já feitas (nada de calcular recorrência em tempo real).
  if (dados.recorrencia === 'PERSONALIZADA' && dados.regraRecorrencia) {
    const datas = gerarOcorrencias(new Date(dados.inicio), dados.regraRecorrencia as RegraRecorrencia)
    // a primeira data já é o próprio evento criado; gera as demais como filhas
    const demais = datas.filter((d) => d.getTime() !== new Date(dados.inicio).getTime())

    if (demais.length > 0) {
      await prisma.evento.createMany({
        data: demais.map((data) => ({
          nome: dados.nome,
          descricao: dados.descricao,
          local: dados.local,
          inicio: data,
          tipo: dados.tipo,
          recorrencia: 'PERSONALIZADA' as const,
          eventoPaiId: evento.id,
        })),
      })
    }
  }

  return res.status(201).json(evento)
}

export async function atualizar(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.evento.findUnique({ where: { id } })
  if (!existente) throw new AppError('Evento não encontrado.', 404)

  const dados = eventoSchema.parse(req.body)
  const evento = await prisma.evento.update({
    where: { id },
    data: {
      nome: dados.nome,
      descricao: dados.descricao,
      local: dados.local,
      inicio: new Date(dados.inicio),
      tipo: dados.tipo,
      recorrencia: dados.recorrencia,
      regraRecorrencia: dados.regraRecorrencia ?? undefined,
    },
  })
  return res.json(evento)
}

export async function remover(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.evento.findUnique({ where: { id } })
  if (!existente) throw new AppError('Evento não encontrado.', 404)

  // remove também as ocorrências filhas geradas (onDelete: Cascade no schema cuida disso,
  // mas deixamos explícito o comportamento esperado aqui para clareza)
  await prisma.evento.delete({ where: { id } })
  return res.status(204).send()
}
