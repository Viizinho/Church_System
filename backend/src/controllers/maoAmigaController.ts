import { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'
import { enumQuery, textoCurto, textoLongo, urlHttp } from '../utils/validacao'

const doacaoSchema = z.object({
  membroId: z.string().uuid().optional().nullable(),
  nomeDoador: textoLongo(120),
  data: z.string().refine((d) => !Number.isNaN(Date.parse(d)), 'Data inválida.'),
  itemDoado: textoCurto(2, 120),
  quantidade: z.string().trim().min(1).max(60),
  quantidadeNumerica: z.number().positive().max(100_000).optional().nullable(),
  metaCestaId: z.string().uuid().optional().nullable(),
  tipo: z.enum(['FISICA', 'PIX']),
  comprovanteUrl: urlHttp.optional().nullable(),
})

const pixPublicoSchema = z.object({
  nomeDoador: textoCurto(2, 120),
  valor: z.number().positive('Valor deve ser positivo.').max(100000).optional().nullable(),
  comprovanteUrl: urlHttp.optional().nullable(),
})

const doacaoPublicaSchema = z.object({
  nomeDoador: textoCurto(2, 120),
  itens: z
    .array(
      z.object({
        metaCestaId: z.string().uuid(),
        quantidade: z.number().positive('Quantidade deve ser positiva.').max(10_000),
      })
    )
    .min(1, 'Escolha ao menos um item.')
    .max(20),
})

const recusarSchema = z.object({
  motivoRecusa: textoLongo(300),
})

const STATUS = ['PENDENTE', 'CONFIRMADO', 'RECUSADO'] as const
const TIPOS = ['FISICA', 'PIX'] as const
const LIMITE_LISTAGEM = 500

const metaCestaSchema = z.object({
  nomeItem: textoCurto(2, 80),
  unidade: textoCurto(1, 12).default('kg'),
  quantidadeNecessaria: z.number().positive().max(1_000_000),
  ativo: z.boolean().default(true),
})

async function calcularArrecadado(metaCestaId: string): Promise<number> {
  const result = await prisma.doacaoAlimento.aggregate({
    where: { metaCestaId, status: 'CONFIRMADO' },
    _sum: { quantidadeNumerica: true },
  })
  return Number(result._sum.quantidadeNumerica ?? 0)
}

/** Totais confirmados e pendentes de todas as metas em UMA consulta. */
export async function totaisPorMeta(metaIds: string[]) {
  const confirmado = new Map<string, number>()
  const pendente = new Map<string, number>()
  if (metaIds.length === 0) return { confirmado, pendente }
  const grupos = await prisma.doacaoAlimento.groupBy({
    by: ['metaCestaId', 'status'],
    where: { metaCestaId: { in: metaIds }, status: { in: ['CONFIRMADO', 'PENDENTE'] } },
    _sum: { quantidadeNumerica: true },
  })
  for (const g of grupos) {
    if (!g.metaCestaId) continue
    ;(g.status === 'CONFIRMADO' ? confirmado : pendente).set(g.metaCestaId, Number(g._sum.quantidadeNumerica ?? 0))
  }
  return { confirmado, pendente }
}

// ─── Metas da Cesta (necessidades a cobrir) ───────────────────────────────────

export async function listarMetas(_req: Request, res: Response) {
  const metas = await prisma.metaCesta.findMany({ where: { ativo: true }, orderBy: { nomeItem: 'asc' } })

  const { confirmado } = await totaisPorMeta(metas.map((m) => m.id))
  return res.json(
    metas.map((meta) => {
      const arrecadado = confirmado.get(meta.id) ?? 0
      const restante = Math.max(Number(meta.quantidadeNecessaria) - arrecadado, 0)
      return { ...meta, arrecadado, restante, completo: restante <= 0 }
    })
  )
}

export async function criarMeta(req: Request, res: Response) {
  const dados = metaCestaSchema.parse(req.body)
  const meta = await prisma.metaCesta.create({ data: dados })
  return res.status(201).json(meta)
}

export async function atualizarMeta(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.metaCesta.findUnique({ where: { id } })
  if (!existente) throw new AppError('Meta não encontrada.', 404)

  const dados = metaCestaSchema.parse(req.body)
  const meta = await prisma.metaCesta.update({ where: { id }, data: dados })
  return res.json(meta)
}

export async function removerMeta(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.metaCesta.findUnique({ where: { id } })
  if (!existente) throw new AppError('Meta não encontrada.', 404)

  await prisma.metaCesta.delete({ where: { id } })
  return res.status(204).send()
}

// ─── Doações ───────────────────────────────────────────────────────────────

export async function listar(req: Request, res: Response) {
  if (req.query.status && !enumQuery(req.query.status, STATUS)) throw new AppError('Status inválido.')
  if (req.query.tipo && !enumQuery(req.query.tipo, TIPOS)) throw new AppError('Tipo inválido.')
  const status = enumQuery(req.query.status, STATUS)
  const tipo = enumQuery(req.query.tipo, TIPOS)

  const doacoes = await prisma.doacaoAlimento.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(tipo ? { tipo } : {}),
    },
    include: {
      membro: { select: { id: true, nomeCompleto: true } },
      metaCesta: { select: { id: true, nomeItem: true } },
    },
    orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
    take: LIMITE_LISTAGEM,
  })

  return res.json(doacoes)
}

