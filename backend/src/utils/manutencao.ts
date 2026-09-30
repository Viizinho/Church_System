export type StatusManutencao = 'EM_DIA' | 'PROXIMO' | 'VENCIDO' | 'SEM_REGISTRO'

const DIAS_AVISO = 30

export function calcularProximaManutencao(
  ultimaData: Date,
  periodicidadeDias: number
): Date {
  const proxima = new Date(ultimaData)
  proxima.setDate(proxima.getDate() + periodicidadeDias)
  return proxima
}

export function calcularStatus(proximaManutencao: Date | null): StatusManutencao {
  if (!proximaManutencao) return 'SEM_REGISTRO'

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const proxima = new Date(proximaManutencao)
  proxima.setHours(0, 0, 0, 0)

  const diffMs = proxima.getTime() - hoje.getTime()
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias < 0) return 'VENCIDO'
  if (diffDias <= DIAS_AVISO) return 'PROXIMO'
  return 'EM_DIA'
}
