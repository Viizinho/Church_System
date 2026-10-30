import { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'
import { gerarOcorrencias, intervaloDaRegra, FUSO_PADRAO_MINUTOS, LIMITE_OCORRENCIAS, RegraRecorrencia } from '../utils/recorrencia'

const regraRecorrenciaSchema = z.object({
  diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
  intervalo: z.number().int().min(1).max(365).optional(),
  unidade: z.literal('DIAS').optional(),
  mensalPor: z.enum(['DIA_DO_MES', 'DIA_DA_SEMANA']).optional(),
  semanaDoMes: z.number().int().refine((n) => [1, 2, 3, 4, -1].includes(n)).optional(),
  diaSemanaMes: z.number().int().min(0).max(6).optional(),
  intervaloSemanas: z.number().int().min(1).max(52).optional(),
  criterioParada: z.union([
    z.object({ tipo: z.literal('DATA'), valor: z.string() }),
    z.object({ tipo: z.literal('OCORRENCIAS'), valor: z.number().int().min(1).max(LIMITE_OCORRENCIAS) }),
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
  /** Date#getTimezoneOffset() do navegador — para calcular dias/horários no fuso do usuário. */
  fusoMinutos: z.number().int().min(-840).max(840).default(FUSO_PADRAO_MINUTOS),
})

const escopoSchema = z.enum(['ocorrencia', 'serie']).optional()

type DadosEvento = z.infer<typeof eventoSchema>

function frequenciaDe(recorrencia: string, regra: RegraRecorrencia) {
  if (recorrencia === 'MENSAL') return 'MENSAL' as const
  return regra.unidade === 'DIAS' ? ('DIARIA' as const) : ('SEMANAL' as const)
}

/** Datas da série conforme o tipo de repetição escolhido (vazio = evento único). */
function datasDaSerie(d: DadosEvento): Date[] {
  const inicio = new Date(d.inicio)
  if (d.recorrencia === 'NENHUMA') return [inicio]
  if (!d.regraRecorrencia) throw new AppError('Informe como o evento se repete.')
  const regra = d.regraRecorrencia as RegraRecorrencia
  const frequencia = frequenciaDe(d.recorrencia, regra)
  if (frequencia === 'SEMANAL' && !regra.diasSemana?.length) {
    throw new AppError('Escolha ao menos um dia da semana.')
  }
  if (regra.criterioParada.tipo === 'DATA' && Date.parse(regra.criterioParada.valor.slice(0, 10)) < Date.parse(d.inicio.slice(0, 10)) - 86_400_000) {
    throw new AppError('A data final deve ser depois do início.')
  }
  const datas = gerarOcorrencias(inicio, frequencia, regra, d.fusoMinutos)
  if (datas.length === 0) throw new AppError('Com essa regra nenhuma data é gerada. Revise os dias e o fim da repetição.')
  return datas
}

/** Regra que fica gravada no evento “pai” da série. */
function regraParaSalvar(d: DadosEvento) {
  if (d.recorrencia === 'NENHUMA' || !d.regraRecorrencia) return undefined
  const r = d.regraRecorrencia as RegraRecorrencia
  const base = { intervalo: intervaloDaRegra(r), criterioParada: r.criterioParada }
  const frequencia = frequenciaDe(d.recorrencia, r)
  if (frequencia === 'DIARIA') return { unidade: 'DIAS', ...base }
  if (frequencia === 'SEMANAL') return { diasSemana: [...new Set(r.diasSemana ?? [])].sort((a, b) => a - b), ...base }
  if (r.mensalPor === 'DIA_DA_SEMANA') {
    const inicio = new Date(d.inicio)
    const parede = new Date(inicio.getTime() - d.fusoMinutos * 60_000)
    return {
      mensalPor: 'DIA_DA_SEMANA',
      semanaDoMes: r.semanaDoMes ?? Math.ceil(parede.getUTCDate() / 7),
      diaSemanaMes: r.diaSemanaMes ?? parede.getUTCDay(),
      ...base,
    }
  }
  return base
}

type EventoComPai = {
  id: string
  eventoPaiId: string | null
  recorrencia: string
  regraRecorrencia: unknown
  eventoPai?: { regraRecorrencia: unknown; recorrencia: string } | null
}

/** Acrescenta a que série o evento pertence e qual é a regra dela. */
function comSerie<T extends EventoComPai>(e: T) {
  const { eventoPai, ...resto } = e
  return {
    ...resto,
    serieId: e.eventoPaiId ?? (e.recorrencia !== 'NENHUMA' ? e.id : null),
    recorrenciaSerie: eventoPai?.recorrencia ?? e.recorrencia,
    regraSerie: eventoPai?.regraRecorrencia ?? e.regraRecorrencia ?? null,
  }
}

const incluirPai = { eventoPai: { select: { recorrencia: true, regraRecorrencia: true } } }


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
    include: incluirPai,
  })

  return res.json(eventos.map(comSerie))
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
  const evento = await prisma.evento.findUnique({ where: { id: req.params.id }, include: incluirPai })
  if (!evento) throw new AppError('Evento não encontrado.', 404)
  return res.json(comSerie(evento))
}

