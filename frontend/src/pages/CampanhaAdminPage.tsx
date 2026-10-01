import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { ItemCampanha, Contribuicao } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Card, { CardBody } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import dayjs from 'dayjs'

export default function CampanhaAdminPage() {
  const [itens, setItens] = useState<ItemCampanha[]>([])
  const [pendentes, setPendentes] = useState<Contribuicao[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<ItemCampanha | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '', valorTotal: '', chavePix: '', whatsappTesoureiro: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [iRes, pRes] = await Promise.all([api.get('/campanha/itens'), api.get('/campanha/contribuicoes/pendentes')])
    setItens(iRes.data)
    setPendentes(pRes.data)
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

  async function confirmar(id: string) {
    await api.patch(`/campanha/contribuicoes/${id}/confirmar`)
    load()
  }

  async function recusar(id: string) {
    const motivo = prompt('Motivo da recusa (opcional):')
    await api.patch(`/campanha/contribuicoes/${id}/recusar`, { motivoRecusa: motivo })
    load()
  }

  if (loading) return <Spinner />

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Campanha Jardim Cidade Universitária</h1>
          <p className="text-sm text-gray-500">Gerencie itens e confirme contribuições</p>
        </div>
        <Button onClick={openCreate}>+ Novo item</Button>
      </div>

      {pendentes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">🕐 Contribuições pendentes ({pendentes.length})</h2>
          <div className="space-y-2">
            {pendentes.map((c) => (
              <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{c.nomeContribuidor} — {c.item?.nome}</p>
                  <p className="text-xs text-gray-500">R$ {Number(c.valor).toFixed(2)} · {dayjs(c.criadoEm).format('DD/MM/YYYY HH:mm')}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => confirmar(c.id)} className="bg-green-600 hover:bg-green-700">✓ Confirmar</Button>
                  <Button size="sm" variant="secondary" onClick={() => recusar(c.id)} className="text-red-600 border-red-300 hover:bg-red-50">✗ Recusar</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    <span className="font-medium text-gray-900">R$ {Number(item.valorArrecadado).toFixed(2)}</span>
                    <span>de R$ {Number(item.valorTotal).toFixed(2)}</span>
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
    </div>
  )
}
