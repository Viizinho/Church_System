import { FormEvent, useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'

type StatusManutencao = 'EM_DIA' | 'PROXIMO' | 'VENCIDO' | 'SEM_REGISTRO'

interface Ativo {
  id: string
  nome: string
  periodicidadeDias: number
  ultimaManutencao: { data: string } | null
  proximaManutencao: string | null
  status: StatusManutencao
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

const ESTILO_STATUS: Record<StatusManutencao, string> = {
  EM_DIA: 'bg-emerald-100 text-emerald-700',
  PROXIMO: 'bg-amber-100 text-amber-700',
  VENCIDO: 'bg-red-100 text-red-700',
  SEM_REGISTRO: 'bg-slate-100 text-slate-600',
}

const LABEL_STATUS: Record<StatusManutencao, string> = {
  EM_DIA: 'Em dia',
  PROXIMO: 'Próximo do vencimento',
  VENCIDO: 'Vencido',
  SEM_REGISTRO: 'Sem registro',
}

export function AtivosLista() {
  const { token } = useAuth()
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [ativoParaManutencao, setAtivoParaManutencao] = useState<string | null>(null)

  function carregar() {
    fetch(`${API_URL}/ativos`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setAtivos)
  }

  useEffect(carregar, [token])

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Manutenção de Ativos</h1>

      <table className="w-full text-sm bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="p-3">Ativo</th>
            <th className="p-3">Última manutenção</th>
            <th className="p-3">Próxima</th>
            <th className="p-3">Status</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {ativos.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="p-3">{a.nome}</td>
              <td className="p-3">
                {a.ultimaManutencao ? new Date(a.ultimaManutencao.data).toLocaleDateString('pt-BR') : '—'}
              </td>
              <td className="p-3">
                {a.proximaManutencao ? new Date(a.proximaManutencao).toLocaleDateString('pt-BR') : '—'}
              </td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTILO_STATUS[a.status]}`}>
                  {LABEL_STATUS[a.status]}
                </span>
              </td>
              <td className="p-3 text-right">
                <button onClick={() => setAtivoParaManutencao(a.id)} className="text-blue-700 text-xs font-medium">
                  Registrar manutenção
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {ativoParaManutencao && (
        <ModalRegistrarManutencao
          ativoId={ativoParaManutencao}
          onFechar={() => setAtivoParaManutencao(null)}
          onSalvo={() => {
            setAtivoParaManutencao(null)
            carregar()
          }}
        />
      )}
    </div>
  )
}

function ModalRegistrarManutencao({
  ativoId,
  onFechar,
  onSalvo,
}: {
  ativoId: string
  onFechar: () => void
  onSalvo: () => void
}) {
  const { token } = useAuth()
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [descricao, setDescricao] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      const resp = await fetch(`${API_URL}/ativos/${ativoId}/manutencoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data, descricao, responsavel }),
      })
      if (!resp.ok) {
        const body = await resp.json()
        throw new Error(body.error ?? 'Erro ao registrar manutenção.')
      }
      onSalvo()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-sm space-y-3">
        <h2 className="font-bold text-lg">Registrar manutenção</h2>

        <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="w-full border rounded px-3 py-2" />
        <input
          placeholder="Descrição"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
        <input
          placeholder="Responsável"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onFechar} className="px-4 py-2 text-slate-600">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
