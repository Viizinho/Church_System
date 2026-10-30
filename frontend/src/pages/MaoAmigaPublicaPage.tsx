import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Minus, Plus } from 'lucide-react'
import api from '@/services/api'
import { MAO_AMIGA } from '@/config/igreja'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const VALORES_PIX = [20, 50, 100]
const ITENS_ACEITOS = ['Arroz (pacote 5 kg)', 'Feijão (pacote 1 kg)', 'Macarrão', 'Óleo de cozinha', 'Leite em pó', 'Açúcar']

interface MetaCesta {
  id: string
  nomeItem: string
  unidade: string
  necessario: number
  arrecadado: number
  reservado: number
  /** O que ainda dá para doar (já descontado o que está aguardando conferência) */
  restante: number
  completo: boolean
}

interface Props {
  /** Quando true, a página é exibida como seção da landing (sem cabeçalho próprio nem altura de tela cheia). */
  embedded?: boolean
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const fmtReais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function mensagemErro(e: unknown, padrao: string) {
  const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
  return msg ?? padrao
}

export default function MaoAmigaPublicaPage({ embedded = false }: Props) {
  const [metas, setMetas] = useState<MetaCesta[]>([])
  const [carregando, setCarregando] = useState(true)

  // Doação de alimentos
  const [selecao, setSelecao] = useState<Record<string, number>>({})
  const [nome, setNome] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [concluido, setConcluido] = useState<{ nome: string; itens: { texto: string }[] } | null>(null)

  // Pix
  const [valorPix, setValorPix] = useState<number | null>(null)
  const [outroValor, setOutroValor] = useState('')
  const [nomePix, setNomePix] = useState('')
  const [enviandoPix, setEnviandoPix] = useState(false)
  const [erroPix, setErroPix] = useState('')
  const [pixEnviado, setPixEnviado] = useState<{ nome: string; valor: number; link: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  const carregarMetas = useCallback(() => {
    return api
      .get('/publico/mao-amiga/metas')
      .then((r) => setMetas(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMetas([]))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => { carregarMetas() }, [carregarMetas])

  const selecionados = metas.filter((m) => selecao[m.id] !== undefined)

  function alternar(meta: MetaCesta) {
    if (meta.completo) return
    setErro('')
    setSelecao((atual) => {
      const novo = { ...atual }
      if (novo[meta.id] !== undefined) delete novo[meta.id]
      else novo[meta.id] = Math.min(1, meta.restante)
      return novo
    })
  }

  function ajustar(meta: MetaCesta, delta: number) {
    setSelecao((atual) => {
      const q = Math.round(((atual[meta.id] ?? 1) + delta) * 100) / 100
      return { ...atual, [meta.id]: Math.max(Math.min(q, meta.restante), Math.min(1, meta.restante)) }
    })
  }

  async function doar() {
    setErro('')
    if (nome.trim().length < 2) { setErro('Informe seu nome para registrar a doação.'); return }
    setEnviando(true)
    try {
      await api.post('/publico/mao-amiga/doacoes', {
        nomeDoador: nome.trim(),
        itens: selecionados.map((m) => ({ metaCestaId: m.id, quantidade: selecao[m.id] })),
      })
      setConcluido({
        nome: nome.trim(),
        itens: selecionados.map((m) => ({ texto: `${m.nomeItem} — ${fmt(selecao[m.id])} ${m.unidade}` })),
      })
      setSelecao({})
      setNome('')
      carregarMetas()
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível registrar sua doação. Tente novamente.'))
      carregarMetas() // a meta pode ter mudado enquanto a pessoa escolhia
    } finally {
      setEnviando(false)
    }
  }

  const valorPixFinal = valorPix ?? (Number(outroValor.replace(',', '.')) || 0)

  async function copiarChave() {
    try {
      await navigator.clipboard.writeText(MAO_AMIGA.chavePix)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErroPix('Não foi possível copiar. Selecione a chave e copie manualmente.')
    }
  }

  async function enviarPix() {
    setErroPix('')
    if (nomePix.trim().length < 2) { setErroPix('Informe seu nome.'); return }
    if (valorPixFinal <= 0) { setErroPix('Escolha ou digite o valor do Pix.'); return }
    setEnviandoPix(true)
    try {
      await api.post('/publico/mao-amiga/pix', { nomeDoador: nomePix.trim(), valor: valorPixFinal })
      const msg = encodeURIComponent(
        `Olá! Sou ${nomePix.trim()} e fiz um Pix de ${fmtReais(valorPixFinal)} para o Projeto Mão Amiga. Segue o comprovante.`
      )
      const link = `https://wa.me/${MAO_AMIGA.whatsapp.replace(/\D/g, '')}?text=${msg}`
      setPixEnviado({ nome: nomePix.trim(), valor: valorPixFinal, link })
      window.open(link, '_blank')
    } catch (e) {
      setErroPix(mensagemErro(e, 'Não foi possível registrar o Pix. Tente novamente.'))
    } finally {
      setEnviandoPix(false)
    }
  }

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gray-50'}>
      {!embedded && (
        <div className="bg-green-700 text-white py-10 px-4 text-center">
          <div className="text-4xl mb-3">🤝</div>
          <h1 className="text-2xl font-bold">Projeto Mão Amiga</h1>
          <p className="text-green-200 mt-2 max-w-md mx-auto text-sm">Ajudamos famílias em situação de vulnerabilidade com doações de alimentos.</p>
        </div>
      )}

      <div className={`max-w-4xl mx-auto px-4 pb-8 space-y-6 ${embedded ? 'pt-0' : 'pt-8'}`}>
        {/* ── Doação de alimentos ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6">
          <h3 className="font-semibold text-gray-900 text-lg">📦 Doar alimentos</h3>

          {concluido ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">🙏</p>
              <p className="font-semibold text-green-700">Obrigado, {concluido.nome}!</p>
              <p className="text-sm text-gray-600 mt-1">Sua doação foi registrada:</p>
              <ul className="mt-3 inline-block text-left text-sm text-gray-800 space-y-1">
                {concluido.itens.map((i) => (
                  <li key={i.texto} className="flex items-center gap-2"><Check size={14} className="text-green-600" /> {i.texto}</li>
                ))}
              </ul>
              <p className="text-sm text-gray-600 mt-4 max-w-md mx-auto">
                Agora é só levar {MAO_AMIGA.entrega}. A doação fica “aguardando conferência” até a entrega.
              </p>
              <Button variant="secondary" className="mt-5" onClick={() => setConcluido(null)}>Fazer outra doação</Button>
            </div>
          ) : carregando ? (
            <p className="text-sm text-gray-400 py-8 text-center">Carregando itens…</p>
          ) : metas.length === 0 ? (
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-3">Traga {MAO_AMIGA.entrega}. Aceitamos:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ITENS_ACEITOS.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700"><Check size={14} className="text-green-600" /> {item}</li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mt-4">Não aceitamos itens vencidos ou abertos.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                <strong>1.</strong> Toque nos itens que você vai doar e escolha a quantidade. <strong>2.</strong> Informe seu nome. <strong>3.</strong> Leve {MAO_AMIGA.entrega}.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {metas.map((meta) => {
                  const ativo = selecao[meta.id] !== undefined
                  const pctConfirmado = Math.min(100, (meta.arrecadado / meta.necessario) * 100)
                  const pctReservado = Math.min(100 - pctConfirmado, (meta.reservado / meta.necessario) * 100)
                  return (
                    <div
                      key={meta.id}
                      className={`rounded-xl border-2 transition-colors ${
                        meta.completo
                          ? 'bg-green-50 border-green-200'
                          : ativo
                            ? 'border-green-500 bg-green-50/60'
                            : 'border-gray-200 bg-white hover:border-green-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => alternar(meta)}
                        disabled={meta.completo}
                        aria-pressed={ativo}
                        className="w-full text-left p-4 disabled:cursor-default"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-900">{meta.nomeItem}</p>
                          <span
                            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              ativo ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'
                            }`}
                            aria-hidden
                          >
                            {ativo && <Check size={12} strokeWidth={3} />}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden flex">
                          <div className="bg-green-500" style={{ width: `${pctConfirmado}%` }} />
                          <div className="bg-green-200" style={{ width: `${pctReservado}%` }} />
                        </div>
                        <p className="text-xs mt-1.5 text-gray-500">
                          {meta.completo
                            ? 'Meta atingida! 🎉'
                            : `Faltam ${fmt(meta.restante)} ${meta.unidade} de ${fmt(meta.necessario)} ${meta.unidade}`}
                        </p>
                      </button>

                      {ativo && (
                        <div className="px-4 pb-4 flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-600">Quanto você vai doar?</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => ajustar(meta, -1)}
                              disabled={selecao[meta.id] <= Math.min(1, meta.restante)}
                              aria-label={`Diminuir ${meta.nomeItem}`}
                              className="w-8 h-8 rounded-lg border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-[3.5rem] text-center text-sm font-semibold text-gray-900">
                              {fmt(selecao[meta.id])} {meta.unidade}
                            </span>
                            <button
                              type="button"
                              onClick={() => ajustar(meta, 1)}
                              disabled={selecao[meta.id] >= meta.restante}
                              aria-label={`Aumentar ${meta.nomeItem}`}
                              className="w-8 h-8 rounded-lg border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-4">
                {selecionados.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Toque nos itens acima para escolher o que você vai doar.</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Sua doação</p>
                      <ul className="text-sm text-gray-900 space-y-0.5">
                        {selecionados.map((m) => (
                          <li key={m.id}>• {m.nomeItem} — <strong>{fmt(selecao[m.id])} {m.unidade}</strong></li>
                        ))}
                      </ul>
                    </div>
                    <Input
                      label="Seu nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Para registrar a sua doação"
                    />
                    {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
                    <Button
                      onClick={doar}
                      loading={enviando}
                      disabled={enviando}
                      className="w-full justify-center !bg-green-600 hover:!bg-green-700"
                    >
                      Quero doar {selecionados.length === 1 ? 'este item' : `estes ${selecionados.length} itens`}
                    </Button>
                    <p className="text-xs text-gray-400 text-center">Não aceitamos itens vencidos ou abertos.</p>
                  </div>
                )}
                {selecionados.length === 0 && erro && <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
              </div>
            </>
          )}
        </div>

        {/* ── Doação via Pix ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6">
          <h3 className="font-semibold text-gray-900 text-lg">💳 Prefere doar em dinheiro? Pix</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">O valor é usado na compra dos alimentos que faltam nas cestas.</p>

          {pixEnviado ? (
            <div className="text-center py-4">
              <p className="text-3xl mb-2">🙏</p>
              <p className="font-semibold text-green-700">Obrigado, {pixEnviado.nome}!</p>
              <p className="text-sm text-gray-600 mt-1">
                Registramos seu Pix de <strong>{fmtReais(pixEnviado.valor)}</strong>. Envie o comprovante pelo WhatsApp para a conferência.
              </p>
              <a
                href={pixEnviado.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
              >
                📱 Abrir WhatsApp
              </a>
              <div>
                <button
                  type="button"
                  className="mt-3 text-xs text-gray-500 underline"
                  onClick={() => { setPixEnviado(null); setValorPix(null); setOutroValor(''); setNomePix('') }}
                >
                  Fazer outro Pix
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">1. Escolha o valor</p>
                <div className="flex flex-wrap gap-2">
                  {VALORES_PIX.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { setValorPix(v); setOutroValor('') }}
                      aria-pressed={valorPix === v}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        valorPix === v ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-gray-700 hover:border-green-400'
                      }`}
                    >
                      R$ {v}
                    </button>
                  ))}
                  <Input
                    aria-label="Outro valor"
                    type="number"
                    min="1"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Outro valor"
                    value={outroValor}
                    onChange={(e) => { setOutroValor(e.target.value); setValorPix(null) }}
                    className="w-32"
                  />
                </div>

                <p className="text-xs font-medium text-gray-600 mt-4 mb-2">2. Faça o Pix para a chave</p>
                <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Chave Pix</p>
                    <p className="font-semibold text-gray-900 text-sm break-all">{MAO_AMIGA.chavePix}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copiarChave}
                    className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-green-700 border border-green-300 rounded-lg px-2.5 py-1.5 hover:bg-green-100"
                  >
                    {copiado ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">3. Registre e envie o comprovante</p>
                <div className="space-y-3">
                  <Input label="Seu nome" value={nomePix} onChange={(e) => setNomePix(e.target.value)} placeholder="Para registrar a sua doação" />
                  {valorPixFinal > 0 && (
                    <p className="text-sm text-gray-700">Valor: <strong>{fmtReais(valorPixFinal)}</strong></p>
                  )}
                  {erroPix && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erroPix}</p>}
                  <Button
                    onClick={enviarPix}
                    loading={enviandoPix}
                    disabled={enviandoPix}
                    className="w-full justify-center !bg-green-600 hover:!bg-green-700"
                  >
                    📱 Registrar e enviar comprovante no WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
