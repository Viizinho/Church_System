import { ReactNode, useEffect, useMemo, useState } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/pt-br'
import { ChevronLeft, ChevronRight } from 'lucide-react'

dayjs.locale('pt-br')

export type CorCalendario = 'purple' | 'blue' | 'amber' | 'pink' | 'green'

export interface ItemCalendario {
  id: string
  /** Dia no formato YYYY-MM-DD */
  dia: string
  titulo: string
  /** Ex.: "19:30" */
  hora?: string
  /** Linha secundária (local, idade, …) */
  detalhe?: string
  cor: CorCalendario
  /** Ícone/emoji antes do título */
  marcador?: ReactNode
  /** Esmaecer (ex.: evento que já passou) */
  apagado?: boolean
  onClick?: () => void
}

interface Props {
  mes: Dayjs
  onMudarMes: (mes: Dayjs) => void
  itens: ItemCalendario[]
  carregando?: boolean
  /** Só pontinhos nos dias (para cartões pequenos, como no dashboard). */
  compacto?: boolean
  legenda?: { cor: CorCalendario; texto: string }[]
  /** Texto quando o dia escolhido não tem nada */
  vazioDia?: string
  /** Conteúdo extra no painel do dia (ex.: botão "Novo evento neste dia") */
  acoesDia?: (dia: Dayjs) => ReactNode
}

