import { useEffect, useState } from 'react'

interface ItemCampanha {
  id: string
  nome: string
  descricao: string | null
  valorTotal: number
  valorArrecadado: number
  chavePix: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function CampanhaPublica() {
  const [itens, setItens] = useState<ItemCampanha[]>([])

  useEffect(() => {
    fetch(`${API_URL}/publico/campanha`)
      .then((r) => r.json())
      .then((data) => setItens(Array.isArray(data) ? data : []))
      .catch(() => setItens([]))
  }, [])

  // Atualização dinâmica: o backend emite um evento SSE sempre que uma
  // contribuição é confirmada, então o valor arrecadado some sem reload.
  useEffect(() => {
    const eventSource = new EventSource(`${API_URL}/publico/campanha/eventos`)

    eventSource.onmessage = (evento) => {
      const { itemId, valorArrecadado } = JSON.parse(evento.data)
      setItens((atual) =>
        atual.map((item) => (item.id === itemId ? { ...item, valorArrecadado } : item))
      )
    }

    return () => eventSource.close()
  }, [])

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {itens.map((item) => {
        const percentual = Math.min((item.valorArrecadado / item.valorTotal) * 100, 100)
        return (
          <div key={item.id} className="border rounded-xl p-5 bg-white shadow-sm">
            <h3 className="font-semibold text-slate-800">{item.nome}</h3>
            {item.descricao && <p className="text-sm text-slate-500 mt-1">{item.descricao}</p>}

            <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${percentual}%` }}
              />
            </div>

            <p className="mt-2 text-sm text-slate-600">
              R$ {item.valorArrecadado.toFixed(2)} de R$ {item.valorTotal.toFixed(2)}
            </p>

            <ContribuirBotao itemId={item.id} chavePix={item.chavePix} />
          </div>
        )
      })}
    </div>
  )
}

function ContribuirBotao({ itemId, chavePix }: { itemId: string; chavePix: string }) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function contribuir() {
    setEnviando(true)
    try {
      await fetch(`${API_URL}/publico/campanha/${itemId}/contribuir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeContribuidor: nome, valor: Number(valor) }),
      })
      setEnviado(true)
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return <p className="mt-3 text-sm text-emerald-600">Obrigado! Sua contribuição foi registrada e aguarda confirmação.</p>
  }

  return (
    <div className="mt-4">
      {!aberto ? (
        <button onClick={() => setAberto(true)} className="text-blue-700 text-sm font-medium">
          Quero contribuir
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Chave PIX: {chavePix}</p>
          <input
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          />
          <input
            placeholder="Valor (R$)"
            type="number"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={contribuir}
            disabled={enviando || !nome || !valor}
            className="w-full bg-blue-600 text-white rounded py-1.5 text-sm disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Confirmar contribuição'}
          </button>
        </div>
      )}
    </div>
  )
}
