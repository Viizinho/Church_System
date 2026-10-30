import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { Membro } from '@/types'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import { formatarDiaMes } from '@/utils/data'

type MembroAniv = Membro & { diffDias: number; proximoAniversario: string }

export default function AniversariosPage() {
  const [semana, setSemana] = useState<MembroAniv[]>([])
  const [mes, setMes] = useState<MembroAniv[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    // Uma única chamada: o período "mês" já inclui a semana (diffDias ≤ 7)
    api.get<MembroAniv[]>('/membros/aniversariantes', { params: { periodo: 'mes' } })
      .then(({ data }) => {
        setSemana(data.filter((m) => m.diffDias <= 7))
        setMes(data.filter((m) => m.diffDias > 7))
      })
      .catch(() => setErro(true))
      .finally(() => setLoading(false))
  }, [])

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
          <p className="text-sm font-semibold text-primary-600">
            {formatarDiaMes(m.dataNascimento)}
          </p>
          <p className="text-xs text-gray-500">
            {m.diffDias === 0 ? '🎉 Hoje!' : m.diffDias === 1 ? 'Amanhã' : `em ${m.diffDias} dias`}
          </p>
        </div>
      </div>
    )
  }

  if (loading) return <Spinner />

  return (
    <div className="p-4 sm:p-6 2xl:px-10">
      <PageHeader title="Aniversários" subtitle="Apenas membros ativos" />
      {erro && <p role="alert" className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">Não foi possível carregar os aniversários.</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-900">🎂 Esta semana ({semana.length})</span>
          </CardHeader>
          <CardBody>
            {semana.length === 0
              ? <p className="text-sm text-gray-400 py-6 text-center">Nenhum aniversariante esta semana</p>
              : semana.map((m) => <MembroRow key={m.id} m={m} />)
            }
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-900">📅 Próximas semanas ({mes.length})</span>
          </CardHeader>
          <CardBody>
            {mes.length === 0
              ? <p className="text-sm text-gray-400 py-6 text-center">Nenhum nos próximos 30 dias</p>
              : mes.map((m) => <MembroRow key={m.id} m={m} />)
            }
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
