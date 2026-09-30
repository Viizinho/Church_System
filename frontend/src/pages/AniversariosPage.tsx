import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { Membro } from '@/types'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import dayjs from 'dayjs'

type MembroAniv = Membro & { diffDias: number; proximoAniversario: string }

export default function AniversariosPage() {
  const [semana, setSemana] = useState<MembroAniv[]>([])
  const [mes, setMes] = useState<MembroAniv[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/membros/aniversariantes?periodo=semana'),
      api.get('/membros/aniversariantes?periodo=mes'),
    ]).then(([s, m]) => {
      setSemana(s.data)
      setMes(m.data.filter((m: MembroAniv) => m.diffDias > 7))
      setLoading(false)
    })
  }, [])

  function MembroRow({ m }: { m: MembroAniv }) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-600 flex-shrink-0">
          {m.nomeCompleto.charAt(0)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{m.nomeCompleto}</p>
          <p className="text-xs text-gray-500">{m.cargos.map((c) => c.cargo.nome).join(', ') || 'Membro'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-primary-600">
            {dayjs(m.dataNascimento).format('DD/MM')}
          </p>
          <p className="text-xs text-gray-500">
            {m.diffDias === 0 ? '🎉 Hoje!' : `em ${m.diffDias} dia${m.diffDias !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
    )
  }

  if (loading) return <Spinner />

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Aniversários</h1>
        <p className="text-sm text-gray-500">Apenas membros ativos</p>
      </div>

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
