import { useEffect, useMemo, useState } from 'react'
import { History, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import type { Ativo, Manutencao } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import dayjs from 'dayjs'
import { formatarData } from '@/utils/data'
import OrdenacaoSelect from '@/components/ui/OrdenacaoSelect'
import { URGENCIA, compararData, compararTexto, ordenar, type OpcaoOrdenacao } from '@/utils/ordenacao'

function statusVariant(s: string) { return { VENCIDO: 'red', PROXIMO: 'amber', SEM_REGISTRO: 'gray', EM_DIA: 'green' }[s] as any }
function statusLabel(s: string) { return { VENCIDO: 'Vencido', PROXIMO: 'Próximo', SEM_REGISTRO: 'Sem registro', EM_DIA: 'Em dia' }[s] ?? s }


type Ordem = 'urgencia' | 'proxima' | 'ultima' | 'nome'
const OPCOES_ORDEM: OpcaoOrdenacao<Ordem>[] = [
  { valor: 'urgencia', label: 'Mais urgentes primeiro' },
  { valor: 'proxima', label: 'Próxima manutenção' },
  { valor: 'ultima', label: 'Última manutenção (recente)' },
  { valor: 'nome', label: 'Nome (A–Z)' },
]

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
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('urgencia')

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

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const lista = ativos.filter(
      (a) => (!filtroStatus || a.status === filtroStatus) && (!q || a.nome.toLowerCase().includes(q) || (a.descricao ?? '').toLowerCase().includes(q))
    )
    switch (ordem) {
      case 'nome': return ordenar(lista, (a, b) => compararTexto(a.nome, b.nome))
      case 'proxima': return ordenar(lista, (a, b) => compararData(a.proximaManutencao, b.proximaManutencao) || compararTexto(a.nome, b.nome))
      case 'ultima': return ordenar(lista, (a, b) => compararData(b.ultimaManutencao?.data, a.ultimaManutencao?.data) || compararTexto(a.nome, b.nome))
      default: return ordenar(lista, (a, b) => (URGENCIA[a.status] ?? 9) - (URGENCIA[b.status] ?? 9) || compararData(a.proximaManutencao, b.proximaManutencao) || compararTexto(a.nome, b.nome))
    }
  }, [ativos, busca, filtroStatus, ordem])

  return (
    <div className="p-4 sm:p-6 2xl:px-10">
      <PageHeader
        title="Manutenção"
        subtitle="Controle de ativos da igreja"
        actions={<>
          <Link to="/manutencao/relatorio"><Button variant="secondary"><History size={15} aria-hidden /> Histórico de manutenções</Button></Link>
          <Button onClick={openCreateAtivo}>+ Novo ativo</Button>
        </>}
      />

      {!loading && ativos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar ativo"
              aria-label="Buscar ativo"
              className="w-full h-9 rounded-lg border border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            aria-label="Filtrar por situação"
            className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-gray-700 outline-none focus:border-primary-500"
          >
            <option value="">Todas as situações</option>
            <option value="VENCIDO">Vencido</option>
            <option value="SEM_REGISTRO">Sem registro</option>
            <option value="PROXIMO">Próximo</option>
            <option value="EM_DIA">Em dia</option>
          </select>
          <OrdenacaoSelect value={ordem} onChange={setOrdem} opcoes={OPCOES_ORDEM} />
        </div>
      )}

      {loading ? <Spinner /> : ativos.length === 0 ? <EmptyState message="Nenhum ativo cadastrado" icon="🔧" /> : visiveis.length === 0 ? <EmptyState message="Nenhum ativo corresponde aos filtros" icon="🔍" /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Ativo','Periodicidade','Última manutenção','Próxima','Status',''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visiveis.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                  <td className="px-4 py-3 text-gray-600">a cada {a.periodicidadeDias} dias</td>
                  <td className="px-4 py-3 text-gray-600">{formatarData(a.ultimaManutencao?.data)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatarData(a.proximaManutencao)}</td>
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
                    <span className="font-medium text-gray-700">{formatarData(h.data)}</span>
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
