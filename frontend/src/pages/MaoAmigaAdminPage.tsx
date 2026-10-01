import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { DoacaoAlimento, Membro } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
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
  const [pendentes, setPendentes] = useState<DoacaoAlimento[]>([])
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
    const [dRes, pRes, mRes, metasRes] = await Promise.all([
      api.get('/mao-amiga/doacoes'),
      api.get('/mao-amiga/doacoes/pendentes'),
      api.get('/membros', { params: { status: 'ATIVO' } }),
      api.get('/mao-amiga/metas'),
    ])
    setDoacoes(dRes.data)
    setPendentes(pRes.data)
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

  async function confirmar(id: string) { await api.patch(`/mao-amiga/doacoes/${id}/confirmar`); load() }
  async function recusar(id: string) { await api.patch(`/mao-amiga/doacoes/${id}/recusar`); load() }

  const statusVariant: Record<string, any> = { CONFIRMADO: 'green', PENDENTE: 'amber', RECUSADO: 'red' }
  const statusLabel: Record<string, string> = { CONFIRMADO: 'Confirmado', PENDENTE: 'Pendente', RECUSADO: 'Recusado' }

  if (loading) return <Spinner />

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projeto Mão Amiga</h1>
          <p className="text-sm text-gray-500">Doações de alimentos</p>
        </div>
        <Button onClick={() => { setForm({ membroId: '', nomeDoador: '', data: dayjs().format('YYYY-MM-DD'), itemDoado: '', quantidade: '', tipo: 'FISICA', metaCestaId: '', quantidadeNumerica: '' }); setModal(true) }}>+ Registrar doação</Button>
      </div>

      {pendentes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">🕐 Pix pendentes ({pendentes.length})</h2>
          <div className="space-y-2">
            {pendentes.map((d) => (
              <div key={d.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{d.membro?.nomeCompleto ?? d.nomeDoador ?? 'Doador anônimo'} — Pix</p>
                  <p className="text-xs text-gray-500">{dayjs(d.criadoEm).format('DD/MM/YYYY HH:mm')}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => confirmar(d.id)} className="bg-green-600 hover:bg-green-700">✓ Confirmar</Button>
                  <Button size="sm" variant="secondary" onClick={() => recusar(d.id)} className="text-red-600 border-red-300 hover:bg-red-50">✗ Recusar</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {doacoes.length === 0 ? <EmptyState message="Nenhuma doação registrada" icon="🧺" /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Doador','Item','Quantidade','Tipo','Data','Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doacoes.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.membro?.nomeCompleto ?? d.nomeDoador ?? 'Anônimo'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.itemDoado}</td>
                  <td className="px-4 py-3 text-gray-600">{d.quantidade}</td>
                  <td className="px-4 py-3"><Badge variant={d.tipo === 'FISICA' ? 'green' : 'purple'}>{d.tipo === 'FISICA' ? 'Física' : 'Pix'}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{dayjs(d.data).format('DD/MM/YYYY')}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant[d.status]}>{statusLabel[d.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
    </div>
  )
}
