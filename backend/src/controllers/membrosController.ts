import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'
import { diasAteAniversario, proximoAniversario } from '../utils/aniversario'
import { enumQuery, telefone, textoCurto, textoLongo, urlHttp } from '../utils/validacao'

const membroSchema = z.object({
  nomeCompleto: textoCurto(2, 150),
  dataNascimento: z
    .string()
    .refine((d) => !Number.isNaN(Date.parse(d)), 'Data de nascimento inválida.')
    .optional()
    .nullable(),
  telefone: telefone.optional().nullable(),
  email: z.string().trim().email('E-mail inválido.').max(254).optional().nullable(),
  endereco: textoLongo(250),
  fotoUrl: urlHttp.optional().nullable(),
  status: z.enum(['ATIVO', 'INATIVO']).default('ATIVO'),
  cargoIds: z.array(z.string().uuid()).max(50).optional(),
  categoriaIds: z.array(z.string().uuid()).max(50).optional(),
  conjuntoIds: z.array(z.string().uuid()).max(50).optional(),
  naoQuerImagemGravada: z.boolean().optional(),
})

/** Aceita lista em CSV ("a,b") ou repetida (?x=a&x=b) e devolve os ids sem vazios. */
function listaParam(valor: unknown): string[] {
  const itens = Array.isArray(valor) ? valor : [valor]
  return itens
    .flatMap((v) => String(v ?? '').split(','))
    .map((v) => v.trim())
    .filter(Boolean)
}

