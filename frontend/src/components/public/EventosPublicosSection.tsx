import { useEffect, useMemo, useState } from 'react'
import api from '@/services/api'
import type { Evento } from '@/types'
import dayjs from 'dayjs'
import AlternarVisao, { useVisao } from '@/components/ui/AlternarVisao'
import CalendarioMensal from '@/components/calendario/CalendarioMensal'
import { eventosNoCalendario, legendaEventos } from '@/utils/calendario'

export default function EventosPublicosSection() {
  const [visao, setVisao] = useVisao('programacao-publica')

  // Lista: mês atual (ou os próximos, se o mês já acabou)
  const [doMes, setDoMes] = useState<Evento[]>([])
  const [proximos, setProximos] = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)

  // Calendário: mês escolhido pelo visitante
  const [mes, setMes] = useState(dayjs().startOf('month'))
  const [doMesCal, setDoMesCal] = useState<Evento[]>([])
  const [carregandoCal, setCarregandoCal] = useState(false)

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

  useEffect(() => {
    if (visao !== 'calendario') return
    // O mês atual já veio na primeira carga
    if (mes.isSame(dayjs(), 'month') && !carregando) { setDoMesCal(doMes); return }
    let ativo = true
    setCarregandoCal(true)
    api
      .get('/publico/eventos', { params: { mes: mes.month() + 1, ano: mes.year() } })
      .then((r) => { if (ativo) setDoMesCal(Array.isArray(r.data?.doMes) ? r.data.doMes : []) })
      .catch(() => { if (ativo) setDoMesCal([]) })
      .finally(() => { if (ativo) setCarregandoCal(false) })
    return () => { ativo = false }
  }, [visao, mes, carregando, doMes])

  const itensCalendario = useMemo(() => eventosNoCalendario(doMesCal), [doMesCal])

  if (carregando) return <p className="text-gray-400 text-sm text-center py-8">Carregando eventos...</p>

  const eventos = doMes.length > 0 ? doMes : proximos

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex justify-center mb-5">
        <AlternarVisao value={visao} onChange={setVisao} className="bg-white" />
      </div>

      {visao === 'calendario' ? (
        <CalendarioMensal
          mes={mes}
          onMudarMes={setMes}
          itens={itensCalendario}
          carregando={carregandoCal}
          legenda={legendaEventos}
          vazioDia="Nenhum evento programado neste dia."
        />
      ) : eventos.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Nenhum evento programado no momento.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      )}
    </div>
  )
}