/** Mostra as datas que a regra vai gerar, sem gravar nada (prévia do formulário). */
export async function previa(req: Request, res: Response) {
  const dados = eventoSchema.parse(req.body)
  const datas = datasDaSerie(dados)
  return res.json({ total: datas.length, datas: datas.map((d) => d.toISOString()) })
}

export async function criar(req: Request, res: Response) {
  const dados = eventoSchema.parse(req.body)
  const datas = datasDaSerie(dados)
  const comuns = { nome: dados.nome, descricao: dados.descricao, local: dados.local, tipo: dados.tipo }

  const evento = await prisma.$transaction(async (tx) => {
    // O primeiro evento da série é o “pai”; é ele que guarda a regra.
    const pai = await tx.evento.create({
      data: {
        ...comuns,
        inicio: datas[0],
        recorrencia: dados.recorrencia,
        regraRecorrencia: regraParaSalvar(dados),
      },
    })
    if (datas.length > 1) {
      await tx.evento.createMany({
        data: datas.slice(1).map((inicio) => ({
          ...comuns,
          inicio,
          recorrencia: dados.recorrencia,
          eventoPaiId: pai.id,
        })),
      })
    }
    return pai
  })

  return res.status(201).json({ ...evento, totalOcorrencias: datas.length })
}

/**
 * Edição.
 *  - Evento único ou “pai” da série: altera a série inteira e gera as datas de novo.
 *  - Ocorrência de uma série: `?escopo=ocorrencia` (padrão) muda só aquele dia;
 *    `?escopo=serie` aplica nome, local, tipo, descrição e horário a todas.
 */
export async function atualizar(req: Request, res: Response) {
  const { id } = req.params
  const escopo = escopoSchema.parse(req.query.escopo) ?? 'ocorrencia'
  const existente = await prisma.evento.findUnique({ where: { id } })
  if (!existente) throw new AppError('Evento não encontrado.', 404)

  const dados = eventoSchema.parse(req.body)
  const comuns = { nome: dados.nome, descricao: dados.descricao, local: dados.local, tipo: dados.tipo }

  // Ocorrência (filha)
  if (existente.eventoPaiId) {
    if (escopo === 'ocorrencia') {
      const evento = await prisma.evento.update({ where: { id }, data: { ...comuns, inicio: new Date(dados.inicio) } })
      return res.json(evento)
    }
    // toda a série: copia campos e desloca o horário, mantendo cada dia
    const horarioParede = (d: Date) => (((d.getTime() - dados.fusoMinutos * 60_000) % 86_400_000) + 86_400_000) % 86_400_000
    const deltaMs = horarioParede(new Date(dados.inicio)) - horarioParede(existente.inicio)
    const serie = await prisma.evento.findMany({
      where: { OR: [{ id: existente.eventoPaiId }, { eventoPaiId: existente.eventoPaiId }] },
    })
    await prisma.$transaction(
      serie.map((o) =>
        prisma.evento.update({ where: { id: o.id }, data: { ...comuns, inicio: new Date(o.inicio.getTime() + deltaMs) } })
      )
    )
    return res.json(await prisma.evento.findUnique({ where: { id } }))
  }

  // Evento único ou pai: regenera a série
  const datas = datasDaSerie(dados)
  const evento = await prisma.$transaction(async (tx) => {
    await tx.evento.deleteMany({ where: { eventoPaiId: id } })
    const atualizado = await tx.evento.update({
      where: { id },
      data: {
        ...comuns,
        inicio: datas[0],
        recorrencia: dados.recorrencia,
        regraRecorrencia: regraParaSalvar(dados) ?? Prisma.DbNull,
      },
    })
    if (datas.length > 1) {
      await tx.evento.createMany({
        data: datas.slice(1).map((inicio) => ({ ...comuns, inicio, recorrencia: dados.recorrencia, eventoPaiId: id })),
      })
    }
    return atualizado
  })
  return res.json({ ...evento, totalOcorrencias: datas.length })
}

/**
 * Exclusão. Em uma ocorrência, `?escopo=ocorrencia` (padrão) remove só aquele dia e
 * `?escopo=serie` remove a série inteira. No “pai” sempre remove a série (cascata).
 */
export async function remover(req: Request, res: Response) {
  const { id } = req.params
  const escopo = escopoSchema.parse(req.query.escopo) ?? 'ocorrencia'
  const existente = await prisma.evento.findUnique({ where: { id } })
  if (!existente) throw new AppError('Evento não encontrado.', 404)

  const alvo = existente.eventoPaiId && escopo === 'serie' ? existente.eventoPaiId : id
  await prisma.evento.delete({ where: { id: alvo } }) // filhas saem junto (onDelete: Cascade)
  return res.status(204).send()
}