export async function listar(req: Request, res: Response) {
  const busca = typeof req.query.busca === 'string' ? req.query.busca.trim().slice(0, 100) : ''
  const status = enumQuery(req.query.status, ['ATIVO', 'INATIVO'] as const)
  // Filtros múltiplos: dentro de cada grupo vale "qualquer um dos marcados";
  // entre grupos (cargo, categoria, conjunto, status, busca) vale "e".
  // cargoId/categoriaId (singular) continuam aceitos por compatibilidade.
  const cargoIds = listaParam(req.query.cargoIds ?? req.query.cargoId)
  const categoriaIds = listaParam(req.query.categoriaIds ?? req.query.categoriaId)
  const conjuntoIds = listaParam(req.query.conjuntoIds ?? req.query.conjuntoId)

  const membros = await prisma.membro.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(cargoIds.length ? { cargos: { some: { cargoId: { in: cargoIds } } } } : {}),
      ...(categoriaIds.length ? { categorias: { some: { categoriaId: { in: categoriaIds } } } } : {}),
      ...(conjuntoIds.length ? { conjuntos: { some: { conjuntoId: { in: conjuntoIds } } } } : {}),
      ...(busca
        ? {
            OR: [
              { nomeCompleto: { contains: busca, mode: 'insensitive' } },
              { email: { contains: busca, mode: 'insensitive' } },
              { telefone: { contains: busca, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      cargos: { include: { cargo: { select: { id: true, nome: true } } } },
      categorias: { include: { categoria: { select: { id: true, nome: true, grupo: true } } } },
      conjuntos: { include: { conjunto: { select: { id: true, nome: true } } } },
    },
    orderBy: { nomeCompleto: 'asc' },
    take: 2000,
  })

  return res.json(membros)
}

export async function obter(req: Request, res: Response) {
  const membro = await prisma.membro.findUnique({
    where: { id: req.params.id },
    include: {
      cargos: { include: { cargo: true } },
      categorias: { include: { categoria: true } },
      conjuntos: { include: { conjunto: true } },
    },
  })
  if (!membro) throw new AppError('Membro não encontrado.', 404)
  return res.json(membro)
}

export async function criar(req: Request, res: Response) {
  const { cargoIds, categoriaIds, conjuntoIds, dataNascimento, naoQuerImagemGravada, ...dados } =
    membroSchema.parse(req.body)

  const membro = await prisma.membro.create({
    data: {
      ...dados,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      naoQuerImagemGravada: naoQuerImagemGravada ?? false,
      cargos: cargoIds?.length ? { create: cargoIds.map((cargoId) => ({ cargoId })) } : undefined,
      categorias: categoriaIds?.length
        ? { create: categoriaIds.map((categoriaId) => ({ categoriaId })) }
        : undefined,
      conjuntos: conjuntoIds?.length
        ? { create: conjuntoIds.map((conjuntoId) => ({ conjuntoId })) }
        : undefined,
    },
    include: {
      cargos: { include: { cargo: true } },
      categorias: { include: { categoria: true } },
      conjuntos: { include: { conjunto: true } },
    },
  })

  return res.status(201).json(membro)
}

export async function atualizar(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.membro.findUnique({ where: { id } })
  if (!existente) throw new AppError('Membro não encontrado.', 404)

  const { cargoIds, categoriaIds, conjuntoIds, dataNascimento, naoQuerImagemGravada, ...dados } =
    membroSchema.parse(req.body)

  const membro = await prisma.$transaction(async (tx) => {
    if (cargoIds !== undefined) {
      await tx.membroCargo.deleteMany({ where: { membroId: id } })
      if (cargoIds.length > 0) {
        await tx.membroCargo.createMany({ data: cargoIds.map((cargoId) => ({ membroId: id, cargoId })) })
      }
    }

    if (categoriaIds !== undefined) {
      await tx.membroCategoria.deleteMany({ where: { membroId: id } })
      if (categoriaIds.length > 0) {
        await tx.membroCategoria.createMany({
          data: categoriaIds.map((categoriaId) => ({ membroId: id, categoriaId })),
        })
      }
    }

    if (conjuntoIds !== undefined) {
      await tx.membroConjunto.deleteMany({ where: { membroId: id } })
      if (conjuntoIds.length > 0) {
        await tx.membroConjunto.createMany({
          data: conjuntoIds.map((conjuntoId) => ({ membroId: id, conjuntoId })),
        })
      }
    }

    return tx.membro.update({
      where: { id },
      data: {
        ...dados,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        // só altera quando o campo vem na requisição
        ...(naoQuerImagemGravada !== undefined ? { naoQuerImagemGravada } : {}),
      },
      include: {
        cargos: { include: { cargo: true } },
        categorias: { include: { categoria: true } },
        conjuntos: { include: { conjunto: true } },
      },
    })
  })

  return res.json(membro)
}

export async function remover(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.membro.findUnique({ where: { id } })
  if (!existente) throw new AppError('Membro não encontrado.', 404)

  await prisma.membro.delete({ where: { id } })
  return res.status(204).send()
}

export async function aniversariantes(req: Request, res: Response) {
  const { periodo } = req.query // 'semana' | 'mes'

  const membros = await prisma.membro.findMany({
    where: { status: 'ATIVO', dataNascimento: { not: null } },
    select: {
      id: true,
      nomeCompleto: true,
      dataNascimento: true,
      telefone: true,
      cargos: { include: { cargo: { select: { nome: true } } } },
    },
    orderBy: { nomeCompleto: 'asc' },
  })

  const comAniversario = membros
    .map((m) => {
      const nasc = m.dataNascimento!
      return { ...m, diffDias: diasAteAniversario(nasc), proximoAniversario: proximoAniversario(nasc) }
    })
    .filter((m) => (periodo === 'mes' ? m.diffDias <= 30 : m.diffDias <= 7))
    .sort((a, b) => a.diffDias - b.diffDias)

  return res.json(comAniversario)
}

// ─── Categorias e Conjuntos (listagem para popular formulário/filtros) ────────

export async function listarCategorias(_req: Request, res: Response) {
  const categorias = await prisma.categoria.findMany({ orderBy: { nome: 'asc' } })
  return res.json(categorias)
}

export async function listarConjuntos(_req: Request, res: Response) {
  const conjuntos = await prisma.conjuntoMusical.findMany({ orderBy: { nome: 'asc' } })
  return res.json(conjuntos)
}
