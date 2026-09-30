import { Request, Response } from 'express'
import prisma from '../utils/prisma'

export async function configuracao(_req: Request, res: Response) {
  const config = await prisma.configuracaoIgreja.findUnique({ where: { id: 'singleton' } })
  return res.json(
    config ?? {
      id: 'singleton',
      sobre: null,
      endereco: null,
      instagramUrl: null,
      facebookUrl: null,
      whatsappContato: null,
    }
  )
}

export async function eventosPublicos(_req: Request, res: Response) {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)

  const [doMes, proximos] = await Promise.all([
    prisma.evento.findMany({ where: { inicio: { gte: inicioMes, lte: fimMes } }, orderBy: { inicio: 'asc' } }),
    prisma.evento.findMany({ where: { inicio: { gte: hoje } }, orderBy: { inicio: 'asc' }, take: 5 }),
  ])

  return res.json({ doMes, proximos })
}

export async function metasMaoAmigaPublicas(_req: Request, res: Response) {
  const metas = await prisma.metaCesta.findMany({ where: { ativo: true }, orderBy: { nomeItem: 'asc' } })

  const comProgresso = await Promise.all(
    metas.map(async (meta) => {
      const soma = await prisma.doacaoAlimento.aggregate({
        where: { metaCestaId: meta.id, status: 'CONFIRMADO' },
        _sum: { quantidadeNumerica: true },
      })
      const arrecadado = Number(soma._sum.quantidadeNumerica ?? 0)
      const necessario = Number(meta.quantidadeNecessaria)
      return {
        id: meta.id,
        nomeItem: meta.nomeItem,
        unidade: meta.unidade,
        restante: Math.max(necessario - arrecadado, 0),
        completo: arrecadado >= necessario,
      }
    })
  )

  return res.json(comProgresso)
}

export async function atualizarConfiguracao(req: Request, res: Response) {
  const { sobre, endereco, instagramUrl, facebookUrl, whatsappContato } = req.body

  const config = await prisma.configuracaoIgreja.upsert({
    where: { id: 'singleton' },
    update: { sobre, endereco, instagramUrl, facebookUrl, whatsappContato },
    create: { id: 'singleton', sobre, endereco, instagramUrl, facebookUrl, whatsappContato },
  })

  return res.json(config)
}
