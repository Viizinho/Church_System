import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { Membro, Cargo } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import dayjs from 'dayjs'

export default function MembrosPage() {
  const [membros, setMembros] = useState<Membro[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Membro | null>(null)
  const [form, setForm] = useState({ nomeCompleto: '', dataNascimento: '', telefone: '', email: '', endereco: '', status: 'ATIVO', cargoIds: [] as string[] })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const params: Record<string, string> = {}
    if (busca) params.busca = busca
    if (statusFilter) params.status = statusFilter
    const [mRes, cRes] = await Promise.all([api.get('/membros', { params }), api.get('/cargos')])
    setMembros(mRes.data)
    setCargos(cRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [busca, statusFilter])

  function openCreate() {
    setEditing(null)
    setForm({ nomeCompleto: '', dataNascimento: '', telefone: '', email: '', endereco: '', status: 'ATIVO', cargoIds: [] })
    setModal(true)
  }

  function openEdit(m: Membro) {
    setEditing(m)
    setForm({
      nomeCompleto: m.nomeCompleto,
      dataNascimento: m.dataNascimento ? dayjs(m.dataNascimento).format('YYYY-MM-DD') : '',
      telefone: m.telefone ?? '',
      email: m.email ?? '',
      endereco: m.endereco ?? '',
      status: m.status,
      cargoIds: m.cargos.map((c) => c.cargoId),
    })
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, dataNascimento: form.dataNascimento || null, telefone: form.telefone || null, email: form.email || null, endereco: form.endereco || null }
    if (editing) await api.put(`/membros/${editing.id}`, payload)
    else await api.post('/membros', payload)
    setSaving(false)
    setModal(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este membro?')) return
    await api.delete(`/membros/${id}`)
    load()
  }

  function toggleCargo(id: string) {
    setForm((f) => ({ ...f, cargoIds: f.cargoIds.includes(id) ? f.cargoIds.filter((c) => c !== id) : [...f.cargoIds, id] }))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Membros</h1>
          <p className="text-sm text-gray-500">{membros.length} cadastrado{membros.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}>+ Novo membro</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input className="flex-1" placeholder="Buscar por nome, e-mail ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
          <option value="">Todos</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
        </Select>
      </div>

      {loading ? <Spinner /> : membros.length === 0 ? <EmptyState message="Nenhum membro encontrado" icon="👥" /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Nome', 'Cargos', 'Telefone', 'Aniversário', 'Status', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {membros.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600 flex-shrink-0">{m.nomeCompleto.charAt(0)}</div>
                      <span className="font-medium text-gray-900">{m.nomeCompleto}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{m.cargos.map((c) => <Badge key={c.cargoId} variant="purple">{c.cargo.nome}</Badge>)}</div></td>
                  <td className="px-4 py-3 text-gray-600">{m.telefone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.dataNascimento ? dayjs(m.dataNascimento).format('DD/MM') : '—'}</td>
                  <td className="px-4 py-3"><Badge variant={m.status === 'ATIVO' ? 'green' : 'gray'}>{m.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} className="text-red-500 hover:bg-red-50">Remover</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar membro' : 'Novo membro'}>
        <div className="space-y-3">
          <Input label="Nome completo *" value={form.nomeCompleto} onChange={(e) => setForm((f) => ({ ...f, nomeCompleto: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data de nascimento" type="date" value={form.dataNascimento} onChange={(e) => setForm((f) => ({ ...f, dataNascimento: e.target.value }))} />
            <Input label="Telefone" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
          </div>
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="Endereço" value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
          </Select>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Cargos</p>
            <div className="flex flex-wrap gap-2">
              {cargos.map((c) => (
                <button key={c.id} type="button" onClick={() => toggleCargo(c.id)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.cargoIds.includes(c.id) ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 text-gray-600 hover:border-primary-400'}`}>
                  {c.nome}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
