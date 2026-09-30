import { FormEvent, useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'

interface ItemCampanha {
  id: string
  nome: string
  valorTotal: number
  valorArrecadado: number
  chavePix: string
  ativo: boolean
}

interface ContribuicaoPendente {
  id: string
  nomeContribuidor: string
  valor: number
  comprovanteUrl: string | null
  criadoEm: string
  item: { id: string; nome: string }
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function CampanhaAdmin() {
  const { token } = useAuth()
  const [itens, setItens] = useState<ItemCampanha[]>([])
  const [pendentes, setPendentes] = useState<ContribuicaoPendente[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)

  function carregarItens() {
    fetch(`${API_URL}/campanha/itens`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setItens)
  }

  function carregarPendentes() {
    fetch(`${API_URL}/campanha/contribuicoes/pendentes`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setPendentes)
  }

  useEffect(() => {
    carregarItens()
    carregarPendentes()
  }, [token])

  async function confirmar(id: string) {
    await fetch(`${API_URL}/campanha/contribuicoes/${id}/confirmar`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    carregarPendentes()
    carregarItens()
  }

  async function recusar(id: string) {
    const motivo = prompt('Motivo da recusa (opcional):') ?? ''
    await fetch(`${API_URL}/campanha/contribuicoes/${id}/recusar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ motivoRecusa: motivo || null }),
    })
    carregarPendentes()
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Campanha — Itens</h1>
          <button onClick={() => setMostrarForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded">
            Novo item
          </button>
        </div>

        <table className="w-full text-sm bg-white rounded shadow overflow-hidden">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">Item</th>
              <th className="p-3">Arrecadado</th>
              <th className="p-3">Meta</th>
              <th className="p-3">Progresso</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3">{item.nome}</td>
                <td className="p-3">R$ {item.valorArrecadado.toFixed(2)}</td>
                <td className="p-3">R$ {item.valorTotal.toFixed(2)}</td>
                <td className="p-3">{Math.min(Math.round((item.valorArrecadado / item.valorTotal) * 100), 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Contribuições pendentes</h2>
        {pendentes.length === 0 ? (
          <p className="text-slate-500">Nenhuma contribuição pendente.</p>
        ) : (
          <ul className="space-y-3">
            {pendentes.map((c) => (
              <li key={c.id} className="bg-white border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {c.nomeContribuidor} — R$ {c.valor.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Item: {c.item.nome} · {new Date(c.criadoEm).toLocaleDateString('pt-BR')}
                  </p>
                  {c.comprovanteUrl && (
                    <a href={c.comprovanteUrl} target="_blank" rel="noreferrer" className="text-blue-700 text-sm">
                      Ver comprovante
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => confirmar(c.id)} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm">
                    Confirmar
                  </button>
                  <button onClick={() => recusar(c.id)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm">
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mostrarForm && (
        <FormNovoItem
          onFechar={() => setMostrarForm(false)}
          onSalvo={() => {
            setMostrarForm(false)
            carregarItens()
          }}
        />
      )}
    </div>
  )
}

function FormNovoItem({ onFechar, onSalvo }: { onFechar: () => void; onSalvo: () => void }) {
  const { token } = useAuth()
  const [nome, setNome] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [chavePix, setChavePix] = useState('')
  const [whatsappTesoureiro, setWhatsappTesoureiro] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      const resp = await fetch(`${API_URL}/campanha/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nome,
          valorTotal: Number(valorTotal),
          chavePix,
          whatsappTesoureiro,
          ativo: true,
          ordem: 0,
        }),
      })
      if (!resp.ok) {
        const body = await resp.json()
        throw new Error(body.error ?? 'Erro ao criar item.')
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
        <h2 className="font-bold text-lg">Novo item da campanha</h2>

        <input placeholder="Nome do item" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full border rounded px-3 py-2" />
        <input
          placeholder="Valor total (R$)"
          type="number"
          value={valorTotal}
          onChange={(e) => setValorTotal(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
        <input placeholder="Chave PIX" value={chavePix} onChange={(e) => setChavePix(e.target.value)} required className="w-full border rounded px-3 py-2" />
        <input
          placeholder="WhatsApp do tesoureiro"
          value={whatsappTesoureiro}
          onChange={(e) => setWhatsappTesoureiro(e.target.value)}
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
