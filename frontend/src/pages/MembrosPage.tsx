import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { Membro, Cargo, Categoria, ConjuntoMusical } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import dayjs from 'dayjs'
import { mascararTelefone, limparTelefone } from '@/utils/mascaraTelefone'

const formVazio = {
  nomeCompleto: '',
  dataNascimento: '',
  telefone: '',
  email: '',
  endereco: '',
  status: 'ATIVO',
  cargoIds: [] as string[],
  categoriaIds: [] as string[],
  conjuntoIds: [] as string[],
  consentimentoImagem: false,
}

export default function MembrosPage() {
  const [membros, setMembros] = useState<Membro[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [conjuntos, setConjuntos] = useState<ConjuntoMusical[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [cargoFilter, setCargoFilter] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Membro | null>(null)
  const [form, setForm] = useState(formVazio)
  const [erro, setErro] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const params: Record<string, string> = {}
    if (busca) params.busca = busca
    if (statusFilter) params.status = statusFilter
    if (cargoFilter) params.cargoId = cargoFilter
    if (categoriaFilter) params.categoriaId = categoriaFilter
    const [mRes, cRes, catRes, conjRes] = await Promise.all([
      api.get('/membros', { params }),
      api.get('/cargos'),
      api.get('/membros/categorias'),
      api.get('/membros/conjuntos'),
    ])
    setMembros(mRes.data)
    setCargos(cRes.data)
    setCategorias(catRes.data)
    setConjuntos(conjRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [busca, statusFilter, cargoFilter, categoriaFilter])

  function openCreate() {
    setEditing(null)
    setForm(formVazio)
    setErro('')
    setModal(true)
  }

  function openEdit(m: Membro) {
    setEditing(m)
    setForm({
      nomeCompleto: m.nomeCompleto,
      dataNascimento: m.dataNascimento ? dayjs(m.dataNascimento).format('YYYY-MM-DD') : '',
      telefone: m.telefone ? mascararTelefone(m.telefone) : '',
      email: m.email ?? '',
      endereco: m.endereco ?? '',
      status: m.status,
      cargoIds: m.cargos.map((c) => c.cargoId),
      categoriaIds: m.categorias.map((c) => c.categoriaId),
      conjuntoIds: m.conjuntos.map((c) => c.conjuntoId),
      consentimentoImagem: m.consentimentoImagem,
    })
    setErro('')
    setModal(true)
  }

  async function handleSave() {
    if (!form.consentimentoImagem) {
      setErro('É necessário marcar o Consenso de Uso da Imagem para cadastrar o membro.')
      return
    }
    setErro('')
    setSaving(true)
    const payload = {
      ...form,
      dataNascimento: form.dataNascimento || null,
      telefone: form.telefone ? limparTelefone(form.telefone) : null,
      email: form.email || null,
      endereco: form.endereco || null,
    }
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

  function toggleEm(campo: 'cargoIds' | 'categoriaIds' | 'conjuntoIds', id: string) {
    setForm((f) => ({
      ...f,
      [campo]: f[campo].includes(id) ? f[campo].filter((v) => v !== id) : [...f[campo], id],
    }))
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

      <div className="flex flex-wrap gap-3 mb-4">
        <Input className="flex-1 min-w-[200px]" placeholder="Buscar por nome, e-mail ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32">
          <option value="">Status: todos</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
        </Select>
        <Select value={cargoFilter} onChange={(e) => setCargoFilter(e.target.value)} className="w-40">
          <option value="">Cargo: todos</option>
          {cargos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Select value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)} className="w-48">
          <option value="">Categoria: todas</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
      </div>

      {loading ? <Spinner /> : membros.length === 0 ? <EmptyState message="Nenhum membro encontrado" icon="👥" /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Nome', 'Cargos', 'Categorias', 'Telefone', 'Aniversário', 'Status', ''].map((h) => (
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
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{m.categorias.map((c) => <Badge key={c.categoriaId} variant="blue">{c.categoria.nome}</Badge>)}</div></td>
                  <td className="px-4 py-3 text-gray-600">{m.telefone ? mascararTelefone(m.telefone) : '—'}</td>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar membro' : 'Novo membro'} width="max-w-xl">
        <div className="space-y-3">
          <Input label="Nome completo *" value={form.nomeCompleto} onChange={(e) => setForm((f) => ({ ...f, nomeCompleto: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data de nascimento" type="date" value={form.dataNascimento} onChange={(e) => setForm((f) => ({ ...f, dataNascimento: e.target.value }))} />
            <Input
              label="Telefone"
              placeholder="(83) 99999-0001"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: mascararTelefone(e.target.value) }))}
            />
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
                <button key={c.id} type="button" onClick={() => toggleEm('cargoIds', c.id)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.cargoIds.includes(c.id) ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 text-gray-600 hover:border-primary-400'}`}>
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Categorias (Professor EBD, Músico, Mídia...)</p>
            <div className="flex flex-wrap gap-2">
              {categorias.map((c) => (
                <button key={c.id} type="button" onClick={() => toggleEm('categoriaIds', c.id)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.categoriaIds.includes(c.id) ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Conjuntos musicais</p>
            <div className="flex flex-wrap gap-2">
              {conjuntos.map((c) => (
                <button key={c.id} type="button" onClick={() => toggleEm('conjuntoIds', c.id)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.conjuntoIds.includes(c.id) ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 text-gray-600 hover:border-primary-400'}`}>
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
            <input
              type="checkbox"
              checked={form.consentimentoImagem}
              onChange={(e) => setForm((f) => ({ ...f, consentimentoImagem: e.target.checked }))}
              className="mt-0.5"
            />
            <span>
              Autorizo o uso da minha imagem (fotos e vídeos) em materiais e redes sociais da igreja.
              <strong> Obrigatório para o cadastro.</strong>
            </span>
          </label>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
