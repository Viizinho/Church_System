import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { calcularProximaManutencao, calcularStatus } from '../utils/manutencao'

export async function resumo(_req: Request, res: Response) {
  const hoje = new Date()
  const em7dias = new Date()
  em7dias.setDate(hoje.getDate() + 7)

  const [
    totalMembros,
    totalAtivos,
    eventosProximos,
    todosAtivos,
    pendentesContribuicao,
    pendentesPix,
  ] = await Promise.all([
    prisma.membro.count({ where: { status: 'ATIVO' } }),
    prisma.membro.count(),
    prisma.evento.findMany({
      where: { inicio: { gte: hoje, lte: em7dias } },
      orderBy: { inicio: 'asc' },
      take: 5,
    }),
    prisma.ativo.findMany({
      include: { manutencoes: { orderBy: { data: 'desc' }, take: 1 } },
    }),
    prisma.contribuicao.count({ where: { status: 'PENDENTE' } }),
    prisma.doacaoAlimento.count({ where: { status: 'PENDENTE' } }),
  ])

  // Aniversariantes da semana (apenas membros ativos)
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
    .map((m) => {
      const nasc = m.dataNascimento!
      const aniversario = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())
      if (aniversario < hoje) aniversario.setFullYear(hoje.getFullYear() + 1)
      const diffDias = Math.ceil(
        (aniversario.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      )
      return { ...m, diffDias }
    })
    .filter((m) => m.diffDias <= 7)
    .sort((a, b) => a.diffDias - b.diffDias)

  // Status de manutenção
  const ativosComStatus = todosAtivos.map((a) => {
    const ultima = a.manutencoes[0] ?? null
    const proximaManutencao = ultima
      ? calcularProximaManutencao(ultima.data, a.periodicidadeDias)
      : null
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
