import { useEffect, useState } from 'react'
import api from '@/services/api'
import type { Evento } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import dayjs from 'dayjs'

const tipoLabel: Record<string, string> = { CULTO: 'Culto', REUNIAO: 'Reunião', ESPECIAL: 'Especial' }
const recLabel: Record<string, string> = { NENHUMA: 'Único', SEMANAL: 'Semanal', MENSAL: 'Mensal', PERSONALIZADA: 'Personalizada' }
const recVariant: Record<string, 'purple' | 'gray'> = { NENHUMA: 'gray', SEMANAL: 'purple', MENSAL: 'purple', PERSONALIZADA: 'purple' }
const DIAS_SEMANA = [
  { valor: 0, label: 'Dom' }, { valor: 1, label: 'Seg' }, { valor: 2, label: 'Ter' },
  { valor: 3, label: 'Qua' }, { valor: 4, label: 'Qui' }, { valor: 5, label: 'Sex' }, { valor: 6, label: 'Sáb' },
]

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(dayjs().month() + 1)
  const [ano, setAno] = useState(dayjs().year())
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Evento | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '', local: '', inicio: '', tipo: 'CULTO', recorrencia: 'NENHUMA' })
  const [diasSemana, setDiasSemana] = useState<number[]>([])
  const [intervaloSemanas, setIntervaloSemanas] = useState(1)
  const [criterioTipo, setCriterioTipo] = useState<'OCORRENCIAS' | 'DATA'>('OCORRENCIAS')
  const [criterioOcorrencias, setCriterioOcorrencias] = useState(10)
  const [criterioData, setCriterioData] = useState('')
  const [saving, setSaving] = useState(false)

  function alternarDia(dia: number) {
    setDiasSemana((atual) => (atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia]))
  }

  async function load() {
    setLoading(true)
    const r = await api.get('/eventos', { params: { mes, ano } })
    setEventos(r.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [mes, ano])

  function openCreate() {
    setEditing(null)
    setForm({ nome: '', descricao: '', local: '', inicio: '', tipo: 'CULTO', recorrencia: 'NENHUMA' })
    setDiasSemana([])
    setIntervaloSemanas(1)
    setCriterioTipo('OCORRENCIAS')
    setCriterioOcorrencias(10)
    setCriterioData('')
    setModal(true)
  }

  function openEdit(e: Evento) {
    setEditing(e)
    setForm({ nome: e.nome, descricao: e.descricao ?? '', local: e.local ?? '', inicio: dayjs(e.inicio).format('YYYY-MM-DDTHH:mm'), tipo: e.tipo, recorrencia: e.recorrencia })
    setDiasSemana([])
    setIntervaloSemanas(1)
    setCriterioTipo('OCORRENCIAS')
    setCriterioOcorrencias(10)
    setCriterioData('')
    setModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload: Record<string, unknown> = {
      ...form,
      inicio: new Date(form.inicio).toISOString(),
      descricao: form.descricao || null,
      local: form.local || null,
    }

    if (form.recorrencia === 'PERSONALIZADA') {
      payload.regraRecorrencia = {
        diasSemana,
        intervaloSemanas,
        criterioParada:
          criterioTipo === 'DATA'
            ? { tipo: 'DATA', valor: criterioData }
            : { tipo: 'OCORRENCIAS', valor: criterioOcorrencias },
      }
    }

    if (editing) await api.put(`/eventos/${editing.id}`, payload)
    else await api.post('/eventos', payload)
    setSaving(false)
    setModal(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este evento?')) return
    await api.delete(`/eventos/${id}`)
    load()
  }

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Eventos</h1>
          <p className="text-sm text-gray-500">Agenda da igreja</p>
        </div>
        <Button onClick={openCreate}>+ Novo evento</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-36">
          {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </Select>
        <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="w-24">
          {[2024,2025,2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>

      {loading ? <Spinner /> : eventos.length === 0 ? <EmptyState message="Nenhum evento neste mês" icon="📅" /> : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {eventos.map((e) => (
            <div key={e.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-base font-bold text-primary-600 leading-none">{dayjs(e.inicio).format('DD')}</span>
                <span className="text-[10px] text-primary-400 uppercase">{dayjs(e.inicio).format('MMM')}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{e.nome}</p>
                <p className="text-xs text-gray-500">{dayjs(e.inicio).format('HH:mm')} · {e.local ?? '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="gray">{tipoLabel[e.tipo]}</Badge>
                <Badge variant={recVariant[e.recorrencia]}>{recLabel[e.recorrencia]}</Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} className="text-red-500 hover:bg-red-50">Remover</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar evento' : 'Novo evento'}>
        <div className="space-y-3">
          <Input label="Nome *" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          <Input label="Local" value={form.local} onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))} />
          <Input label="Data e hora *" type="datetime-local" value={form.inicio} onChange={(e) => setForm((f) => ({ ...f, inicio: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
              <option value="CULTO">Culto</option>
              <option value="REUNIAO">Reunião</option>
              <option value="ESPECIAL">Especial</option>
            </Select>
            <Select label="Recorrência" value={form.recorrencia} onChange={(e) => setForm((f) => ({ ...f, recorrencia: e.target.value }))}>
              <option value="NENHUMA">Único</option>
              <option value="SEMANAL">Semanal</option>
              <option value="MENSAL">Mensal</option>
              <option value="PERSONALIZADA">Personalizada</option>
            </Select>
          </div>

          {form.recorrencia === 'PERSONALIZADA' && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Repetir nos dias</p>
                <div className="flex gap-1.5">
                  {DIAS_SEMANA.map((d) => (
                    <button
                      type="button"
                      key={d.valor}
                      onClick={() => alternarDia(d.valor)}
                      className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                        diasSemana.includes(d.valor) ? 'bg-primary-500 text-white' : 'bg-white border border-gray-300 text-gray-600'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Repetir a cada</span>
                <input
                  type="number"
                  min={1}
                  value={intervaloSemanas}
                  onChange={(e) => setIntervaloSemanas(Number(e.target.value))}
                  className="w-16 h-8 rounded-lg border border-gray-300 px-2 text-sm"
                />
                <span className="text-xs text-gray-600">semana(s)</span>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Critério de parada</p>
                <div className="flex gap-4 mb-2 text-xs">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={criterioTipo === 'OCORRENCIAS'} onChange={() => setCriterioTipo('OCORRENCIAS')} />
                    Número de ocorrências
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={criterioTipo === 'DATA'} onChange={() => setCriterioTipo('DATA')} />
                    Até uma data
                  </label>
                </div>
                {criterioTipo === 'OCORRENCIAS' ? (
                  <input
                    type="number"
                    min={1}
                    value={criterioOcorrencias}
                    onChange={(e) => setCriterioOcorrencias(Number(e.target.value))}
                    className="w-24 h-8 rounded-lg border border-gray-300 px-2 text-sm"
                  />
                ) : (
                  <input
                    type="date"
                    value={criterioData}
                    onChange={(e) => setCriterioData(e.target.value)}
                    className="h-8 rounded-lg border border-gray-300 px-2 text-sm"
                  />
                )}
              </div>
            </div>
          )}
          <Input label="Descrição" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
