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
  quantidadeNumerica: z.number().positive().optional().nullable(),
  metaCestaId: z.string().uuid().optional().nullable(),
  tipo: z.enum(['FISICA', 'PIX']),
  comprovanteUrl: z.string().url().optional().nullable(),
})

const pixPublicoSchema = z.object({
  nomeDoador: z.string().trim().min(2, 'Informe seu nome.'),
  valor: z.number().positive('Valor deve ser positivo.').max(100000).optional().nullable(),
  comprovanteUrl: z.string().url().optional().nullable(),
})

const doacaoPublicaSchema = z.object({
  nomeDoador: z.string().trim().min(2, 'Informe seu nome.'),
  itens: z
    .array(
      z.object({
        metaCestaId: z.string().uuid(),
        quantidade: z.number().positive('Quantidade deve ser positiva.'),
      })
    )
    .min(1, 'Escolha ao menos um item.')
    .max(20),
})

const recusarSchema = z.object({
  motivoRecusa: z.string().optional().nullable(),
})

const metaCestaSchema = z.object({
  nomeItem: z.string().min(2),
  unidade: z.string().min(1).default('kg'),
  quantidadeNecessaria: z.number().positive(),
  ativo: z.boolean().default(true),
})

async function calcularArrecadado(metaCestaId: string): Promise<number> {
  const result = await prisma.doacaoAlimento.aggregate({
    where: { metaCestaId, status: 'CONFIRMADO' },
    _sum: { quantidadeNumerica: true },
  })
  return Number(result._sum.quantidadeNumerica ?? 0)
}

/** Quantidade já prometida por doações que ainda aguardam confirmação. */
async function calcularReservado(metaCestaId: string): Promise<number> {
  const result = await prisma.doacaoAlimento.aggregate({
    where: { metaCestaId, status: 'PENDENTE' },
    _sum: { quantidadeNumerica: true },
  })
  return Number(result._sum.quantidadeNumerica ?? 0)
}

// ─── Metas da Cesta (necessidades a cobrir) ───────────────────────────────────

export async function listarMetas(_req: Request, res: Response) {
  const metas = await prisma.metaCesta.findMany({ where: { ativo: true }, orderBy: { nomeItem: 'asc' } })

  const comProgresso = await Promise.all(
    metas.map(async (meta) => {
      const arrecadado = await calcularArrecadado(meta.id)
      const necessario = Number(meta.quantidadeNecessaria)
      const restante = Math.max(necessario - arrecadado, 0)
      return { ...meta, arrecadado, restante, completo: restante <= 0 }
    })
  )

  return res.json(comProgresso)
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
  const { status, tipo } = req.query

  const doacoes = await prisma.doacaoAlimento.findMany({
    where: {
      ...(status ? { status: status as 'PENDENTE' | 'CONFIRMADO' | 'RECUSADO' } : {}),
      ...(tipo ? { tipo: tipo as 'FISICA' | 'PIX' } : {}),
    },
    include: {
      membro: { select: { id: true, nomeCompleto: true } },
      metaCesta: { select: { id: true, nomeItem: true } },
    },
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

  const criar: Parameters<typeof prisma.doacaoAlimento.create>[0][] = []

  for (const item of dados.itens) {
    const meta = await prisma.metaCesta.findUnique({ where: { id: item.metaCestaId } })
    if (!meta || !meta.ativo) throw new AppError('Item da cesta não encontrado.', 404)

    const [arrecadado, reservado] = await Promise.all([calcularArrecadado(meta.id), calcularReservado(meta.id)])
    const disponivel = Number(meta.quantidadeNecessaria) - arrecadado - reservado

    if (disponivel <= 0) {
      throw new AppError(`A meta de "${meta.nomeItem}" já foi atingida. Escolha outro item.`)
    }
    if (item.quantidade > disponivel) {
      throw new AppError(`Só faltam ${disponivel} ${meta.unidade} de "${meta.nomeItem}". Ajuste a quantidade.`)
    }

    criar.push({
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
  }

  const doacoes = await prisma.$transaction(criar.map((c) => prisma.doacaoAlimento.create(c)))
  return res.status(201).json(doacoes)
}

export async function confirmar(req: Request, res: Response) {
  const { id } = req.params
  const doacao = await prisma.doacaoAlimento.findUnique({ where: { id } })
  if (!doacao) throw new AppError('Doação não encontrada.', 404)
  if (doacao.status !== 'PENDENTE') throw new AppError('Doação já processada.')

  const atualizada = await prisma.doacaoAlimento.update({
    where: { id },
    data: { status: 'CONFIRMADO', confirmadoPor: req.usuarioId, confirmadoEm: new Date() },
  })
  return res.json(atualizada)
}

export async function recusar(req: Request, res: Response) {
  const { id } = req.params
  const { motivoRecusa } = recusarSchema.parse(req.body ?? {})
  const doacao = await prisma.doacaoAlimento.findUnique({ where: { id } })
  if (!doacao) throw new AppError('Doação não encontrada.', 404)
  if (doacao.status !== 'PENDENTE') throw new AppError('Doação já processada.')

  const atualizada = await prisma.doacaoAlimento.update({
    where: { id },
    data: {
      status: 'RECUSADO',
      motivoRecusa: motivoRecusa ?? null,
      confirmadoPor: req.usuarioId,
      confirmadoEm: new Date(),
    },
  })
  return res.json(atualizada)
}
