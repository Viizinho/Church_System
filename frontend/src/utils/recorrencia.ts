import type { RecorrenciaEvento, RegraRecorrencia } from '@/types'

export const POSICOES_MES = [
  { valor: 1, label: 'primeira' },
  { valor: 2, label: 'segunda' },
  { valor: 3, label: 'terceira' },
  { valor: 4, label: 'quarta' },
  { valor: -1, label: 'última' },
]

/** Qual ocorrência do dia da semana no mês é a data (dia 3 → 1ª; dia 29+ → última). */
export function posicaoNoMes(diaDoMes: number): number {
  const n = Math.ceil(diaDoMes / 7)
  return n > 4 ? -1 : n
}

export const DIAS_SEMANA = [
  { valor: 0, curto: 'Dom', longo: 'domingo', plural: 'domingos' },
  { valor: 1, curto: 'Seg', longo: 'segunda-feira', plural: 'segundas' },
  { valor: 2, curto: 'Ter', longo: 'terça-feira', plural: 'terças' },
  { valor: 3, curto: 'Qua', longo: 'quarta-feira', plural: 'quartas' },
  { valor: 4, curto: 'Qui', longo: 'quinta-feira', plural: 'quintas' },
  { valor: 5, curto: 'Sex', longo: 'sexta-feira', plural: 'sextas' },
  { valor: 6, curto: 'Sáb', longo: 'sábado', plural: 'sábados' },
]

function listar(itens: string[]): string {
  if (itens.length <= 1) return itens.join('')
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

/** "Todo domingo", "Toda terça e quinta", "A cada 2 semanas, às segundas", "Todo mês, no dia 12"... */
export function descreverRecorrencia(
  tipo: RecorrenciaEvento | undefined,
  regra: RegraRecorrencia | null | undefined,
  diaDoMes?: number
): string {
  if (!tipo || tipo === 'NENHUMA') return 'Evento único'
  const intervalo = Math.max(1, regra?.intervalo ?? regra?.intervaloSemanas ?? 1)

  let base: string
  if (regra?.unidade === 'DIAS') {
    base = intervalo === 1 ? 'Todos os dias' : `A cada ${intervalo} dias`
  } else if (tipo === 'MENSAL' && regra?.mensalPor === 'DIA_DA_SEMANA') {
    const pos = POSICOES_MES.find((p) => p.valor === regra.semanaDoMes)?.label ?? ''
    const dia = DIAS_SEMANA[regra.diaSemanaMes ?? 0]
    const artigo = [0, 6].includes(dia.valor) ? (pos === 'última' ? 'último' : pos.replace(/a$/, 'o')) : pos
    const frase = `${[0, 6].includes(dia.valor) ? 'Todo' : 'Toda'} ${artigo} ${dia.longo} do mês`
    base = intervalo === 1 ? frase : `${frase}, a cada ${intervalo} meses`
  } else if (tipo === 'MENSAL') {
    const dia = diaDoMes ? `, no dia ${diaDoMes}` : ''
    base = intervalo === 1 ? `Todo mês${dia}` : `A cada ${intervalo} meses${dia}`
  } else {
    const dias = [...(regra?.diasSemana ?? [])].sort((a, b) => a - b)
    if (dias.length === 0) {
      base = intervalo === 1 ? 'Toda semana' : `A cada ${intervalo} semanas`
    } else if (intervalo === 1) {
      if (dias.length === 7) base = 'Todos os dias'
      else if (dias.length === 1) base = `${[0, 6].includes(dias[0]) ? 'Todo' : 'Toda'} ${DIAS_SEMANA[dias[0]].longo}`
      else base = `Toda semana (${listar(dias.map((d) => DIAS_SEMANA[d].longo.replace('-feira', '')))})`
    } else {
      base = `A cada ${intervalo} semanas (${listar(dias.map((d) => DIAS_SEMANA[d].longo.replace('-feira', '')))})`
    }
  }

  const fim = regra?.criterioParada
  if (fim?.tipo === 'DATA') {
    const [a, m, d] = fim.valor.slice(0, 10).split('-')
    return `${base} · até ${d}/${m}/${a}`
  }
  if (fim?.tipo === 'OCORRENCIAS') return `${base} · ${fim.valor} vezes`
  return base
}
