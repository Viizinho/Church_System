import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { DoacaoAlimento, Membro, StatusDoacao } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import dayjs from 'dayjs'

interface MetaCesta {
  id: string
  nomeItem: string
  unidade: string
  restante: number
  completo: boolean
}

export default function MaoAmigaAdminPage() {
  const [doacoes, setDoacoes] = useState<DoacaoAlimento[]>([])
  const [aba, setAba] = useState<StatusDoacao>('PENDENTE')
  const [aprovando, setAprovando] = useState<DoacaoAlimento | null>(null)
  const [recusando, setRecusando] = useState<DoacaoAlimento | null>(null)
  const [motivo, setMotivo] = useState('')
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')
  const [membros, setMembros] = useState<Membro[]>([])
  const [metas, setMetas] = useState<MetaCesta[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    membroId: '',
    nomeDoador: '',
    data: dayjs().format('YYYY-MM-DD'),
    itemDoado: '',
    quantidade: '',
    tipo: 'FISICA',
    metaCestaId: '',
    quantidadeNumerica: '',
  })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [dRes, mRes, metasRes] = await Promise.all([
      api.get('/mao-amiga/doacoes'),
      api.get('/membros', { params: { status: 'ATIVO' } }),
      api.get('/mao-amiga/metas'),
    ])
    setDoacoes(dRes.data)
    setMembros(mRes.data)
    setMetas(metasRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const metaSelecionada = metas.find((m) => m.id === form.metaCestaId)

  async function handleSave() {
    setSaving(true)
    const payload = metaSelecionada
      ? {
          membroId: form.membroId || null,
          nomeDoador: form.nomeDoador || null,
          data: form.data,
          itemDoado: metaSelecionada.nomeItem,
          quantidade: `${form.quantidadeNumerica} ${metaSelecionada.unidade}`,
          quantidadeNumerica: Number(form.quantidadeNumerica),
          metaCestaId: metaSelecionada.id,
          tipo: form.tipo,
        }
      : {
          membroId: form.membroId || null,
          nomeDoador: form.nomeDoador || null,
          data: form.data,
          itemDoado: form.itemDoado,
          quantidade: form.quantidade,
          tipo: form.tipo,
        }
    await api.post('/mao-amiga/doacoes', payload)
    setSaving(false)
    setModal(false)
    load()
  }


  async function confirmarAprovacao() {
    if (!aprovando) return
    setProcessando(true)
    setErro('')
    try {
      await api.patch(`/mao-amiga/doacoes/${aprovando.id}/confirmar`)
      setAprovando(null)
      await load()
    } catch {
      setErro('Não foi possível aprovar o envio.')
      setAprovando(null)
    } finally {
      setProcessando(false)
    }
  }

  async function confirmarRecusa() {
    if (!recusando) return
    setProcessando(true)
    setErro('')
    try {
      await api.patch(`/mao-amiga/doacoes/${recusando.id}/recusar`, { motivoRecusa: motivo.trim() || null })
      setRecusando(null)
      setMotivo('')
      await load()
    } catch {
      setErro('Não foi possível recusar o envio.')
      setRecusando(null)
    } finally {
      setProcessando(false)
    }
  }

  const abas: { chave: StatusDoacao; label: string }[] = [
    { chave: 'PENDENTE', label: 'Pendentes' },
    { chave: 'CONFIRMADO', label: 'Aprovadas' },
    { chave: 'RECUSADO', label: 'Recusadas' },
  ]
  const contagem = (st: StatusDoacao) => doacoes.filter((d) => d.status === st).length
  const listaAba = doacoes.filter((d) => d.status === aba)
  const nomeDoador = (d: DoacaoAlimento) => d.membro?.nomeCompleto ?? d.nomeDoador ?? 'Doador anônimo'
  const descricao = (d: DoacaoAlimento) => (d.quantidade !== '—' ? `${d.itemDoado} (${d.quantidade})` : d.itemDoado)

  if (loading) return <Spinner />

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <PageHeader
        title="Projeto Mão Amiga"
        subtitle="Doações de alimentos"
        actions={<Button onClick={() => { setForm({ membroId: '', nomeDoador: '', data: dayjs().format('YYYY-MM-DD'), itemDoado: '', quantidade: '', tipo: 'FISICA', metaCestaId: '', quantidadeNumerica: '' }); setModal(true) }}>+ Registrar doação</Button>}
      />

      {erro && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Doações</h2>
        <p className="text-xs text-gray-500 mb-3">
          Só as doações <strong>aprovadas</strong> são contabilizadas nas metas da cesta.
        </p>

        <div className="flex gap-1 border-b border-gray-200 mb-3">
          {abas.map((a) => (
            <button
              key={a.chave}
              onClick={() => setAba(a.chave)}
              className={`px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${
                aba === a.chave
                  ? 'border-primary-500 text-primary-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {a.label} <span className="text-xs text-gray-400">({contagem(a.chave)})</span>
            </button>
          ))}
        </div>

        {listaAba.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            {aba === 'PENDENTE' ? 'Nenhum envio aguardando aprovação.' : 'Nada por aqui ainda.'}
          </p>
        ) : (
          <div className="space-y-2">
            {listaAba.map((d) => (
              <div
                key={d.id}
                className={`rounded-xl border px-4 py-3 flex flex-wrap items-center gap-4 ${
                  d.status === 'PENDENTE' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium text-gray-900">{nomeDoador(d)} — {descricao(d)}</p>
                  <p className="text-xs text-gray-500">
                    {d.tipo === 'PIX' ? 'Pix' : 'Doação física'} · enviada em {dayjs(d.criadoEm).format('DD/MM/YYYY HH:mm')}
                    {d.confirmadoEm && ` · analisada em ${dayjs(d.confirmadoEm).format('DD/MM/YYYY HH:mm')}`}
                  </p>
                  {d.status === 'RECUSADO' && d.motivoRecusa && (
                    <p className="text-xs text-red-600 mt-0.5">Motivo: {d.motivoRecusa}</p>
                  )}
                </div>
                {d.status === 'PENDENTE' ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setAprovando(d)} className="!bg-green-600 hover:!bg-green-700">✓ Aprovar</Button>
                    <Button size="sm" variant="secondary" onClick={() => { setMotivo(''); setRecusando(d) }} className="text-red-600 border-red-300 hover:bg-red-50">✗ Recusar</Button>
                  </div>
                ) : (
                  <Badge variant={d.status === 'CONFIRMADO' ? 'green' : 'red'}>{d.status === 'CONFIRMADO' ? 'Aprovada' : 'Recusada'}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Registrar doação física">
        <div className="space-y-3">
          <Select label="Membro doador" value={form.membroId} onChange={(e) => setForm((f) => ({ ...f, membroId: e.target.value, nomeDoador: '' }))}>
            <option value="">— Selecione um membro —</option>
            {membros.map((m) => <option key={m.id} value={m.id}>{m.nomeCompleto}</option>)}
          </Select>
          {!form.membroId && <Input label="Ou nome do doador externo" value={form.nomeDoador} onChange={(e) => setForm((f) => ({ ...f, nomeDoador: e.target.value }))} />}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data *" type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
            <Select label="Tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
              <option value="FISICA">Física</option>
              <option value="PIX">Pix</option>
            </Select>
          </div>
          <Select
            label="Vincular a uma meta da cesta (opcional)"
            value={form.metaCestaId}
            onChange={(e) => setForm((f) => ({ ...f, metaCestaId: e.target.value, quantidadeNumerica: '' }))}
          >
            <option value="">— Doação livre (sem meta) —</option>
            {metas.filter((m) => !m.completo).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nomeItem} — faltam {m.restante} {m.unidade}
              </option>
            ))}
          </Select>

          {metaSelecionada ? (
            <Input
              label={`Quantidade (${metaSelecionada.unidade}) — máximo ${metaSelecionada.restante}`}
              type="number"
              min={0.1}
              step={0.1}
              max={metaSelecionada.restante}
              value={form.quantidadeNumerica}
              onChange={(e) => setForm((f) => ({ ...f, quantidadeNumerica: e.target.value }))}
            />
          ) : (
            <>
              <Input label="Item doado *" placeholder="Ex: Arroz 5kg" value={form.itemDoado} onChange={(e) => setForm((f) => ({ ...f, itemDoado: e.target.value }))} />
              <Input label="Quantidade *" placeholder="Ex: 2 pacotes" value={form.quantidade} onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))} />
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!!metaSelecionada && (!form.quantidadeNumerica || Number(form.quantidadeNumerica) > metaSelecionada.restante)}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!aprovando}
        title="Aprovar doação"
        confirmLabel="Aprovar e contabilizar"
        tone="success"
        loading={processando}
        onConfirm={confirmarAprovacao}
        onCancel={() => setAprovando(null)}
      >
        <p>
          Confirmar o recebimento de <strong>{aprovando ? descricao(aprovando) : ''}</strong> de{' '}
          <strong>{aprovando ? nomeDoador(aprovando) : ''}</strong>?
        </p>
        <p className="text-xs text-gray-500">
          {aprovando?.tipo === 'PIX'
            ? 'Confira se o Pix caiu na conta e se o comprovante enviado por WhatsApp confere com o nome. '
            : 'Confira se os itens foram entregues na secretaria. '}
          Depois de aprovada, a doação passa a ser contabilizada.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!recusando}
        title="Recusar doação"
        confirmLabel="Recusar"
        loading={processando}
        onConfirm={confirmarRecusa}
        onCancel={() => setRecusando(null)}
      >
        <p>
          Recusar a doação de <strong>{recusando ? nomeDoador(recusando) : ''}</strong>? Ela não será contabilizada.
        </p>
        <Input label="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: Pix não localizado" />
      </ConfirmDialog>
    </div>
  )
}
