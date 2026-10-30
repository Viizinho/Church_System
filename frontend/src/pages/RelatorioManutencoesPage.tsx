import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import type { AtivoRelatorio, Manutencao } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatarData, paraInputData } from '@/utils/data'

const statusVariant = { VENCIDO: 'red', PROXIMO: 'amber', SEM_REGISTRO: 'gray', EM_DIA: 'green' } as const
const statusLabel = { VENCIDO: 'Vencido', PROXIMO: 'Próximo', SEM_REGISTRO: 'Sem registro', EM_DIA: 'Em dia' } as const

interface Alvo {
  manutencao: Manutencao
  ativoNome: string
}

export default function RelatorioManutencoesPage() {
  const [ativos, setAtivos] = useState<AtivoRelatorio[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [filtroAtivo, setFiltroAtivo] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  const [editando, setEditando] = useState<Alvo | null>(null)
  const [form, setForm] = useState({ data: '', descricao: '', responsavel: '' })
  const [excluindo, setExcluindo] = useState<Alvo | null>(null)
  const [saving, setSaving] = useState(false)

  // Lista completa de ativos para o filtro (não some quando o filtro está aplicado)
  const [todosAtivos, setTodosAtivos] = useState<{ id: string; nome: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const r = await api.get('/manutencoes/relatorio', {
        params: { ativoId: filtroAtivo || undefined, de: de || undefined, ate: ate || undefined },
      })
      setAtivos(r.data)
    } catch {
      setErro('Não foi possível carregar o relatório.')
    } finally {
      setLoading(false)
    }
  }, [filtroAtivo, de, ate])

  useEffect(() => { load() }, [load])

  // Lista de ativos do filtro: carregada uma vez, independente dos filtros aplicados
  useEffect(() => {
    api.get('/ativos').then((r) => setTodosAtivos(r.data.map((a: { id: string; nome: string }) => ({ id: a.id, nome: a.nome })))).catch(() => {})
  }, [])

  const totalRegistros = ativos.reduce((acc, a) => acc + a.manutencoes.length, 0)

  function abrirEdicao(alvo: Alvo) {
    setForm({
      data: paraInputData(alvo.manutencao.data),
      descricao: alvo.manutencao.descricao,
      responsavel: alvo.manutencao.responsavel,
    })
    setEditando(alvo)
    setErro('')
  }

  async function salvarEdicao() {
    if (!editando) return
    if (!form.data || form.descricao.trim().length < 2 || form.responsavel.trim().length < 2) {
      setErro('Preencha data, responsável e descrição.')
      return
    }
    setSaving(true)
    setErro('')
    try {
      await api.put(`/manutencoes/${editando.manutencao.id}`, form)
      setEditando(null)
      await load()
    } catch {
      setErro('Não foi possível salvar a manutenção.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return
    setSaving(true)
    setErro('')
    try {
      await api.delete(`/manutencoes/${excluindo.manutencao.id}`)
      setExcluindo(null)
      await load()
    } catch {
      setErro('Não foi possível excluir a manutenção.')
      setExcluindo(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Relatório de manutenções</h1>
          <p className="text-sm text-gray-500">Todas as manutenções realizadas, agrupadas por ativo</p>
        </div>
        <Link to="/manutencao">
          <Button variant="secondary">← Voltar aos ativos</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <Select label="Ativo" value={filtroAtivo} onChange={(e) => setFiltroAtivo(e.target.value)}>
          <option value="">Todos os ativos</option>
          {todosAtivos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </Select>
        <Input label="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        <Input label="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        <Button
          variant="ghost"
          onClick={() => { setFiltroAtivo(''); setDe(''); setAte('') }}
          disabled={!filtroAtivo && !de && !ate}
        >
          Limpar filtros
        </Button>
      </div>

      {erro && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

      {loading ? <Spinner /> : ativos.length === 0 ? (
        <EmptyState message="Nenhum ativo encontrado" icon="🔧" />
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">
            {ativos.length} {ativos.length === 1 ? 'ativo' : 'ativos'} · {totalRegistros} {totalRegistros === 1 ? 'manutenção' : 'manutenções'}
          </p>
          <div className="space-y-4">
            {ativos.map((a) => (
              <section key={a.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div>
                    <h2 className="font-semibold text-gray-900">{a.nome}</h2>
                    <p className="text-xs text-gray-500">
                      a cada {a.periodicidadeDias} dias · última: {formatarData(a.ultimaManutencao)} · próxima: {formatarData(a.proximaManutencao)}
                    </p>
                  </div>
                  <Badge variant={statusVariant[a.status]}>{statusLabel[a.status]}</Badge>
                </header>

                {a.manutencoes.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhuma manutenção no período.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>{['Data', 'Serviço realizado', 'Responsável', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-500">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {a.manutencoes.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatarData(m.data)}</td>
                          <td className="px-4 py-3 text-gray-900">{m.descricao}</td>
                          <td className="px-4 py-3 text-gray-600">{m.responsavel}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => abrirEdicao({ manutencao: m, ativoNome: a.nome })}>Editar</Button>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => setExcluindo({ manutencao: m, ativoNome: a.nome })}>Excluir</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Editar manutenção — ${editando?.ativoNome ?? ''}`}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data *" type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
            <Input label="Responsável *" value={form.responsavel} onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))} />
          </div>
          <Input label="Descrição do serviço *" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          {erro && editando && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvarEdicao} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!excluindo}
        title="Excluir manutenção"
        confirmLabel="Excluir"
        loading={saving}
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluindo(null)}
      >
        <p>
          Excluir a manutenção de <strong>{excluindo?.ativoNome}</strong> realizada em{' '}
          <strong>{excluindo ? formatarData(excluindo.manutencao.data) : ''}</strong>?
        </p>
        <p className="text-xs text-gray-500">
          “{excluindo?.manutencao.descricao}”. A próxima manutenção e o status do ativo serão recalculados.
        </p>
      </ConfirmDialog>
    </div>
  )
}
