import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

interface Evento {
  id: string
  nome: string
  local: string | null
  inicio: string
  tipo: 'CULTO' | 'REUNIAO' | 'ESPECIAL'
  recorrencia: 'NENHUMA' | 'SEMANAL' | 'MENSAL' | 'PERSONALIZADA'
  eventoPaiId: string | null
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

const NOME_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function EventosLista() {
  const { token } = useAuth()
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [eventos, setEventos] = useState<Evento[]>([])
  const [carregando, setCarregando] = useState(true)

  function carregar() {
    setCarregando(true)
    fetch(`${API_URL}/eventos?mes=${mes}&ano=${ano}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setEventos)
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano, token])

  async function remover(id: string) {
    if (!confirm('Remover este evento? Se ele fizer parte de uma recorrência, as demais ocorrências permanecem.')) return
    await fetch(`${API_URL}/eventos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    carregar()
  }

  function mudarMes(delta: number) {
    let novoMes = mes + delta
    let novoAno = ano
    if (novoMes > 12) {
      novoMes = 1
      novoAno++
    } else if (novoMes < 1) {
      novoMes = 12
      novoAno--
    }
    setMes(novoMes)
    setAno(novoAno)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Eventos</h1>
        <Link to="/admin/eventos/novo" className="bg-blue-600 text-white px-4 py-2 rounded">
          Novo evento
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => mudarMes(-1)} className="px-3 py-1 border rounded">
          ‹
        </button>
        <span className="font-medium">
          {NOME_MES[mes - 1]} de {ano}
        </span>
        <button onClick={() => mudarMes(1)} className="px-3 py-1 border rounded">
          ›
        </button>
      </div>

      {carregando ? (
        <p className="text-slate-500">Carregando...</p>
      ) : eventos.length === 0 ? (
        <p className="text-slate-500">Nenhum evento neste mês.</p>
      ) : (
        <table className="w-full text-sm bg-white rounded shadow overflow-hidden">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Nome</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Recorrência</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {eventos.map((ev) => (
              <tr key={ev.id} className="border-t">
                <td className="p-3">
                  {new Date(ev.inicio).toLocaleDateString('pt-BR')}{' '}
                  {new Date(ev.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="p-3">{ev.nome}</td>
                <td className="p-3">{ev.tipo}</td>
                <td className="p-3">
                  {ev.recorrencia === 'PERSONALIZADA'
                    ? ev.eventoPaiId
                      ? 'Ocorrência gerada'
                      : 'Recorrente (personalizada)'
                    : ev.recorrencia}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => remover(ev.id)} className="text-red-600 text-xs">
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
