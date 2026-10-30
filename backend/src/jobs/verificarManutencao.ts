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
    await dispararSeNecessario(ativo.id, ativo.nome, status, destinatarios, proxima)
  }
}

/**
 * Envia o alerta a TODOS os destinatários uma única vez por ciclo (ativo + status + canal).
 * Antes, o registro de "já enviado" era gravado após o 1º destinatário e os demais nunca eram avisados.
 */
async function dispararSeNecessario(
  ativoId: string,
  nomeAtivo: string,
  status: 'VENCIDO' | 'PROXIMO',
  usuarios: { email: string; telefone: string | null }[],
  proxima: Date | null
) {
  const data = proxima?.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' })
  const mensagem =
    status === 'VENCIDO'
      ? `⚠️ A manutenção de "${nomeAtivo}" está VENCIDA (prevista para ${data}).`
      : `🔔 A manutenção de "${nomeAtivo}" vence em breve, em ${data}.`

  const jaEnviadoEmail = await prisma.notificacaoManutencao.findUnique({
    where: { unico_por_ciclo: { ativoId, status, canal: 'EMAIL' } },
  })
  if (!jaEnviadoEmail) {
    for (const u of usuarios) await enviarEmail(u.email, `Alerta de manutenção — ${nomeAtivo}`, mensagem)
    await prisma.notificacaoManutencao.create({ data: { ativoId, status, canal: 'EMAIL' } })
  }

  const comTelefone = usuarios.filter((u) => u.telefone)
  if (comTelefone.length > 0) {
    const jaEnviadoWhats = await prisma.notificacaoManutencao.findUnique({
      where: { unico_por_ciclo: { ativoId, status, canal: 'WHATSAPP' } },
    })
    if (!jaEnviadoWhats) {
      for (const u of comTelefone) await enviarWhatsApp(u.telefone!, mensagem)
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
  // Todos os dias às 08:00 de Fortaleza. Sem try/catch, um erro de rede (SMTP, banco) viraria
  // "unhandled rejection" e derrubaria o servidor.
  cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        console.log('[cron] Verificando manutenções pendentes...')
        await limparNotificacoesResolvidas()
        await verificarManutencoes()
      } catch (e) {
        console.error('[cron] Falha ao verificar manutenções:', (e as Error).message)
      }
    },
    { timezone: 'America/Fortaleza' }
  )
}
