import { FormEvent, useEffect, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'

interface MetaCesta {
  id: string
  nomeItem: string
  unidade: string
  restante: number
  completo: boolean
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function MaoAmigaForm() {
  const { token } = useAuth()
  const [metas, setMetas] = useState<MetaCesta[]>([])
  const [metaSelecionada, setMetaSelecionada] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [nomeDoador, setNomeDoador] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function carregarMetas() {
    const resp = await fetch(`${API_URL}/mao-amiga/metas`, { headers: { Authorization: `Bearer ${token}` } })
    setMetas(await resp.json())
  }

  useEffect(() => {
    carregarMetas()
  }, [token])

  const meta = metas.find((m) => m.id === metaSelecionada)
  // A quantidade máxima permitida no input é sempre limitada ao que ainda falta —
  // é isso que impede doar repetidamente o mesmo item e direciona para o que falta.
  const maximoPermitido = meta?.restante ?? 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(false)

    const valorNumerico = Number(quantidade)
    if (meta && valorNumerico > meta.restante) {
      setErro(`Só restam ${meta.restante} ${meta.unidade} de "${meta.nomeItem}".`)
      return
    }

    setEnviando(true)
    try {
      const resp = await fetch(`${API_URL}/mao-amiga/doacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nomeDoador,
          data: new Date().toISOString().slice(0, 10),
          itemDoado: meta?.nomeItem ?? '',
          quantidade: `${quantidade} ${meta?.unidade ?? ''}`,
          quantidadeNumerica: valorNumerico,
          metaCestaId: metaSelecionada || null,
          tipo: 'FISICA',
        }),
      })

      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error ?? 'Erro ao registrar doação.')
      }

      setSucesso(true)
      setQuantidade('')
      setNomeDoador('')
      await carregarMetas() // baixa dinâmica: recarrega o "restante" imediatamente
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Registrar doação — Mão Amiga</h1>

      <div>
        <label className="block text-sm font-medium mb-1">Doador</label>
        <input
          value={nomeDoador}
          onChange={(e) => setNomeDoador(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Item</label>
        <select
          value={metaSelecionada}
          onChange={(e) => {
            setMetaSelecionada(e.target.value)
            setQuantidade('')
          }}
          required
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Selecione o item que precisa</option>
          {metas
            .filter((m) => !m.completo)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.nomeItem} — faltam {m.restante} {m.unidade}
              </option>
            ))}
        </select>
        {metas.every((m) => m.completo) && (
          <p className="text-sm text-emerald-600 mt-1">Todas as metas já foram atingidas! 🎉</p>
        )}
      </div>

      {meta && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Quantidade ({meta.unidade}) — máximo {maximoPermitido}
          </label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            max={maximoPermitido}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
      )}

      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      {sucesso && <p className="text-emerald-600 text-sm">Doação registrada com sucesso!</p>}

      <button
        type="submit"
        disabled={enviando || !meta}
        className="bg-blue-600 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
      >
        {enviando ? 'Registrando...' : 'Registrar doação'}
      </button>
    </form>
  )
}