export async function listarPendentes(_req: Request, res: Response) {
  const pendentes = await prisma.doacaoAlimento.findMany({
    where: { status: 'PENDENTE' },
    include: { membro: { select: { id: true, nomeCompleto: true } } },
    orderBy: { criadoEm: 'asc' },
    take: LIMITE_LISTAGEM,
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

  // Baixa dinâmica: se vinculado a uma meta, impede doar além do que ainda falta,
  // direcionando a doação para os itens que realmente precisam.
  if (dados.metaCestaId && dados.quantidadeNumerica) {
    const meta = await prisma.metaCesta.findUnique({ where: { id: dados.metaCestaId } })
    if (!meta || !meta.ativo) throw new AppError('Item da cesta não encontrado ou inativo.', 404)

    const arrecadado = await calcularArrecadado(meta.id)
    const restante = Number(meta.quantidadeNecessaria) - arrecadado
    if (restante <= 0) {
      throw new AppError(`A meta de "${meta.nomeItem}" já foi atingida. Escolha outro item.`)
    }
    if (dados.quantidadeNumerica > restante) {
      throw new AppError(
        `Só restam ${restante} ${meta.unidade} de "${meta.nomeItem}". Ajuste a quantidade.`
      )
    }
  }

  const doacao = await prisma.doacaoAlimento.create({
    data: { ...dados, data: new Date(dados.data), status: 'CONFIRMADO' },
    include: { membro: { select: { id: true, nomeCompleto: true } }, metaCesta: true },
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
      quantidade: dados.valor ? `R$ ${dados.valor.toFixed(2).replace('.', ',')}` : '—',
      tipo: 'PIX',
      comprovanteUrl: dados.comprovanteUrl ?? null,
      status: 'PENDENTE',
    },
  })

  return res.status(201).json(doacao)
}

/**
 * Doação de alimentos feita pelo visitante na página pública: ele escolhe os
 * itens e as quantidades; cada item vira uma doação PENDENTE (aguarda conferência
 * do administrador). Pendentes contam como "reservado" para evitar que várias
 * pessoas doem o mesmo item além do necessário.
 */
export async function registrarDoacaoPublica(req: Request, res: Response) {
  const dados = doacaoPublicaSchema.parse(req.body)

  const ids = dados.itens.map((i) => i.metaCestaId)
  if (new Set(ids).size !== ids.length) throw new AppError('Item repetido na doação.')

  // Serializable: duas pessoas doando o último item ao mesmo tempo não ultrapassam a meta
  // (a segunda transação falha com P2034 e o handler responde 409 "tente novamente").
  const doacoes = await prisma.$transaction(
    async (tx) => {
      const criadas = []
      for (const item of dados.itens) {
        const meta = await tx.metaCesta.findUnique({ where: { id: item.metaCestaId } })
        if (!meta || !meta.ativo) throw new AppError('Item da cesta não encontrado.', 404)

        const soma = await tx.doacaoAlimento.groupBy({
          by: ['status'],
          where: { metaCestaId: meta.id, status: { in: ['CONFIRMADO', 'PENDENTE'] } },
          _sum: { quantidadeNumerica: true },
        })
        const usado = soma.reduce((acc, g) => acc + Number(g._sum.quantidadeNumerica ?? 0), 0)
        const disponivel = Number(meta.quantidadeNecessaria) - usado

        if (disponivel <= 0) {
          throw new AppError(`A meta de "${meta.nomeItem}" já foi atingida. Escolha outro item.`)
        }
        if (item.quantidade > disponivel) {
          throw new AppError(`Só faltam ${disponivel} ${meta.unidade} de "${meta.nomeItem}". Ajuste a quantidade.`)
        }

        criadas.push(
          await tx.doacaoAlimento.create({
            data: {
              nomeDoador: dados.nomeDoador,
              data: new Date(),
              itemDoado: meta.nomeItem,
              quantidade: `${item.quantidade} ${meta.unidade}`,
              quantidadeNumerica: item.quantidade,
              metaCestaId: meta.id,
              tipo: 'FISICA',
              status: 'PENDENTE',
            },
          })
        )
      }
      return criadas
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
  return res.status(201).json(doacoes)
}

export async function confirmar(req: Request, res: Response) {
  const { id } = req.params
  const doacao = await prisma.doacaoAlimento.findUnique({ where: { id } })
  if (!doacao) throw new AppError('Doação não encontrada.', 404)

  const { count } = await prisma.doacaoAlimento.updateMany({
    where: { id, status: 'PENDENTE' },
    data: { status: 'CONFIRMADO', confirmadoPor: req.usuarioId, confirmadoEm: new Date() },
  })
  if (count === 0) throw new AppError('Doação já processada.', 409)
  return res.json(await prisma.doacaoAlimento.findUniqueOrThrow({ where: { id } }))
}

export async function recusar(req: Request, res: Response) {
  const { id } = req.params
  const { motivoRecusa } = recusarSchema.parse(req.body ?? {})
  const doacao = await prisma.doacaoAlimento.findUnique({ where: { id } })
  if (!doacao) throw new AppError('Doação não encontrada.', 404)

  const { count } = await prisma.doacaoAlimento.updateMany({
    where: { id, status: 'PENDENTE' },
    data: { status: 'RECUSADO', motivoRecusa, confirmadoPor: req.usuarioId, confirmadoEm: new Date() },
  })
  if (count === 0) throw new AppError('Doação já processada.', 409)
  return res.json(await prisma.doacaoAlimento.findUniqueOrThrow({ where: { id } }))
}
