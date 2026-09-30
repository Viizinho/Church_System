import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { AppError } from '../utils/AppError'

const cargoSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional().nullable(),
})

export async function listar(_req: Request, res: Response) {
  const cargos = await prisma.cargo.findMany({ orderBy: { nome: 'asc' } })
  return res.json(cargos)
}

export async function criar(req: Request, res: Response) {
  const dados = cargoSchema.parse(req.body)
  const existente = await prisma.cargo.findUnique({ where: { nome: dados.nome } })
  if (existente) throw new AppError('Já existe um cargo com este nome.')

  const cargo = await prisma.cargo.create({ data: dados })
  return res.status(201).json(cargo)
}

export async function atualizar(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.cargo.findUnique({ where: { id } })
  if (!existente) throw new AppError('Cargo não encontrado.', 404)

  const dados = cargoSchema.parse(req.body)
  const cargo = await prisma.cargo.update({ where: { id }, data: dados })
  return res.json(cargo)
}

export async function remover(req: Request, res: Response) {
  const { id } = req.params
  const existente = await prisma.cargo.findUnique({ where: { id } })
  if (!existente) throw new AppError('Cargo não encontrado.', 404)

  await prisma.cargo.delete({ where: { id } })
  return res.status(204).send()
}
