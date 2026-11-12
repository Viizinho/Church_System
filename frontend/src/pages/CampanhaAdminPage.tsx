import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import api from '@/services/api'
import type { ItemCampanha, Contribuicao, StatusContribuicao } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Card, { CardBody } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import dayjs from 'dayjs'
import { formatarMoeda } from '@/utils/data'
import OrdenacaoSelect from '@/components/ui/OrdenacaoSelect'
import { compararData, compararTexto, ordenar, type OpcaoOrdenacao } from '@/utils/ordenacao'

type Ordem = 'recentes' | 'antigas' | 'maior' | 'menor' | 'nome'
const OPCOES_ORDEM: OpcaoOrdenacao<Ordem>[] = [
  { valor: 'recentes', label: 'Mais recentes primeiro' },
  { valor: 'antigas', label: 'Mais antigas primeiro' },
  { valor: 'maior', label: 'Maior valor' },
  { valor: 'menor', label: 'Menor valor' },
  { valor: 'nome', label: 'Contribuinte (A–Z)' },
]

export default function CampanhaAdminPage() {
  const [itens, setItens] = useState<ItemCampanha[]>([])
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([])
  const [aba, setAba] = useState<StatusContribuicao>('PENDENTE')
  const [busca, setBusca] = useState('')
  const [filtroItem, setFiltroItem] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [aprovando, setAprovando] = useState<Contribuicao | null>(null)
  const [recusando, setRecusando] = useState<Contribuicao | null>(null)
  const [motivo, setMotivo] = useState('')
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<ItemCampanha | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '', valorTotal: '', chavePix: '', whatsappTesoureiro: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [iRes, cRes] = await Promise.all([api.get('/campanha/itens'), api.get('/campanha/contribuicoes')])
    setItens(iRes.data)
    setContribuicoes(cRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm({ nome: '', descricao: '', valorTotal: '', chavePix: '', whatsappTesoureiro: '' })
    setModal(true)
  }

  function openEdit(i: ItemCampanha) {
    setEditing(i)
    setForm({ nome: i.nome, descricao: i.descricao ?? '', valorTotal: String(i.valorTotal), chavePix: i.chavePix, whatsappTesoureiro: i.whatsappTesoureiro })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, valorTotal: Number(form.valorTotal), descricao: form.descricao || null }
    if (editing) await api.put(`/campanha/itens/${editing.id}`, payload)
    else await api.post('/campanha/itens', payload)
    setSaving(false)
    setModal(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este item?')) return
    await api.delete(`/campanha/itens/${id}`)
    load()
  }

  async function confirmarAprovacao() {
    if (!aprovando) return
    setProcessando(true)
    setErro('')
    try {
      await api.patch(`/campanha/contribuicoes/${aprovando.id}/confirmar`)
      setAprovando(null)
      await load()
    } catch (e) {
      // Ex.: aprovar passaria do valor total do item (RN-05) — o servidor explica o motivo
      setErro((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Não foi possível aprovar a contribuição.')
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
      await api.patch(`/campanha/contribuicoes/${recusando.id}/recusar`, { motivoRecusa: motivo.trim() || null })
      setRecusando(null)
      setMotivo('')
      await load()
    } catch {
      setErro('Não foi possível recusar a contribuição.')
      setRecusando(null)
    } finally {
      setProcessando(false)
    }
  }

  const abas: { chave: StatusContribuicao; label: string }[] = [
    { chave: 'PENDENTE', label: 'Pendentes' },
    { chave: 'CONFIRMADO', label: 'Aprovadas' },
    { chave: 'RECUSADO', label: 'Recusadas' },
  ]
  const contagem = (st: StatusContribuicao) => contribuicoes.filter((c) => c.status === st).length
  const listaAba = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const lista = contribuicoes.filter(
      (c) => c.status === aba && (!filtroItem || c.itemId === filtroItem) &&
        (!q || c.nomeContribuidor.toLowerCase().includes(q) || (c.item?.nome ?? '').toLowerCase().includes(q))
    )
    switch (ordem) {
      case 'antigas': return ordenar(lista, (a, b) => compararData(a.criadoEm, b.criadoEm))
      case 'maior': return ordenar(lista, (a, b) => Number(b.valor) - Number(a.valor))
      case 'menor': return ordenar(lista, (a, b) => Number(a.valor) - Number(b.valor))
      case 'nome': return ordenar(lista, (a, b) => compararTexto(a.nomeContribuidor, b.nomeContribuidor))
      default: return ordenar(lista, (a, b) => compararData(b.criadoEm, a.criadoEm))
    }
  }, [contribuicoes, aba, busca, filtroItem, ordem])

  if (loading) return <Spinner />

  return (
    <div className="p-4 sm:p-6 2xl:px-10">
      <PageHeader
        title="Campanha"
        tabTitle="Campanha"
        subtitle="Jardim Cidade Universitária — gerencie itens e confirme contribuições"
        actions={<Button onClick={openCreate}>+ Novo item</Button>}
      />

      {erro && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Contribuições</h2>
        <p className="text-xs text-gray-500 mb-3">
          Só as contribuições <strong>aprovadas</strong> entram no valor arrecadado dos itens.
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

        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar contribuinte ou item"
              aria-label="Buscar contribuições"
              className="w-full h-9 rounded-lg border border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <select
            value={filtroItem}
            onChange={(e) => setFiltroItem(e.target.value)}
            aria-label="Filtrar por item"
            className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-gray-700 outline-none focus:border-primary-500"
          >
            <option value="">Todos os itens</option>
            {itens.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
          <OrdenacaoSelect value={ordem} onChange={setOrdem} opcoes={OPCOES_ORDEM} />
        </div>

        {listaAba.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            {busca || filtroItem ? 'Nenhuma contribuição corresponde aos filtros.' : aba === 'PENDENTE' ? 'Nenhuma contribuição aguardando aprovação.' : 'Nada por aqui ainda.'}
          </p>
        ) : (
          <div className="space-y-2">
            {listaAba.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border px-4 py-3 flex flex-wrap items-center gap-4 ${
                  c.status === 'PENDENTE' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium text-gray-900">{c.nomeContribuidor} — {c.item?.nome}</p>
                  <p className="text-xs text-gray-500">
                    {formatarMoeda(c.valor)} · enviada em {dayjs(c.criadoEm).format('DD/MM/YYYY HH:mm')}
                    {c.confirmadoEm && ` · analisada em ${dayjs(c.confirmadoEm).format('DD/MM/YYYY HH:mm')}`}
                  </p>
                  {c.status === 'RECUSADO' && c.motivoRecusa && (
                    <p className="text-xs text-red-600 mt-0.5">Motivo: {c.motivoRecusa}</p>
                  )}
                </div>
                {c.status === 'PENDENTE' ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setAprovando(c)} className="!bg-green-600 hover:!bg-green-700">✓ Aprovar</Button>
                    <Button size="sm" variant="secondary" onClick={() => { setMotivo(''); setRecusando(c) }} className="text-red-600 border-red-300 hover:bg-red-50">✗ Recusar</Button>
                  </div>
                ) : (
                  <Badge variant={c.status === 'CONFIRMADO' ? 'green' : 'red'}>{c.status === 'CONFIRMADO' ? 'Aprovada' : 'Recusada'}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {itens.length === 0 ? <EmptyState message="Nenhum item cadastrado" icon="🎁" /> : (
        <div className="space-y-3">
          {itens.map((item) => {
            const pct = Math.min(100, (item.valorArrecadado / item.valorTotal) * 100)
            return (
              <Card key={item.id}>
                <CardBody>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{item.nome}</p>
                      {item.descricao && <p className="text-xs text-gray-500">{item.descricao}</p>}
                    </div>
                    <div className="flex gap-1">
                      {pct >= 100 ? <Badge variant="green">Concluído</Badge> : pct > 0 ? <Badge variant="amber">Em andamento</Badge> : <Badge variant="gray">Não iniciado</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="font-medium text-gray-900">{formatarMoeda(item.valorArrecadado)}</span>
                    <span>de {formatarMoeda(item.valorTotal)}</span>
                    <span>({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                    <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50">Remover</Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar item' : 'Novo item da Campanha'}>
        <div className="space-y-3">
          <Input label="Nome *" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          <Input label="Descrição" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          <Input label="Valor total (R$) *" type="number" step="0.01" value={form.valorTotal} onChange={(e) => setForm((f) => ({ ...f, valorTotal: e.target.value }))} />
          <Input label="Chave Pix *" value={form.chavePix} onChange={(e) => setForm((f) => ({ ...f, chavePix: e.target.value }))} />
          <Input label="WhatsApp do tesoureiro *" placeholder="5583999990000" value={form.whatsappTesoureiro} onChange={(e) => setForm((f) => ({ ...f, whatsappTesoureiro: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!aprovando}
        title="Aprovar contribuição"
        confirmLabel="Aprovar e contabilizar"
        tone="success"
        loading={processando}
        onConfirm={confirmarAprovacao}
        onCancel={() => setAprovando(null)}
      >
        <p>
          Confirmar o recebimento de <strong>{formatarMoeda(aprovando?.valor)}</strong> de{' '}
          <strong>{aprovando?.nomeContribuidor}</strong> para <strong>{aprovando?.item?.nome}</strong>?
        </p>
        <p className="text-xs text-gray-500">
          Confira o Pix antes de aprovar. O valor será somado ao arrecadado e a página pública será atualizada na hora.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!recusando}
        title="Recusar contribuição"
        confirmLabel="Recusar"
        loading={processando}
        onConfirm={confirmarRecusa}
        onCancel={() => setRecusando(null)}
      >
        <p>
          Recusar a contribuição de <strong>{formatarMoeda(recusando?.valor)}</strong> de{' '}
          <strong>{recusando?.nomeContribuidor}</strong>? Ela não será contabilizada.
        </p>
        <Input label="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: Pix não localizado" />
      </ConfirmDialog>
    </div>
  )
}
