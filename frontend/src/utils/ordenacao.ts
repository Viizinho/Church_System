import dayjs from 'dayjs'

export interface OpcaoOrdenacao<C extends string = string> {
  valor: C
  label: string
}

/** Comparação de texto em português, sem diferenciar maiúsculas nem acentos ("Álvaro" junto de "Alvaro"). */
export function compararTexto(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', 'pt-BR', { sensitivity: 'base' })
}

/** Compara datas ISO (ou nulas — que vão para o fim). */
export function compararData(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return new Date(a).getTime() - new Date(b).getTime()
}

/** Cópia ordenada (não altera a lista original). */
export function ordenar<T>(lista: T[], comparar: (a: T, b: T) => number): T[] {
  return [...lista].sort(comparar)
}

/**
 * Dias até o próximo aniversário a partir de uma data de nascimento ISO (0 = hoje).
 * Usa só a parte YYYY-MM-DD para não sofrer com fuso.
 */
export function diasAteAniversario(nascimentoIso: string | null | undefined, hoje = dayjs()): number {
  if (!nascimentoIso) return Number.POSITIVE_INFINITY
  const nasc = dayjs(nascimentoIso.slice(0, 10))
  const base = hoje.startOf('day')
  let proximo = nasc.year(base.year())
  // 29/02 em ano não bissexto: dayjs joga para 01/03 — aceitável para ordenar
  if (proximo.isBefore(base, 'day')) proximo = nasc.year(base.year() + 1)
  return proximo.diff(base, 'day')
}

/** Chave MM-DD para ordenar por data no calendário (jan → dez), ignorando o ano. */
export function chaveMesDia(iso: string | null | undefined): string {
  return iso ? iso.slice(5, 10) : '99-99'
}

/** Situação da manutenção, da mais urgente para a menos: vencido → sem registro → próximo → em dia */
export const URGENCIA: Record<string, number> = { VENCIDO: 0, SEM_REGISTRO: 1, PROXIMO: 2, EM_DIA: 3 }
