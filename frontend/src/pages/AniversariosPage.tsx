import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, Printer, Search } from 'lucide-react'
import api from '@/services/api'
import type { Membro } from '@/types'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import AlternarVisao, { useVisao } from '@/components/ui/AlternarVisao'
import CalendarioMensal from '@/components/calendario/CalendarioMensal'
import { formatarDiaMes } from '@/utils/data'
import { aniversariosNoCalendario } from '@/utils/calendario'
import { compararTexto, ordenar } from '@/utils/ordenacao'

type MembroAniv = Membro & { diffDias: number; proximoAniversario: string }

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/** Visão "Ano": os 12 meses lado a lado, cada um com seus aniversariantes em ordem de dia. */
function AnoInteiro({ membros, ano, onMudarAno }: { membros: MembroAniv[]; ano: number; onMudarAno: (a: number) => void }) {
  const hoje = dayjs()
  const porMes = useMemo(() => {
    const meses: { dia: number; m: MembroAniv; idade: number }[][] = MESES.map(() => [])
    for (const m of membros) {
      if (!m.dataNascimento) continue
      const [anoNasc, mes, dia] = m.dataNascimento.slice(0, 10).split('-').map(Number)
      meses[mes - 1].push({ dia, m, idade: ano - anoNasc })
    }
    for (const lista of meses) lista.sort((a, b) => a.dia - b.dia || compararTexto(a.m.nomeCompleto, b.m.nomeCompleto))
    return meses
  }, [membros, ano])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:hidden">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Ano anterior" onClick={() => onMudarAno(ano - 1)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"><ChevronLeft size={16} /></button>
          <h3 className="w-16 text-center text-sm font-semibold text-gray-900" aria-live="polite">{ano}</h3>
          <button type="button" aria-label="Próximo ano" onClick={() => onMudarAno(ano + 1)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"><ChevronRight size={16} /></button>
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
          <Printer size={14} aria-hidden /> Imprimir
        </button>
      </div>
      <h2 className="hidden print:block text-lg font-semibold mb-3">Aniversariantes de {ano}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 print:grid-cols-3 print:gap-2">
        {porMes.map((lista, i) => {
          const atual = ano === hoje.year() && i === hoje.month()
          return (
            <section key={i} aria-label={MESES[i]} className={`bg-white rounded-xl border p-4 break-inside-avoid ${atual ? 'border-primary-300 ring-1 ring-primary-200' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold mb-2 ${atual ? 'text-primary-600' : 'text-gray-900'}`}>
                {MESES[i]} <span className="font-normal text-gray-400">({lista.length})</span>
              </h3>
              {lista.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum aniversariante</p>
              ) : (
                <ul className="space-y-1">
                  {lista.map(({ dia, m, idade }) => {
                    const ehHoje = ano === hoje.year() && i === hoje.month() && dia === hoje.date()
                    return (
                      <li key={m.id} className={`flex items-baseline gap-2 text-sm ${ehHoje ? 'bg-amber-50 rounded px-1 -mx-1' : ''}`}>
                        <span className="w-6 text-right font-semibold text-primary-600 tabular-nums">{String(dia).padStart(2, '0')}</span>
                        <span className="flex-1 text-gray-800 truncate">{m.nomeCompleto}{ehHoje && ' 🎉'}</span>
                        {idade > 0 && <span className="text-xs text-gray-400 whitespace-nowrap">{idade} anos</span>}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function MembroRow({ m }: { m: MembroAniv }) {
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 ${m.diffDias === 0 ? 'bg-amber-50 -mx-5 px-5 rounded-lg border-transparent' : ''}`}>
      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-600 flex-shrink-0">
        {m.nomeCompleto.charAt(0)}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{m.nomeCompleto}</p>
        <p className="text-xs text-gray-500">{m.cargos.map((c) => c.cargo.nome).join(', ') || 'Sem cargo'}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-primary-600">{formatarDiaMes(m.dataNascimento)}</p>
        <p className="text-xs text-gray-500">
          {m.diffDias === 0 ? '🎉 Hoje!' : m.diffDias === 1 ? 'Amanhã' : `em ${m.diffDias} dias`}
        </p>
      </div>
    </div>
  )
}

export default function AniversariosPage() {
  const [todos, setTodos] = useState<MembroAniv[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [visao, setVisao] = useVisao('aniversarios', 'lista', ['lista', 'calendario', 'ano'])
  const [mes, setMes] = useState(dayjs().startOf('month'))
  const [ano, setAno] = useState(dayjs().year())
  const [busca, setBusca] = useState('')

  useEffect(() => {
    // Todos os membros ativos com data de nascimento: a lista separa por período e o calendário usa o mês exibido
    api.get<MembroAniv[]>('/membros/aniversariantes', { params: { periodo: 'todos' } })
      .then(({ data }) => setTodos(data))
      .catch(() => setErro(true))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const lista = q ? todos.filter((m) => m.nomeCompleto.toLowerCase().includes(q)) : todos
    // Lista sempre do aniversário mais próximo para o mais distante
    return ordenar(lista, (a, b) => a.diffDias - b.diffDias || compararTexto(a.nomeCompleto, b.nomeCompleto))
  }, [todos, busca])

  const semana = filtrados.filter((m) => m.diffDias <= 7)
  const proximas = filtrados.filter((m) => m.diffDias > 7 && m.diffDias <= 30)
  const depois = filtrados.filter((m) => m.diffDias > 30)

  const itensCalendario = useMemo(() => aniversariosNoCalendario(filtrados, mes), [filtrados, mes])
  const noMes = itensCalendario.length

  if (loading) return <Spinner />

  return (
    <div className="p-4 sm:p-6 2xl:px-10">
      <div className="print:hidden"><PageHeader title="Aniversários" subtitle="Apenas membros ativos" /></div>
      {erro && <p role="alert" className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">Não foi possível carregar os aniversários.</p>}

      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <AlternarVisao value={visao} onChange={setVisao} comAno />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo nome"
            aria-label="Buscar aniversariante"
            className="w-full h-9 rounded-lg border border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {visao === 'ano' ? (
        <AnoInteiro membros={filtrados} ano={ano} onMudarAno={setAno} />
      ) : visao === 'calendario' ? (
        <>
          <p className="text-xs text-gray-500 mb-2">{noMes} {noMes === 1 ? 'aniversário' : 'aniversários'} em {mes.format('MMMM')}</p>
          <CalendarioMensal
            mes={mes}
            onMudarMes={setMes}
            itens={itensCalendario}
            vazioDia="Nenhum aniversariante neste dia."
            legenda={[{ cor: 'pink', texto: 'Aniversário' }]}
          />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <span className="text-sm font-semibold text-gray-900">🎂 Esta semana ({semana.length})</span>
              </CardHeader>
              <CardBody>
                {semana.length === 0
                  ? <p className="text-sm text-gray-400 py-6 text-center">Nenhum aniversariante esta semana</p>
                  : semana.map((m) => <MembroRow key={m.id} m={m} />)}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <span className="text-sm font-semibold text-gray-900">📅 Próximas semanas ({proximas.length})</span>
              </CardHeader>
              <CardBody>
                {proximas.length === 0
                  ? <p className="text-sm text-gray-400 py-6 text-center">Nenhum nos próximos 30 dias</p>
                  : proximas.map((m) => <MembroRow key={m.id} m={m} />)}
              </CardBody>
            </Card>
          </div>

          {depois.length > 0 && (
            <details className="mt-4 bg-white rounded-xl border border-gray-200 group" open={!!busca.trim()}>
              <summary className="cursor-pointer select-none px-5 py-4 text-sm font-semibold text-gray-900">
                Mais adiante ({depois.length})
              </summary>
              <div className="px-5 pb-4">
                {depois.map((m) => <MembroRow key={m.id} m={m} />)}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
