export interface CriterioParadaData {
  tipo: 'DATA'
  valor: string // YYYY-MM-DD (último dia, inclusive)
}

export interface CriterioParadaOcorrencias {
  tipo: 'OCORRENCIAS'
  valor: number
}

export type CriterioParada = CriterioParadaData | CriterioParadaOcorrencias

export type FrequenciaRecorrencia = 'DIARIA' | 'SEMANAL' | 'MENSAL'

export interface RegraRecorrencia {
  /** Dias da semana (0 = domingo … 6 = sábado). Obrigatório na repetição semanal. */
  diasSemana?: number[]
  /** 'DIAS' = repete a cada N dias (sem dias da semana). Sem isso, a regra é semanal. */
  unidade?: 'DIAS'
  /** Mensal: 'DIA_DA_SEMANA' = "primeira terça do mês"; padrão = mesmo dia do mês. */
  mensalPor?: 'DIA_DO_MES' | 'DIA_DA_SEMANA'
  /** Mensal por dia da semana: qual ocorrência no mês (1–4, ou -1 = última). */
  semanaDoMes?: number
  /** Mensal por dia da semana: 0 = domingo … 6 = sábado. */
  diaSemanaMes?: number
  /** A cada N dias, semanas ou meses. */
  intervalo?: number
  /** Nome antigo de `intervalo` (dados criados antes da unificação). */
  intervaloSemanas?: number
  criterioParada: CriterioParada
}

/** Trava contra regras mal configuradas. */
export const LIMITE_OCORRENCIAS = 200

/** Fuso padrão (Brasília, UTC-3) usado quando o cliente não informa o seu. */
export const FUSO_PADRAO_MINUTOS = 180

const MIN = 60_000
const DIA = 24 * 60 * MIN

export function intervaloDaRegra(regra: RegraRecorrencia): number {
  return Math.max(1, regra.intervalo ?? regra.intervaloSemanas ?? 1)
}

/**
 * Gera as datas de uma série recorrente, a partir da data inicial (inclusive).
 *
 * Os cálculos são feitos no "relógio de parede" do usuário (instante − fuso, lendo
 * com getters UTC). Assim o dia da semana e o horário não mudam quando o servidor
 * roda em UTC — um culto às 21h em Brasília continua sendo "domingo", e não segunda.
 *
 * @param fusoMinutos resultado de `Date#getTimezoneOffset()` do cliente (UTC-3 → 180)
 */
export function gerarOcorrencias(
  inicio: Date,
  frequencia: FrequenciaRecorrencia,
  regra: RegraRecorrencia,
  fusoMinutos: number = FUSO_PADRAO_MINUTOS
): Date[] {
  const intervalo = intervaloDaRegra(regra)
  const parede = new Date(inicio.getTime() - fusoMinutos * MIN)
  const diaZero = Date.UTC(parede.getUTCFullYear(), parede.getUTCMonth(), parede.getUTCDate())
  const horario = parede.getTime() - diaZero

  const max =
    regra.criterioParada.tipo === 'OCORRENCIAS'
      ? Math.min(regra.criterioParada.valor, LIMITE_OCORRENCIAS)
      : LIMITE_OCORRENCIAS
  const limite =
    regra.criterioParada.tipo === 'DATA'
      ? Date.parse(regra.criterioParada.valor.slice(0, 10) + 'T00:00:00Z') + DIA - 1
      : null
  if (limite !== null && Number.isNaN(limite)) throw new Error('Data final inválida.')

  const resultado: Date[] = []
  const adicionar = (diaParede: number): boolean => {
    const c = diaParede + horario
    if (c < parede.getTime()) return true // antes do início: ignora
    if (limite !== null && c > limite) return false
    resultado.push(new Date(c + fusoMinutos * MIN))
    return resultado.length < max
  }

  if (frequencia === 'DIARIA') {
    for (let k = 0; k < LIMITE_OCORRENCIAS * 20; k++) {
      const dia = diaZero + k * intervalo * DIA
      if (limite !== null && dia > limite) break
      if (!adicionar(dia)) break
    }
  } else if (frequencia === 'SEMANAL') {
    const dias = [...new Set(regra.diasSemana ?? [])].sort((a, b) => a - b)
    if (dias.length === 0) throw new Error('Escolha ao menos um dia da semana.')
    const domingo = diaZero - parede.getUTCDay() * DIA
    for (let semana = 0; semana < 1200; semana++) {
      const base = domingo + semana * intervalo * 7 * DIA
      if (limite !== null && base > limite) break
      for (const d of dias) {
        if (!adicionar(base + d * DIA)) return resultado
      }
    }
  } else if (regra.mensalPor === 'DIA_DA_SEMANA') {
    const dow = regra.diaSemanaMes ?? parede.getUTCDay()
    const nth = regra.semanaDoMes ?? Math.ceil(parede.getUTCDate() / 7)
    for (let k = 0; k < 600; k++) {
      const ano = parede.getUTCFullYear()
      const mes = parede.getUTCMonth() + k * intervalo
      let dia: number
      if (nth === -1) {
        const ultimo = new Date(Date.UTC(ano, mes + 1, 0))
        dia = ultimo.getUTCDate() - ((ultimo.getUTCDay() - dow + 7) % 7)
      } else {
        const primeiro = new Date(Date.UTC(ano, mes, 1)).getUTCDay()
        dia = 1 + ((dow - primeiro + 7) % 7) + (nth - 1) * 7
      }
      if (limite !== null && Date.UTC(ano, mes, dia) > limite) break
      if (!adicionar(Date.UTC(ano, mes, dia))) break
    }
  } else {
    const diaDoMes = parede.getUTCDate()
    for (let k = 0; k < 600; k++) {
      const mes = parede.getUTCMonth() + k * intervalo
      const ano = parede.getUTCFullYear()
      const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
      // dia 31 em mês curto cai no último dia do mês
      if (!adicionar(Date.UTC(ano, mes, Math.min(diaDoMes, ultimo)))) return resultado
    }
  }
  return resultado
}
