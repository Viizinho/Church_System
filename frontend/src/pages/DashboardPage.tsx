import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Cake, Gift, HeartHandshake, Users, Wrench } from 'lucide-react'
import api from '@/services/api'
import type { DashboardData } from '@/types'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
dayjs.locale('pt-br')

function statusManutVariant(s: string) {
  if (s === 'VENCIDO') return 'red'
  if (s === 'PROXIMO') return 'amber'
  if (s === 'SEM_REGISTRO') return 'gray'
  return 'green'
}
function statusManutLabel(s: string) {
  if (s === 'VENCIDO') return 'Vencido'
  if (s === 'PROXIMO') return 'Próximo'
  if (s === 'SEM_REGISTRO') return 'Sem registro'
  return 'Em dia'
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data)).catch(() => setErro(true))
  }, [])

  if (erro) return <div className="p-6"><p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">Não foi possível carregar o painel. Recarregue a página.</p></div>
  if (!data) return <Spinner />

  const metrics = [
    { label: 'Membros ativos', value: data.membros.total, icon: Users, to: '/membros' },
    { label: 'Eventos esta semana', value: data.eventosProximos.length, icon: CalendarDays, to: '/eventos' },
    { label: 'Aniversários', value: data.aniversariantes.length, icon: Cake, to: '/aniversarios' },
    { label: 'Alertas manutenção', value: data.manutencao.alertas, icon: Wrench, to: '/manutencao', alert: data.manutencao.alertas > 0 },
    { label: 'Contribuições pendentes', value: data.contribuicoesPendentes, icon: Gift, to: '/campanha', alert: data.contribuicoesPendentes > 0 },
    { label: 'Doações pendentes', value: data.doacoesPendentes, icon: HeartHandshake, to: '/mao-amiga', alert: data.doacoesPendentes > 0 },
  ]

  return (
    <div className="p-4 sm:p-6 2xl:px-10">
      <PageHeader title="Dashboard" subtitle={dayjs().format('dddd, D [de] MMMM [de] YYYY')} />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {metrics.map((m) => (
          <Link
            key={m.label}
            to={m.to}
            className={`group bg-white rounded-xl border p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300
              ${m.alert ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:border-primary-300'}`}
          >
            <m.icon size={20} className={`mb-2 ${m.alert ? 'text-red-500' : 'text-primary-500'}`} aria-hidden />
            <div className={`text-2xl font-semibold ${m.alert ? 'text-red-700' : 'text-gray-900'}`}>{m.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Alertas manutenção */}
        <Card>
          <CardHeader><span className="text-sm font-semibold text-gray-900">Alertas de manutenção</span></CardHeader>
          <CardBody className="divide-y divide-gray-50">
            {data.manutencao.itens.length === 0
              ? <p className="text-sm text-gray-400 py-4 text-center">Tudo em dia ✅</p>
              : data.manutencao.itens.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.nome}</p>
                    <p className="text-xs text-gray-500">
                      {a.ultimaManutencao ? `Última: ${dayjs(a.ultimaManutencao.data).format('DD/MM/YYYY')}` : 'Sem registro'}
                    </p>
                  </div>
                  <Badge variant={statusManutVariant(a.status) as any}>{statusManutLabel(a.status)}</Badge>
                </div>
              ))
            }
          </CardBody>
        </Card>

        {/* Aniversariantes */}
        <Card>
          <CardHeader><span className="text-sm font-semibold text-gray-900">Aniversariantes da semana</span></CardHeader>
          <CardBody className="divide-y divide-gray-50">
            {data.aniversariantes.length === 0
              ? <p className="text-sm text-gray-400 py-4 text-center">Nenhum esta semana</p>
              : data.aniversariantes.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600">
                    {m.nomeCompleto.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{m.nomeCompleto}</p>
                    <p className="text-xs text-gray-500">{m.cargos.map((c) => c.cargo.nome).join(', ')}</p>
                  </div>
                  <span className="text-xs font-medium text-primary-600">
                    {m.diffDias === 0 ? 'Hoje 🎉' : m.diffDias === 1 ? 'Amanhã' : `em ${m.diffDias}d`}
                  </span>
                </div>
              ))
            }
          </CardBody>
        </Card>
      </div>

      {/* Próximos eventos */}
      <Card>
        <CardHeader><span className="text-sm font-semibold text-gray-900">Próximos eventos</span></CardHeader>
        <CardBody className="divide-y divide-gray-50">
          {data.eventosProximos.length === 0
            ? <p className="text-sm text-gray-400 py-4 text-center">Nenhum evento nos próximos 7 dias</p>
            : data.eventosProximos.map((e) => (
              <div key={e.id} className="flex items-center gap-4 py-2.5">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-600 leading-none">{dayjs(e.inicio).format('DD')}</span>
                  <span className="text-[10px] text-primary-400 uppercase">{dayjs(e.inicio).format('MMM')}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{e.nome}</p>
                  <p className="text-xs text-gray-500">{dayjs(e.inicio).format('HH:mm')} · {e.local ?? '—'}</p>
                </div>
                <Badge variant={e.tipo === 'CULTO' ? 'purple' : e.tipo === 'REUNIAO' ? 'blue' : 'amber'}>
                  {e.tipo === 'CULTO' ? 'Culto' : e.tipo === 'REUNIAO' ? 'Reunião' : 'Especial'}
                </Badge>
              </div>
            ))
          }
        </CardBody>
      </Card>
    </div>
  )
}
