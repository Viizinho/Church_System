import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import type { DoacaoAlimento, StatusDoacao } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import dayjs from 'dayjs'
import { formatarData } from '@/utils/data'

const abas: { chave: StatusDoacao; label: string }[] = [
  { chave: 'PENDENTE', label: 'Aguardando confirmação' },
  { chave: 'CONFIRMADO', label: 'Confirmados' },
  { chave: 'RECUSADO', label: 'Recusados' },
]

const statusVariant = { PENDENTE: 'amber', CONFIRMADO: 'green', RECUSADO: 'red' } as const
const statusLabel = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', RECUSADO: 'Recusado' } as const

function nomeDoador(d: DoacaoAlimento) {
  return d.membro?.nomeCompleto ?? d.nomeDoador ?? 'Doador anônimo'
}

export default function MaoAmigaConfirmacoesPage() {
  const [doacoes, setDoacoes] = useState<DoacaoAlimento[]>([])
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<StatusDoacao>('PENDENTE')
  const [revisando, setRevisando] = useState<DoacaoAlimento | null>(null)
  const [processando, setProcessando] = useState<'confirmar' | 'recusar' | null>(null)
  const [erro, setErro] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/mao-amiga/doacoes')
      setDoacoes(r.data)
    } catch {
      setErro('Não foi possível carregar os envios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function decidir(acao: 'confirmar' | 'recusar') {
    if (!revisando) return
    setProcessando(acao)
    setErro('')
    try {
      await api.patch(`/mao-amiga/doacoes/${revisando.id}/${acao}`)
      setRevisando(null)
      await load()
    } catch {
      setErro(acao === 'confirmar' ? 'Não foi possível confirmar o envio.' : 'Não foi possível recusar o envio.')
      setRevisando(null)
    } finally {
      setProcessando(null)
    }
  }

  const lista = doacoes
    .filter((d) => d.status === aba)
    // Pendentes: mais antigos primeiro (fila); demais: mais recentes primeiro
    .sort((a, b) => (aba === 'PENDENTE'
      ? dayjs(a.criadoEm).valueOf() - dayjs(b.criadoEm).valueOf()
      : dayjs(b.criadoEm).valueOf() - dayjs(a.criadoEm).valueOf()))

  const contagem = (st: StatusDoacao) => doacoes.filter((d) => d.status === st).length

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Confirmação de envios — Mão Amiga</h1>
          <p className="text-sm text-gray-500">Confira cada envio recebido antes de contabilizá-lo no projeto</p>
        </div>
        <Link to="/mao-amiga">
          <Button variant="secondary">← Voltar ao Mão Amiga</Button>
        </Link>
      </div>

      {erro && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {abas.map((a) => (
          <button
            key={a.chave}
            onClick={() => setAba(a.chave)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 whitespace-nowrap transition-colors ${
              aba === a.chave
                ? 'border-primary-500 text-primary-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {a.label} <span className="text-xs text-gray-400">({contagem(a.chave)})</span>
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : lista.length === 0 ? (
        <EmptyState
          message={aba === 'PENDENTE' ? 'Nenhum envio aguardando confirmação' : 'Nada por aqui ainda'}
          icon={aba === 'PENDENTE' ? '✅' : '🧺'}
        />
      ) : (
        <div className="space-y-2">
          {lista.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl border px-4 py-3 flex flex-wrap items-center gap-4 ${
                d.status === 'PENDENTE' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-medium text-gray-900">
                  {nomeDoador(d)} <span className="text-gray-400 font-normal">· {d.tipo === 'PIX' ? 'Pix' : 'Doação física'}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {d.itemDoado}{d.quantidade !== '—' ? ` · ${d.quantidade}` : ''} · enviado em {dayjs(d.criadoEm).format('DD/MM/YYYY HH:mm')}
                </p>
              </div>
              {d.status === 'PENDENTE' ? (
                <Button size="sm" onClick={() => setRevisando(d)}>Revisar</Button>
              ) : (
                <Badge variant={statusVariant[d.status]}>{statusLabel[d.status]}</Badge>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!revisando} onClose={() => !processando && setRevisando(null)} title="Confirmar envio">
        {revisando && (
          <div className="space-y-4">
            <dl className="text-sm grid grid-cols-[auto,1fr] gap-x-4 gap-y-2">
              <dt className="text-gray-500">Doador</dt>
              <dd className="font-medium text-gray-900">{nomeDoador(revisando)}</dd>
              <dt className="text-gray-500">Tipo</dt>
              <dd>{revisando.tipo === 'PIX' ? 'Pix' : 'Doação física'}</dd>
              <dt className="text-gray-500">Item</dt>
              <dd>{revisando.itemDoado}{revisando.quantidade !== '—' ? ` — ${revisando.quantidade}` : ''}</dd>
              <dt className="text-gray-500">Data</dt>
              <dd>{formatarData(revisando.data)}</dd>
              <dt className="text-gray-500">Enviado em</dt>
              <dd>{dayjs(revisando.criadoEm).format('DD/MM/YYYY HH:mm')}</dd>
              {revisando.comprovanteUrl && (
                <>
                  <dt className="text-gray-500">Comprovante</dt>
                  <dd>
                    <a href={revisando.comprovanteUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline">
                      Abrir comprovante
                    </a>
                  </dd>
                </>
              )}
            </dl>

            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              {revisando.tipo === 'PIX'
                ? 'Confira se o Pix realmente caiu na conta e se o comprovante enviado por WhatsApp confere com o nome acima.'
                : 'Confira se os itens foram entregues na secretaria.'}{' '}
              Só os envios confirmados são contabilizados.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setRevisando(null)} disabled={!!processando}>Fechar</Button>
              <Button
                variant="danger"
                onClick={() => decidir('recusar')}
                loading={processando === 'recusar'}
                disabled={!!processando}
              >
                Recusar
              </Button>
              <Button
                className="!bg-green-600 hover:!bg-green-700"
                onClick={() => decidir('confirmar')}
                loading={processando === 'confirmar'}
                disabled={!!processando}
              >
                Confirmar envio
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
