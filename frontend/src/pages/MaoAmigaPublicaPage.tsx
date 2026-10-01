import { useEffect, useState } from 'react'
import api from '@/services/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const PIX_KEY = 'cesta.solidaria@gmail.com'
const WHATSAPP = '5583999990010'
const ITENS_ACEITOS = ['Arroz (pacote 5 kg)', 'Feijão (pacote 1 kg)', 'Macarrão', 'Óleo de cozinha', 'Leite em pó', 'Açúcar']

interface MetaCesta {
  id: string
  nomeItem: string
  unidade: string
  restante: number
  completo: boolean
}

export default function MaoAmigaPublicaPage() {
  const [nome, setNome] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [metas, setMetas] = useState<MetaCesta[]>([])

  useEffect(() => {
    api
      .get('/publico/mao-amiga/metas')
      .then((r) => setMetas(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMetas([]))
  }, [])

  async function handlePix() {
    if (!nome) return
    setSaving(true)
    await api.post('/publico/mao-amiga/pix', { nomeDoador: nome })
    setSaving(false)
    setEnviado(true)
    const msg = encodeURIComponent(`Olá! Sou ${nome} e quero enviar o comprovante do meu Pix para o Projeto Mão Amiga.`)
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white py-10 px-4 text-center">
        <div className="text-4xl mb-3">🤝</div>
        <h1 className="text-2xl font-bold">Projeto Mão Amiga</h1>
        <p className="text-green-200 mt-2 max-w-md mx-auto text-sm">Ajudamos famílias em situação de vulnerabilidade com doações de alimentos.</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        {metas.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">O que ainda está faltando para montar as cestas:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {metas.map((meta) => (
                <div
                  key={meta.id}
                  className={`rounded-xl border p-3 text-center ${
                    meta.completo ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{meta.nomeItem}</p>
                  {meta.completo ? (
                    <p className="text-xs text-green-600 mt-1">Meta atingida! 🎉</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Faltam {meta.restante} {meta.unidade}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Doação física */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">📦 Doação de alimentos</h2>
          <p className="text-sm text-gray-500 mb-4">Traga na secretaria da igreja, de segunda a sábado, 8h–17h.</p>
          <div className="space-y-2">
            {ITENS_ACEITOS.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-green-600">✓</span> {item}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">Não aceitamos itens vencidos ou abertos.</p>
        </div>

        {/* Doação via Pix */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">💳 Doação via Pix</h2>
          <p className="text-sm text-gray-500 mb-4">Faça um Pix e envie o comprovante no WhatsApp do responsável.</p>

          <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3 mb-4">
            <span className="text-xl">💳</span>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Chave Pix</p>
              <p className="font-semibold text-gray-900 text-sm">{PIX_KEY}</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText(PIX_KEY)}
              className="text-xs text-green-700 border border-green-300 rounded-lg px-2 py-1 hover:bg-green-100">
              Copiar
            </button>
          </div>

          {!enviado ? (
            <div className="space-y-3">
              <Input label="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Para registrar sua doação" />
              <Button onClick={handlePix} loading={saving} disabled={!nome}
                className="w-full justify-center bg-green-600 hover:bg-green-700">
                📱 Enviar comprovante no WhatsApp
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">🙏</p>
              <p className="text-sm font-medium text-green-700">Obrigado, {nome}!</p>
              <p className="text-xs text-gray-500 mt-1">Sua doação foi registrada. O WhatsApp foi aberto para envio do comprovante.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
