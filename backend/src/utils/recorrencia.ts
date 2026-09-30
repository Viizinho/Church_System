export interface CriterioParadaData {
  tipo: 'DATA'
  valor: string // ISO date
}

export interface CriterioParadaOcorrencias {
  tipo: 'OCORRENCIAS'
  valor: number
}

export type CriterioParada = CriterioParadaData | CriterioParadaOcorrencias

export interface RegraRecorrencia {
  diasSemana: number[] // 0=domingo ... 6=sábado
  intervaloSemanas: number // 1 = toda semana, 2 = quinzenal, etc.
  criterioParada: CriterioParada
}

const LIMITE_SEGURANCA_OCORRENCIAS = 200 // trava contra regras mal configuradas (ex: sem critério de parada coerente)

/**
 * Gera as datas de ocorrência de um evento recorrente a partir da data inicial e da regra.
 * A primeira ocorrência (dataInicial) sempre é incluída caso bata com os diasSemana;
 * caso contrário, a busca começa no primeiro dia da semana que corresponder.
 */
export function gerarOcorrencias(dataInicial: Date, regra: RegraRecorrencia): Date[] {
  if (!regra.diasSemana?.length) {
    throw new Error('Informe ao menos um dia da semana para a recorrência.')
  }
  if (regra.intervaloSemanas < 1) {
    throw new Error('O intervalo de semanas deve ser maior ou igual a 1.')
  }

  const ocorrencias: Date[] = []
  const diasSemanaOrdenados = [...regra.diasSemana].sort((a, b) => a - b)

  const dataLimite =
    regra.criterioParada.tipo === 'DATA' ? new Date(regra.criterioParada.valor) : null
  const maxOcorrencias =
    regra.criterioParada.tipo === 'OCORRENCIAS'
      ? regra.criterioParada.valor
      : LIMITE_SEGURANCA_OCORRENCIAS

  // início da semana (domingo) da data inicial, preservando o horário
  const horas = dataInicial.getHours()
  const minutos = dataInicial.getMinutes()

  let inicioSemana = new Date(dataInicial)
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay())
  inicioSemana.setHours(0, 0, 0, 0)

  let semanaAtual = 0
  let seguranca = 0

  while (ocorrencias.length < maxOcorrencias && seguranca < LIMITE_SEGURANCA_OCORRENCIAS * 10) {
    seguranca++

    for (const dia of diasSemanaOrdenados) {
      const candidato = new Date(inicioSemana)
      candidato.setDate(candidato.getDate() + dia + semanaAtual * 7 * regra.intervaloSemanas)
      candidato.setHours(horas, minutos, 0, 0)

      if (candidato < dataInicial) continue
      if (dataLimite && candidato > dataLimite) {
        return ocorrencias
      }

      ocorrencias.push(candidato)
      if (ocorrencias.length >= maxOcorrencias) break
    }

    semanaAtual++
  }

  return ocorrencias
}
