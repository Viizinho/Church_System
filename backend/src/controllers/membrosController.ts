import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'

const membroSchema = z.object({
  nomeCompleto: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  dataNascimento: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido.').optional().nullable(),
  endereco: z.string().optional().nullable(),
  fotoUrl: z.string().url('URL inválida.').optional().nullable(),
  status: z.enum(['ATIVO', 'INATIVO']).default('ATIVO'),
  cargoIds: z.array(z.string().uuid()).optional(),
  categoriaIds: z.array(z.string().uuid()).optional(),
  conjuntoIds: z.array(z.string().uuid()).optional(),
  consentimentoImagem: z.boolean(),
})

function validarConsentimento(consentimentoImagem: boolean) {
  if (!consentimentoImagem) {
    throw new AppError('O Consenso de Uso da Imagem é obrigatório para o cadastro.')
  }
}

export async function listar(req: Request, res: Response) {
  const { busca, status, cargoId, categoriaId } = req.query

  const membros = await prisma.membro.findMany({
    where: {
      ...(status ? { status: status as 'ATIVO' | 'INATIVO' } : {}),
      ...(cargoId ? { cargos: { some: { cargoId: String(cargoId) } } } : {}),
      ...(categoriaId ? { categorias: { some: { categoriaId: String(categoriaId) } } } : {}),
      ...(busca
        ? {
            OR: [
              { nomeCompleto: { contains: String(busca), mode: 'insensitive' } },
              { email: { contains: String(busca), mode: 'insensitive' } },
              { telefone: { contains: String(busca), mode: 'insensitive' } },
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
  const { cargoIds, categoriaIds, conjuntoIds, dataNascimento, consentimentoImagem, ...dados } =
    membroSchema.parse(req.body)

  validarConsentimento(consentimentoImagem)

  const membro = await prisma.membro.create({
    data: {
      ...dados,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      consentimentoImagem,
      consentimentoImagemData: new Date(),
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

  const { cargoIds, categoriaIds, conjuntoIds, dataNascimento, consentimentoImagem, ...dados } =
    membroSchema.parse(req.body)

  validarConsentimento(consentimentoImagem)

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
        consentimentoImagem,
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

  const hoje = new Date()
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
      const aniversario = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())
      if (aniversario < hoje) aniversario.setFullYear(hoje.getFullYear() + 1)
      const diffDias = Math.ceil((aniversario.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      return { ...m, diffDias, proximoAniversario: aniversario }
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
