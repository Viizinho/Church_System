import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { Ativo, Manutencao } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import dayjs from 'dayjs'

function statusVariant(s: string) { return { VENCIDO: 'red', PROXIMO: 'amber', SEM_REGISTRO: 'gray', EM_DIA: 'green' }[s] as any }
function statusLabel(s: string) { return { VENCIDO: 'Vencido', PROXIMO: 'Próximo', SEM_REGISTRO: 'Sem registro', EM_DIA: 'Em dia' }[s] ?? s }

export default function ManutencaoPage() {
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAtivo, setModalAtivo] = useState(false)
  const [modalManut, setModalManut] = useState<Ativo | null>(null)
  const [editingAtivo, setEditingAtivo] = useState<Ativo | null>(null)
  const [formAtivo, setFormAtivo] = useState({ nome: '', descricao: '', periodicidadeDias: '' })
  const [formManut, setFormManut] = useState({ data: dayjs().format('YYYY-MM-DD'), descricao: '', responsavel: '' })
  const [saving, setSaving] = useState(false)
  const [historico, setHistorico] = useState<Manutencao[]>([])

  async function load() {
    setLoading(true)
    const r = await api.get('/ativos')
    setAtivos(r.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreateAtivo() {
    setEditingAtivo(null)
    setFormAtivo({ nome: '', descricao: '', periodicidadeDias: '' })
    setModalAtivo(true)
  }

  function openEditAtivo(a: Ativo) {
    setEditingAtivo(a)
    setFormAtivo({ nome: a.nome, descricao: a.descricao ?? '', periodicidadeDias: String(a.periodicidadeDias) })
    setModalAtivo(true)
  }

  async function openModalManut(a: Ativo) {
    const r = await api.get(`/ativos/${a.id}`)
    setHistorico(r.data.historico ?? [])
    setFormManut({ data: dayjs().format('YYYY-MM-DD'), descricao: '', responsavel: '' })
    setModalManut(a)
  }

  async function handleSaveAtivo() {
    setSaving(true)
    const payload = { ...formAtivo, periodicidadeDias: Number(formAtivo.periodicidadeDias), descricao: formAtivo.descricao || null }
    if (editingAtivo) await api.put(`/ativos/${editingAtivo.id}`, payload)
    else await api.post('/ativos', payload)
    setSaving(false)
    setModalAtivo(false)
    load()
  }

  async function handleRegistrarManut() {
    if (!modalManut) return
    setSaving(true)
    await api.post(`/ativos/${modalManut.id}/manutencoes`, formManut)
    setSaving(false)
    setModalManut(null)
    load()
  }

  async function handleDeleteAtivo(id: string) {
    if (!confirm('Remover este ativo?')) return
    await api.delete(`/ativos/${id}`)
    load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Manutenção</h1>
          <p className="text-sm text-gray-500">Controle de ativos da igreja</p>
        </div>
        <Button onClick={openCreateAtivo}>+ Novo ativo</Button>
      </div>

      {loading ? <Spinner /> : ativos.length === 0 ? <EmptyState message="Nenhum ativo cadastrado" icon="🔧" /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Ativo','Periodicidade','Última manutenção','Próxima','Status',''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ativos.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                  <td className="px-4 py-3 text-gray-600">a cada {a.periodicidadeDias} dias</td>
                  <td className="px-4 py-3 text-gray-600">{a.ultimaManutencao ? dayjs(a.ultimaManutencao.data).format('DD/MM/YYYY') : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.proximaManutencao ? dayjs(a.proximaManutencao).format('DD/MM/YYYY') : '—'}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(a.status)}>{statusLabel(a.status)}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openModalManut(a)} className="text-green-700 hover:bg-green-50">Registrar</Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditAtivo(a)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteAtivo(a.id)} className="text-red-500 hover:bg-red-50">Remover</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalAtivo} onClose={() => setModalAtivo(false)} title={editingAtivo ? 'Editar ativo' : 'Novo ativo'}>
        <div className="space-y-3">
          <Input label="Nome *" value={formAtivo.nome} onChange={(e) => setFormAtivo((f) => ({ ...f, nome: e.target.value }))} />
          <Input label="Descrição" value={formAtivo.descricao} onChange={(e) => setFormAtivo((f) => ({ ...f, descricao: e.target.value }))} />
          <Input label="Periodicidade (dias) *" type="number" min="1" value={formAtivo.periodicidadeDias} onChange={(e) => setFormAtivo((f) => ({ ...f, periodicidadeDias: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAtivo(false)}>Cancelar</Button>
            <Button onClick={handleSaveAtivo} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!modalManut} onClose={() => setModalManut(null)} title={`Registrar manutenção — ${modalManut?.nome}`} width="max-w-xl">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data *" type="date" value={formManut.data} onChange={(e) => setFormManut((f) => ({ ...f, data: e.target.value }))} />
            <Input label="Responsável *" value={formManut.responsavel} onChange={(e) => setFormManut((f) => ({ ...f, responsavel: e.target.value }))} />
          </div>
          <Input label="Descrição do serviço *" value={formManut.descricao} onChange={(e) => setFormManut((f) => ({ ...f, descricao: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalManut(null)}>Cancelar</Button>
            <Button onClick={handleRegistrarManut} loading={saving}>Salvar</Button>
          </div>

          {historico.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Histórico</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {historico.map((h) => (
                  <div key={h.id} className="text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-gray-700">{dayjs(h.data).format('DD/MM/YYYY')}</span>
                    <span className="text-gray-500"> · {h.responsavel} · {h.descricao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
