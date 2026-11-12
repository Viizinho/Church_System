import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Search } from 'lucide-react'
import api from '@/services/api'
import type { Membro } from '@/types'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import OrdenacaoSelect from '@/components/ui/OrdenacaoSelect'
import AlternarVisao, { useVisao } from '@/components/ui/AlternarVisao'
import CalendarioMensal from '@/components/calendario/CalendarioMensal'
import { formatarDiaMes } from '@/utils/data'
import { aniversariosNoCalendario } from '@/utils/calendario'
import { chaveMesDia, compararTexto, ordenar, type OpcaoOrdenacao } from '@/utils/ordenacao'

type MembroAniv = Membro & { diffDias: number; proximoAniversario: string }

type Ordem = 'proximo' | 'nome' | 'calendario'
const OPCOES_ORDEM: OpcaoOrdenacao<Ordem>[] = [
  { valor: 'proximo', label: 'Mais próximos primeiro' },
  { valor: 'nome', label: 'Nome (A–Z)' },
  { valor: 'calendario', label: 'Data no ano (jan → dez)' },
]

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
  const [visao, setVisao] = useVisao('aniversarios')
  const [mes, setMes] = useState(dayjs().startOf('month'))
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('proximo')

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
    switch (ordem) {
      case 'nome': return ordenar(lista, (a, b) => compararTexto(a.nomeCompleto, b.nomeCompleto))
      case 'calendario': return ordenar(lista, (a, b) => chaveMesDia(a.dataNascimento).localeCompare(chaveMesDia(b.dataNascimento)) || compararTexto(a.nomeCompleto, b.nomeCompleto))
      default: return ordenar(lista, (a, b) => a.diffDias - b.diffDias || compararTexto(a.nomeCompleto, b.nomeCompleto))
    }
  }, [todos, busca, ordem])

  const semana = filtrados.filter((m) => m.diffDias <= 7)
  const proximas = filtrados.filter((m) => m.diffDias > 7 && m.diffDias <= 30)
  const depois = filtrados.filter((m) => m.diffDias > 30)

  const itensCalendario = useMemo(() => aniversariosNoCalendario(filtrados, mes), [filtrados, mes])
  const noMes = itensCalendario.length

  if (loading) return <Spinner />

  return (
    <div className="p-4 sm:p-6 2xl:px-10">
      <PageHeader title="Aniversários" subtitle="Apenas membros ativos" />
      {erro && <p role="alert" className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">Não foi possível carregar os aniversários.</p>}

      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-wrap items-center gap-3">
        <AlternarVisao value={visao} onChange={setVisao} />
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
        {visao === 'lista' && <OrdenacaoSelect value={ordem} onChange={setOrdem} opcoes={OPCOES_ORDEM} />}
      </div>

      {visao === 'calendario' ? (
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
