import dayjs from 'dayjs'

/**
 * Datas de manutenção vêm do backend como DATE (ex.: "2026-10-29T00:00:00.000Z").
 * Formatar direto com dayjs() converte para o fuso local e, em UTC-3, mostraria
 * o dia anterior. Aqui usamos só a parte YYYY-MM-DD.
 */
export function formatarData(iso?: string | null): string {
  if (!iso) return '—'
  return dayjs(iso.slice(0, 10)).format('DD/MM/YYYY')
}

/** Valor para <input type="date"> */
export function paraInputData(iso: string): string {
  return iso.slice(0, 10)
}
