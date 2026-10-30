const MS_POR_DIA = 24 * 60 * 60 * 1000

/**
 * Quantos dias faltam para o próximo aniversário (0 = é hoje).
 *
 * - Compara só as datas (sem a hora do dia): quem faz aniversário hoje tem 0 dias,
 *   e não "já passou" só porque já são 10h da manhã.
 * - A data de nascimento vem do banco como DATE (meia-noite UTC), então o dia e o
 *   mês são lidos em UTC; assim o servidor em fuso do Brasil não desloca o dia.
 */
export function diasAteAniversario(nascimento: Date, hoje: Date = new Date()): number {
  const mes = nascimento.getUTCMonth()
  const dia = nascimento.getUTCDate()
  const inicioHoje = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())

  let proximo = Date.UTC(hoje.getFullYear(), mes, dia)
  if (proximo < inicioHoje) proximo = Date.UTC(hoje.getFullYear() + 1, mes, dia)

  return Math.round((proximo - inicioHoje) / MS_POR_DIA)
}

/** Data (meia-noite UTC) do próximo aniversário. */
export function proximoAniversario(nascimento: Date, hoje: Date = new Date()): Date {
  const dias = diasAteAniversario(nascimento, hoje)
  return new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()) + dias * MS_POR_DIA)
}
