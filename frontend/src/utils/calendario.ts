import dayjs, { Dayjs } from 'dayjs'
import type { Evento, TipoEvento } from '@/types'
import type { CorCalendario, ItemCalendario } from '@/components/calendario/CalendarioMensal'

export const corDoTipo: Record<TipoEvento, CorCalendario> = { CULTO: 'purple', REUNIAO: 'blue', ESPECIAL: 'amber' }
export const legendaEventos: { cor: CorCalendario; texto: string }[] = [
  { cor: 'purple', texto: 'Culto' },
  { cor: 'blue', texto: 'Reunião' },
  { cor: 'amber', texto: 'Especial' },
]

/** Eventos → itens do calendário. */
export function eventosNoCalendario(eventos: Evento[], onClick?: (e: Evento) => void): ItemCalendario[] {
  const agora = dayjs()
  return eventos.map((e) => {
    const d = dayjs(e.inicio)
    return {
      id: `ev-${e.id}`,
      dia: d.format('YYYY-MM-DD'),
      hora: d.format('HH:mm'),
      titulo: e.nome,
      detalhe: e.local ?? undefined,
      cor: corDoTipo[e.tipo],
      apagado: d.isBefore(agora),
      onClick: onClick ? () => onClick(e) : undefined,
    }
  })
}

interface ComNascimento {
  id: string
  nomeCompleto: string
  dataNascimento?: string | null
}

/**
 * Aniversários que caem no mês exibido. Quem nasceu em 29/02 aparece em 28/02 nos anos não bissextos.
 * A data de nascimento vem como DATE do banco: só a parte YYYY-MM-DD é usada (sem fuso).
 */
export function aniversariosNoCalendario(membros: ComNascimento[], mes: Dayjs): ItemCalendario[] {
  const itens: ItemCalendario[] = []
  for (const m of membros) {
    if (!m.dataNascimento) continue
    const [ano, mesNasc, dia] = m.dataNascimento.slice(0, 10).split('-').map(Number)
    if (mesNasc !== mes.month() + 1) continue
    const ultimoDia = mes.daysInMonth()
    const d = mes.date(Math.min(dia, ultimoDia))
    const idade = mes.year() - ano
    itens.push({
      id: `aniv-${m.id}`,
      dia: d.format('YYYY-MM-DD'),
      titulo: m.nomeCompleto,
      detalhe: idade > 0 ? `Aniversário · ${idade} anos` : 'Aniversário',
      cor: 'pink',
      marcador: '🎂',
    })
  }
  return itens
}