const chip: Record<CorCalendario, string> = {
  purple: 'bg-primary-50 text-primary-700',
  blue: 'bg-blue-50 text-blue-800',
  amber: 'bg-amber-50 text-amber-800',
  pink: 'bg-pink-50 text-pink-700',
  green: 'bg-green-50 text-green-800',
}
const ponto: Record<CorCalendario, string> = {
  purple: 'bg-primary-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  pink: 'bg-pink-500',
  green: 'bg-green-500',
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Calendário mensal (domingo a sábado) com os itens de cada dia e um painel do dia escolhido. */
export default function CalendarioMensal({ mes, onMudarMes, itens, carregando, compacto, legenda, vazioDia = 'Nada neste dia.', acoesDia }: Props) {
  const hoje = dayjs().format('YYYY-MM-DD')
  const [selecionado, setSelecionado] = useState<string>(() => (dayjs().isSame(mes, 'month') ? hoje : mes.startOf('month').format('YYYY-MM-DD')))

  // Ao trocar de mês: hoje (se for o mês atual) ou o dia 1
  useEffect(() => {
    if (!dayjs(selecionado).isSame(mes, 'month')) {
      setSelecionado(dayjs().isSame(mes, 'month') ? hoje : mes.startOf('month').format('YYYY-MM-DD'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes])

  const porDia = useMemo(() => {
    const mapa = new Map<string, ItemCalendario[]>()
    for (const it of itens) mapa.set(it.dia, [...(mapa.get(it.dia) ?? []), it])
    for (const lista of mapa.values()) lista.sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''))
    return mapa
  }, [itens])

  const semanas = useMemo(() => {
    const inicio = mes.startOf('month').startOf('week')
    const fim = mes.endOf('month').endOf('week')
    const dias: Dayjs[] = []
    for (let d = inicio; !d.isAfter(fim, 'day'); d = d.add(1, 'day')) dias.push(d)
    const linhas: Dayjs[][] = []
    for (let i = 0; i < dias.length; i += 7) linhas.push(dias.slice(i, i + 7))
    return linhas
  }, [mes])

  const doDia = porDia.get(selecionado) ?? []
  const diaSel = dayjs(selecionado)
  const limiteChips = 3

  return (
    <div>
      {/* Navegação */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Mês anterior" onClick={() => onMudarMes(mes.subtract(1, 'month'))} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300">
            <ChevronLeft size={16} />
          </button>
          <h3 className="min-w-[9.5rem] text-center text-sm font-semibold text-gray-900" aria-live="polite">{maiuscula(mes.format('MMMM [de] YYYY'))}</h3>
          <button type="button" aria-label="Próximo mês" onClick={() => onMudarMes(mes.add(1, 'month'))} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300">
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => { onMudarMes(dayjs().startOf('month')); setSelecionado(hoje) }}
            disabled={mes.isSame(dayjs(), 'month') && selecionado === hoje}
            className="ml-1 px-2.5 h-8 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Hoje
          </button>
        </div>
        {legenda && legenda.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {legenda.map((l) => (
              <span key={l.texto} className="inline-flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${ponto[l.cor]}`} />{l.texto}</span>
            ))}
          </div>
        )}
      </div>

      {/* Grade */}
      <div className={`rounded-xl border border-gray-200 overflow-hidden bg-white transition-opacity ${carregando ? 'opacity-60' : ''}`} aria-busy={carregando}>
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {DIAS.map((d) => <div key={d} className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-gray-500">{d}</div>)}
        </div>
        <div role="grid" aria-label={`Calendário de ${mes.format('MMMM [de] YYYY')}`}>
          {semanas.map((semana, i) => (
            <div role="row" key={i} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
              {semana.map((d) => {
                const chave = d.format('YYYY-MM-DD')
                const doMes = d.isSame(mes, 'month')
                const lista = porDia.get(chave) ?? []
                const ehHoje = chave === hoje
                const ehSel = chave === selecionado
                return (
                  <button
                    role="gridcell"
                    type="button"
                    key={chave}
                    onClick={() => { setSelecionado(chave); if (!doMes) onMudarMes(d.startOf('month')) }}
                    aria-selected={ehSel}
                    aria-label={`${d.format('D [de] MMMM')}${lista.length ? `, ${lista.length} ${lista.length === 1 ? 'item' : 'itens'}` : ''}`}
                    className={`relative flex flex-col items-stretch justify-start text-left border-r border-gray-100 last:border-r-0 p-1 sm:p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-300
                      ${compacto ? 'h-12 sm:h-14' : 'h-14 sm:h-24 lg:h-28'}
                      ${doMes ? 'bg-white hover:bg-primary-50/40' : 'bg-gray-50/70 text-gray-400'}
                      ${ehSel ? '!bg-primary-50 ring-2 ring-inset ring-primary-400' : ''}`}
                  >
                    <span className={`self-start inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${ehHoje ? 'bg-primary-500 text-white' : doMes ? 'text-gray-700' : 'text-gray-400'}`}>
                      {d.date()}
                    </span>

                    {lista.length > 0 && (
                      <>
                        {/* Pontinhos: sempre no compacto; no celular também */}
                        <span className={`absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-0.5 ${compacto ? '' : 'sm:hidden'}`}>
                          {lista.slice(0, 4).map((it) => <span key={it.id} className={`w-1.5 h-1.5 rounded-full ${ponto[it.cor]}`} />)}
                          {lista.length > 4 && <span className="text-[9px] leading-none text-gray-500">+</span>}
                        </span>
                        {!compacto && (
                          <span className="hidden sm:flex flex-col gap-0.5 mt-0.5">
                            {lista.slice(0, limiteChips).map((it) => (
                              <span key={it.id} className={`truncate rounded px-1 py-px text-[11px] leading-tight ${chip[it.cor]} ${it.apagado ? 'opacity-60' : ''}`}>
                                {it.hora && <span className="font-semibold">{it.hora} </span>}{it.titulo}
                              </span>
                            ))}
                            {lista.length > limiteChips && <span className="text-[11px] text-gray-500 px-1">+{lista.length - limiteChips} mais</span>}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Painel do dia escolhido */}
      <div className="mt-3 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">
            {maiuscula(diaSel.format('dddd, D [de] MMMM'))}
            {selecionado === hoje && <span className="ml-2 text-xs font-medium bg-primary-500 text-white rounded-full px-2 py-0.5">Hoje</span>}
          </p>
          {acoesDia?.(diaSel)}
        </div>
        {doDia.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-400 text-center">{vazioDia}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {doDia.map((it) => {
              const conteudo = (
                <>
                  <span className={`w-1 self-stretch rounded-full ${ponto[it.cor]}`} aria-hidden />
                  {it.hora && <span className="w-12 text-sm font-bold text-primary-600">{it.hora}</span>}
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">{it.marcador} {it.titulo}</span>
                    {it.detalhe && <span className="block text-xs text-gray-500 truncate">{it.detalhe}</span>}
                  </span>
                </>
              )
              return (
                <li key={it.id} className={it.apagado ? 'opacity-60' : ''}>
                  {it.onClick ? (
                    <button type="button" onClick={it.onClick} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50">
                      {conteudo}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5">{conteudo}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
