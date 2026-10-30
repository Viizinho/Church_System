import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { diasAteAniversario } from '../utils/aniversario'
import { calcularProximaManutencao, calcularStatus } from '../utils/manutencao'

export async function resumo(_req: Request, res: Response) {
  const hoje = new Date()
  const em7dias = new Date()
  em7dias.setDate(hoje.getDate() + 7)

  const [totalMembros, totalAtivos, eventosProximos, todosAtivos, pendentesContribuicao, pendentesPix] =
    await Promise.all([
      prisma.membro.count({ where: { status: 'ATIVO' } }),
      prisma.membro.count(),
      prisma.evento.findMany({ where: { inicio: { gte: hoje, lte: em7dias } }, orderBy: { inicio: 'asc' }, take: 5 }),
      prisma.ativo.findMany({ include: { manutencoes: { orderBy: { data: 'desc' }, take: 1 } } }),
      prisma.contribuicao.count({ where: { status: 'PENDENTE' } }),
      prisma.doacaoAlimento.count({ where: { status: 'PENDENTE' } }),
    ])

  const membrosComAniversario = await prisma.membro.findMany({
    where: { status: 'ATIVO', dataNascimento: { not: null } },
    select: {
      id: true,
      nomeCompleto: true,
      dataNascimento: true,
      cargos: { include: { cargo: { select: { nome: true } } } },
    },
  })

  const aniversariantes = membrosComAniversario
    .map((m) => ({ ...m, diffDias: diasAteAniversario(m.dataNascimento!) }))
    .filter((m) => m.diffDias <= 7)
    .sort((a, b) => a.diffDias - b.diffDias)

  const ativosComStatus = todosAtivos.map((a) => {
    const ultima = a.manutencoes[0] ?? null
    const proximaManutencao = ultima ? calcularProximaManutencao(ultima.data, a.periodicidadeDias) : null
    const status = calcularStatus(proximaManutencao)
    return { ...a, ultimaManutencao: ultima, proximaManutencao, status }
  })

  const alertasManutencao = ativosComStatus.filter(
    (a) => a.status === 'VENCIDO' || a.status === 'PROXIMO' || a.status === 'SEM_REGISTRO'
  )

  return res.json({
    membros: { total: totalMembros, totalGeral: totalAtivos },
    eventosProximos,
    aniversariantes,
    manutencao: {
      alertas: alertasManutencao.length,
      vencidos: alertasManutencao.filter((a) => a.status === 'VENCIDO').length,
      proximos: alertasManutencao.filter((a) => a.status === 'PROXIMO').length,
      itens: alertasManutencao,
    },
    contribuicoesPendentes: pendentesContribuicao,
    doacoesPendentes: pendentesPix,
  })
}
