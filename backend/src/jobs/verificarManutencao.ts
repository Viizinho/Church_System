import cron from 'node-cron'
import prisma from '../utils/prisma'
import { calcularProximaManutencao, calcularStatus } from '../utils/manutencao'
import { enviarEmail, enviarWhatsApp } from '../utils/notificacoes'

async function verificarManutencoes() {
  const ativos = await prisma.ativo.findMany({
    include: { manutencoes: { orderBy: { data: 'desc' }, take: 1 } },
  })

  const destinatarios = await prisma.usuario.findMany({ where: { receberAlertas: true } })
  if (destinatarios.length === 0) return

  for (const ativo of ativos) {
    const ultima = ativo.manutencoes[0] ?? null
    const proxima = ultima ? calcularProximaManutencao(ultima.data, ativo.periodicidadeDias) : null
    const status = calcularStatus(proxima)

    if (status !== 'VENCIDO' && status !== 'PROXIMO') continue

    for (const usuario of destinatarios) {
      await dispararSeNecessario(ativo.id, ativo.nome, status, usuario, proxima)
    }
  }
}

async function dispararSeNecessario(
  ativoId: string,
  nomeAtivo: string,
  status: 'VENCIDO' | 'PROXIMO',
  usuario: { email: string; telefone: string | null },
  proxima: Date | null
) {
  const mensagem =
    status === 'VENCIDO'
      ? `⚠️ A manutenção de "${nomeAtivo}" está VENCIDA (prevista para ${proxima?.toLocaleDateString('pt-BR')}).`
      : `🔔 A manutenção de "${nomeAtivo}" vence em breve, em ${proxima?.toLocaleDateString('pt-BR')}.`

  const jaEnviadoEmail = await prisma.notificacaoManutencao.findUnique({
    where: { unico_por_ciclo: { ativoId, status, canal: 'EMAIL' } },
  })
  if (!jaEnviadoEmail) {
    await enviarEmail(usuario.email, `Alerta de manutenção — ${nomeAtivo}`, mensagem)
    await prisma.notificacaoManutencao.create({ data: { ativoId, status, canal: 'EMAIL' } })
  }

  if (usuario.telefone) {
    const jaEnviadoWhats = await prisma.notificacaoManutencao.findUnique({
      where: { unico_por_ciclo: { ativoId, status, canal: 'WHATSAPP' } },
    })
    if (!jaEnviadoWhats) {
      await enviarWhatsApp(usuario.telefone, mensagem)
      await prisma.notificacaoManutencao.create({ data: { ativoId, status, canal: 'WHATSAPP' } })
    }
  }
}

/**
 * Limpa notificações antigas para permitir novo alerta em um novo ciclo
 * (ex: depois que uma manutenção "vencida" é registrada e o ativo volta a ficar em dia,
 * o próximo vencimento deve poder notificar de novo).
 */
async function limparNotificacoesResolvidas() {
  const ativos = await prisma.ativo.findMany({
    include: { manutencoes: { orderBy: { data: 'desc' }, take: 1 } },
  })

  for (const ativo of ativos) {
    const ultima = ativo.manutencoes[0] ?? null
    const proxima = ultima ? calcularProximaManutencao(ultima.data, ativo.periodicidadeDias) : null
    const status = calcularStatus(proxima)

    if (status === 'EM_DIA' || status === 'SEM_REGISTRO') {
      await prisma.notificacaoManutencao.deleteMany({ where: { ativoId: ativo.id } })
    }
  }
}

export function iniciarCronManutencao() {
  // Todos os dias às 08:00 (horário do servidor)
  cron.schedule('0 8 * * *', async () => {
    console.log('[cron] Verificando manutenções pendentes...')
    await limparNotificacoesResolvidas()
    await verificarManutencoes()
  })
}

// Exportado à parte para permitir rodar manualmente (ex: endpoint de teste, ou script)
export { verificarManutencoes, limparNotificacoesResolvidas }
