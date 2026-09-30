import { useEffect, useState } from 'react'

interface Evento {
  id: string
  nome: string
  local: string | null
  inicio: string
  tipo: 'CULTO' | 'REUNIAO' | 'ESPECIAL'
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function EventosPublicos() {
  const [doMes, setDoMes] = useState<Evento[]>([])
  const [proximos, setProximos] = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/publico/eventos`)
      .then((r) => r.json())
      .then((data) => {
        setDoMes(Array.isArray(data?.doMes) ? data.doMes : [])
        setProximos(Array.isArray(data?.proximos) ? data.proximos : [])
      })
      .catch(() => {
        setDoMes([])
        setProximos([])
      })
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) return <p className="text-slate-500">Carregando eventos...</p>

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h3 className="font-semibold text-slate-700 mb-3">Este mês</h3>
        {doMes.length === 0 && <p className="text-slate-500 text-sm">Nenhum evento cadastrado este mês.</p>}
        <ul className="space-y-3">
          {doMes.map((evento) => (
            <EventoCard key={evento.id} evento={evento} />
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-slate-700 mb-3">Próximos 5 eventos</h3>
        <ul className="space-y-3">
          {proximos.map((evento) => (
            <EventoCard key={evento.id} evento={evento} />
          ))}
        </ul>
      </div>
    </div>
  )
}

function EventoCard({ evento }: { evento: Evento }) {
  const data = new Date(evento.inicio)
  return (
    <li className="border rounded-lg p-4 bg-white shadow-sm">
      <p className="font-medium text-slate-800">{evento.nome}</p>
      <p className="text-sm text-slate-500">
        {data.toLocaleDateString('pt-BR')} às {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        {evento.local ? ` — ${evento.local}` : ''}
      </p>
    </li>
  )
}
