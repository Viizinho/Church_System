import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { ItemCampanha } from '@/types'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'

const valoresSugeridos = [50, 100, 250, 500]

export default function CampanhaPublicaPage() {
  const [itens, setItens] = useState<ItemCampanha[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ItemCampanha | null>(null)
  const [valor, setValor] = useState<number | null>(null)
  const [valorCustom, setValorCustom] = useState('')
  const [nome, setNome] = useState('')
  const [etapa, setEtapa] = useState<'selecao' | 'pix'>('selecao')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/campanha/itens').then((r) => { setItens(r.data); setLoading(false) })
  }, [])

  // Atualização dinâmica: o backend emite um evento sempre que uma contribuição
  // é confirmada, então o valor arrecadado atualiza sem precisar recarregar a página.
  useEffect(() => {
    const baseURL = (api.defaults.baseURL ?? '/api').replace(/\/$/, '')
    const eventSource = new EventSource(`${baseURL}/publico/campanha/eventos`)

    eventSource.onmessage = (evento) => {
      try {
        const { itemId, valorArrecadado } = JSON.parse(evento.data)
        setItens((atual) => atual.map((item) => (item.id === itemId ? { ...item, valorArrecadado } : item)))
      } catch {
        // ignora mensagens mal formadas
      }
    }

    return () => eventSource.close()
  }, [])

  function selectItem(item: ItemCampanha) {
    setSelected(item)
    setValor(null)
    setValorCustom('')
    setNome('')
    setEtapa('selecao')
  }

  async function handleContribuir() {
    if (!selected) return
    const v = valor ?? Number(valorCustom)
    if (!v || !nome) return
    setSaving(true)
    await api.post(`/publico/campanha/${selected.id}/contribuir`, { nomeContribuidor: nome, valor: v })
    setSaving(false)
    setEtapa('pix')
  }

  function abrirWhatsApp(item: ItemCampanha) {
    const msg = encodeURIComponent(`Olá! Quero enviar o comprovante da minha contribuição para o item "${item.nome}" da Campanha Jardim Cidade Universitária.`)
    window.open(`https://wa.me/${item.whatsappTesoureiro}?text=${msg}`, '_blank')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary-600 text-white py-10 px-4 text-center">
        <div className="text-4xl mb-3">⛪</div>
        <h1 className="text-2xl font-bold">Campanha Jardim Cidade Universitária</h1>
        <p className="text-primary-200 mt-2 max-w-md mx-auto text-sm">Cada contribuição ajuda a equipar nossa igreja. Escolha um item e colabore com o valor que puder.</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {itens.map((item) => {
            const pct = Math.min(100, (item.valorArrecadado / item.valorTotal) * 100)
            const done = pct >= 100
            return (
              <div key={item.id} onClick={() => !done && selectItem(item)}
                className={`bg-white rounded-2xl border-2 p-5 transition-all ${done ? 'opacity-60 cursor-not-allowed border-gray-200' : 'border-gray-200 hover:border-primary-400 cursor-pointer'}`}>
                <p className="font-semibold text-gray-900 mb-1">{item.nome}</p>
                {item.descricao && <p className="text-xs text-gray-500 mb-3">{item.descricao}</p>}
                <div className="flex items-center gap-1 text-sm mb-2">
                  <span className="font-semibold text-gray-900">R$ {Number(item.valorArrecadado).toFixed(2)}</span>
                  <span className="text-gray-400">de R$ {Number(item.valorTotal).toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className={`h-2 rounded-full ${done ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-xs font-medium ${done ? 'text-green-600' : 'text-primary-600'}`}>
                  {done ? '✓ Concluído' : `${pct.toFixed(0)}% arrecadado`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.nome ?? ''}>
        {etapa === 'selecao' ? (
          <div className="space-y-4">
            <Input label="Seu nome *" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como você quer ser identificado" />
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Quanto você quer contribuir?</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {valoresSugeridos.map((v) => (
                  <button key={v} type="button" onClick={() => { setValor(v); setValorCustom('') }}
                    className={`py-2.5 rounded-lg text-sm border transition-colors ${valor === v ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 text-gray-700 hover:border-primary-400'}`}>
                    R$ {v}
                  </button>
                ))}
                <button type="button" onClick={() => { setValor(null) }}
                  className={`col-span-2 py-2.5 rounded-lg text-sm border transition-colors ${!valor && !valorCustom ? 'border-gray-300' : valor === null ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 text-gray-700 hover:border-primary-400'}`}>
                  Valor inteiro — R$ {Number(selected?.valorTotal ?? 0).toFixed(2)}
                </button>
              </div>
              <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 h-10">
                <span className="text-sm text-gray-500">R$</span>
                <input type="number" placeholder="Outro valor" value={valorCustom}
                  onChange={(e) => { setValorCustom(e.target.value); setValor(null) }}
                  className="flex-1 text-sm outline-none bg-transparent" />
              </div>
            </div>
            <Button className="w-full justify-center" onClick={handleContribuir} loading={saving}
              disabled={!nome || (!valor && !valorCustom)}>
              Ver chave Pix →
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-primary-50 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Chave Pix</p>
                <p className="font-semibold text-gray-900">{selected?.chavePix}</p>
              </div>
              <button onClick={() => navigator.clipboard.writeText(selected?.chavePix ?? '')}
                className="text-xs text-primary-600 border border-primary-300 rounded-lg px-2 py-1 hover:bg-primary-100">
                Copiar
              </button>
            </div>
            <p className="text-sm text-gray-500">Após realizar o Pix, envie o comprovante pelo WhatsApp para confirmar sua contribuição.</p>
            <Button className="w-full justify-center bg-green-600 hover:bg-green-700" onClick={() => selected && abrirWhatsApp(selected)}>
              📱 Enviar comprovante no WhatsApp
            </Button>
            <Button variant="secondary" className="w-full justify-center" onClick={() => setSelected(null)}>
              Voltar aos itens
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
