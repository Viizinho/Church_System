import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { Evento } from '@/types'
import dayjs from 'dayjs'

export default function EventosPublicosSection() {
  const [doMes, setDoMes] = useState<Evento[]>([])
  const [proximos, setProximos] = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api
      .get('/publico/eventos')
      .then((r) => {
        setDoMes(Array.isArray(r.data?.doMes) ? r.data.doMes : [])
        setProximos(Array.isArray(r.data?.proximos) ? r.data.proximos : [])
      })
      .catch(() => {
        setDoMes([])
        setProximos([])
      })
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) return <p className="text-gray-400 text-sm text-center py-8">Carregando eventos...</p>

  const eventos = doMes.length > 0 ? doMes : proximos

  if (eventos.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">Nenhum evento programado no momento.</p>
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto px-4">
      {eventos.map((evento) => (
        <div key={evento.id} className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-primary-50 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-base font-bold text-primary-600 leading-none">{dayjs(evento.inicio).format('DD')}</span>
              <span className="text-[10px] text-primary-400 uppercase">{dayjs(evento.inicio).format('MMM')}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{evento.nome}</p>
              <p className="text-xs text-gray-500">
                {dayjs(evento.inicio).format('HH:mm')}
                {evento.local ? ` · ${evento.local}` : ''}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
