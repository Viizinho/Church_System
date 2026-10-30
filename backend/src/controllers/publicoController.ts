import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma'
import { telefone, textoLongo, urlHttp } from '../utils/validacao'
import { totaisPorMeta } from './maoAmigaController'

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
  const { confirmado, pendente } = await totaisPorMeta(metas.map((m) => m.id))

  return res.json(
    metas.map((meta) => {
      const arrecadado = confirmado.get(meta.id) ?? 0
      const reservado = pendente.get(meta.id) ?? 0
      const necessario = Number(meta.quantidadeNecessaria)
      // "restante" = o que ainda dá para doar (já descontadas as doações aguardando conferência)
      const restante = Math.max(necessario - arrecadado - reservado, 0)
      return {
        id: meta.id,
        nomeItem: meta.nomeItem,
        unidade: meta.unidade,
        necessario,
        arrecadado,
        reservado,
        restante,
        completo: restante <= 0,
      }
    })
  )
}

// Links de redes sociais vão direto em <a href>: só http(s), senão `javascript:` viraria XSS.
const urlOpcional = urlHttp.or(z.literal('')).optional().nullable().transform((v) => v || null)

const configSchema = z.object({
  sobre: textoLongo(1000),
  endereco: textoLongo(250),
  instagramUrl: urlOpcional,
  facebookUrl: urlOpcional,
  whatsappContato: telefone.optional().nullable().transform((v) => v || null),
})

export async function atualizarConfiguracao(req: Request, res: Response) {
  const dados = configSchema.parse(req.body)

  const config = await prisma.configuracaoIgreja.upsert({
    where: { id: 'singleton' },
    update: dados,
    create: { id: 'singleton', ...dados },
  })

  return res.json(config)
}
