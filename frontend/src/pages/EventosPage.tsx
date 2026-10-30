import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { ChevronLeft, ChevronRight, MapPin, Repeat, Search } from 'lucide-react'
import api from '@/services/api'
import type { Evento, RegraRecorrencia, TipoEvento } from '@/types'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { DIAS_SEMANA, POSICOES_MES, descreverRecorrencia, posicaoNoMes } from '@/utils/recorrencia'

dayjs.locale('pt-br')

const tipoLabel: Record<TipoEvento, string> = { CULTO: 'Culto', REUNIAO: 'Reunião', ESPECIAL: 'Especial' }
const tipoVariant: Record<TipoEvento, 'purple' | 'blue' | 'amber'> = { CULTO: 'purple', REUNIAO: 'blue', ESPECIAL: 'amber' }
const FUSO = new Date().getTimezoneOffset()

/** Como o evento se repete na tela. 'DIAS' é gravado como PERSONALIZADA + unidade 'DIAS'. */
type Modo = 'NENHUMA' | 'DIAS' | 'SEMANAL' | 'MENSAL'

interface Formulario {
  nome: string
  descricao: string
  local: string
  inicio: string
  tipo: TipoEvento
  recorrencia: Modo
}
const FORM_VAZIO: Formulario = { nome: '', descricao: '', local: '', inicio: '', tipo: 'CULTO', recorrencia: 'NENHUMA' }

function modoDoEvento(e: Evento): Modo {
  const tipo = e.recorrenciaSerie ?? e.recorrencia
  if (tipo === 'NENHUMA') return 'NENHUMA'
  if (tipo === 'MENSAL') return 'MENSAL'
  return e.regraSerie?.unidade === 'DIAS' ? 'DIAS' : 'SEMANAL'
}

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [mes, setMes] = useState(dayjs().startOf('month'))
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoEvento | ''>('')

  // formulário
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Evento | null>(null)
  const [escopoEdicao, setEscopoEdicao] = useState<'ocorrencia' | 'serie'>('ocorrencia')
  const [form, setForm] = useState<Formulario>(FORM_VAZIO)
  const [diasSemana, setDiasSemana] = useState<number[]>([])
  const [intervalo, setIntervalo] = useState(1)
  const [mensalPor, setMensalPor] = useState<'DIA_DO_MES' | 'DIA_DA_SEMANA'>('DIA_DO_MES')
  const [semanaDoMes, setSemanaDoMes] = useState(1)
  const [diaSemanaMes, setDiaSemanaMes] = useState(0)
  const [fimTipo, setFimTipo] = useState<'OCORRENCIAS' | 'DATA'>('OCORRENCIAS')
  const [fimOcorrencias, setFimOcorrencias] = useState(8)
  const [fimData, setFimData] = useState('')
  const [saving, setSaving] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [previa, setPrevia] = useState<{ total: number; datas: string[] } | null>(null)
  const [previaErro, setPreviaErro] = useState('')

  // exclusão
  const [excluindo, setExcluindo] = useState<Evento | null>(null)
  const [escopoExclusao, setEscopoExclusao] = useState<'ocorrencia' | 'serie'>('ocorrencia')

  const load = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const r = await api.get('/eventos', { params: { mes: mes.month() + 1, ano: mes.year() } })
      setEventos(r.data)
    } catch {
      setErro('Não foi possível carregar os eventos.')
    } finally {
      setLoading(false)
    }
  }, [mes])

  useEffect(() => { load() }, [load])

  // ── Regras do formulário
  const ehOcorrencia = !!editing?.eventoPaiId
  const editandoSerie = !!editing && !ehOcorrencia && editing.recorrencia !== 'NENHUMA'
  const recorrenciaEditavel = !editing || !ehOcorrencia
  const inicioDayjs = form.inicio ? dayjs(form.inicio) : null
  const repete = form.recorrencia !== 'NENHUMA' && recorrenciaEditavel

  function regraDoForm(): RegraRecorrencia {
    return {
      ...(form.recorrencia === 'DIAS' ? { unidade: 'DIAS' as const } : {}),
      ...(form.recorrencia === 'SEMANAL' ? { diasSemana } : {}),
      ...(form.recorrencia === 'MENSAL' && mensalPor === 'DIA_DA_SEMANA' ? { mensalPor, semanaDoMes, diaSemanaMes } : {}),
      intervalo,
      criterioParada: fimTipo === 'DATA' ? { tipo: 'DATA', valor: fimData } : { tipo: 'OCORRENCIAS', valor: fimOcorrencias },
    }
  }

  function montarPayload() {
    const payload: Record<string, unknown> = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      local: form.local.trim() || null,
      inicio: new Date(form.inicio).toISOString(),
      tipo: form.tipo,
      recorrencia: !recorrenciaEditavel || form.recorrencia === 'NENHUMA' ? 'NENHUMA' : form.recorrencia === 'DIAS' ? 'PERSONALIZADA' : form.recorrencia,
      fusoMinutos: FUSO,
    }
    if (repete) payload.regraRecorrencia = regraDoForm()
    return payload
  }

  const regraCompleta =
    repete &&
    !!form.inicio &&
    (form.recorrencia !== 'SEMANAL' || diasSemana.length > 0) &&
    (fimTipo === 'OCORRENCIAS' ? fimOcorrencias >= 1 : !!fimData)

  // Prévia das datas que serão criadas (calculada no servidor, a mesma regra do salvar)
  useEffect(() => {
    if (!modal) return
    if (!regraCompleta) { setPrevia(null); setPreviaErro(''); return }
    const t = setTimeout(async () => {
      try {
        const r = await api.post('/eventos/previa', montarPayload())
        setPrevia(r.data)
        setPreviaErro('')
      } catch (e: unknown) {
        setPrevia(null)
        setPreviaErro((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Regra inválida.')
      }
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, regraCompleta, form.inicio, form.recorrencia, diasSemana, intervalo, mensalPor, semanaDoMes, diaSemanaMes, fimTipo, fimOcorrencias, fimData])

  function resetarRegra(regra?: RegraRecorrencia | null, inicio?: string) {
    setDiasSemana(regra?.diasSemana?.length ? regra.diasSemana : inicio ? [dayjs(inicio).day()] : [])
    setIntervalo(regra?.intervalo ?? regra?.intervaloSemanas ?? 1)
    const fim = regra?.criterioParada
    setFimTipo(fim?.tipo ?? 'OCORRENCIAS')
    setFimOcorrencias(fim?.tipo === 'OCORRENCIAS' ? fim.valor : 8)
    setFimData(fim?.tipo === 'DATA' ? fim.valor.slice(0, 10) : '')
    setMensalPor(regra?.mensalPor ?? 'DIA_DO_MES')
    const dia = inicio ? dayjs(inicio) : null
    setSemanaDoMes(regra?.semanaDoMes ?? (dia ? posicaoNoMes(dia.date()) : 1))
    setDiaSemanaMes(regra?.diaSemanaMes ?? dia?.day() ?? 0)
  }

  function openCreate() {
    setEditing(null)
    setEscopoEdicao('ocorrencia')
    setForm(FORM_VAZIO)
    resetarRegra()
    setErroForm('')
    setModal(true)
  }

  function openEdit(e: Evento) {
    const inicio = dayjs(e.inicio).format('YYYY-MM-DDTHH:mm')
    setEditing(e)
    setEscopoEdicao('ocorrencia')
    setForm({ nome: e.nome, descricao: e.descricao ?? '', local: e.local ?? '', inicio, tipo: e.tipo, recorrencia: modoDoEvento(e) })
    resetarRegra(e.regraSerie, inicio)
    setErroForm('')
    setModal(true)
  }

  function alternarDia(dia: number) {
    setDiasSemana((atual) => (atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia].sort()))
  }

  function mudarInicio(valor: string) {
    setForm((f) => ({ ...f, inicio: valor }))
    // ao escolher a data pela primeira vez, já marca o dia da semana dela
    if (valor && diasSemana.length === 0) setDiasSemana([dayjs(valor).day()])
    // "primeira terça do mês": acompanha a data escolhida até o usuário mexer
    if (valor && !editing) {
      setSemanaDoMes(posicaoNoMes(dayjs(valor).date()))
      setDiaSemanaMes(dayjs(valor).day())
    }
  }

  async function handleSave() {
    setErroForm('')
    if (form.nome.trim().length < 2) return setErroForm('Informe o nome do evento.')
    if (!form.inicio) return setErroForm('Informe a data e a hora.')
    if (repete && !regraCompleta) return setErroForm('Complete como o evento se repete (dias e quando termina).')

    setSaving(true)
    try {
      if (editing) await api.put(`/eventos/${editing.id}`, montarPayload(), { params: ehOcorrencia ? { escopo: escopoEdicao } : undefined })
      else await api.post('/eventos', montarPayload())
      setModal(false)
      await load()
    } catch (e: unknown) {
      setErroForm((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Não foi possível salvar o evento.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return
    setSaving(true)
    try {
      await api.delete(`/eventos/${excluindo.id}`, { params: { escopo: escopoExclusao } })
      setExcluindo(null)
      await load()
    } catch {
      setErro('Não foi possível remover o evento.')
      setExcluindo(null)
    } finally {
      setSaving(false)
    }
  }

  function pedirExclusao(e: Evento) {
    setEscopoExclusao('ocorrencia')
    setExcluindo(e)
  }

  // ── Lista filtrada e agrupada por dia
  const grupos = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const filtrados = eventos.filter(
      (e) =>
        (!filtroTipo || e.tipo === filtroTipo) &&
        (!q || e.nome.toLowerCase().includes(q) || (e.local ?? '').toLowerCase().includes(q))
    )
    const mapa = new Map<string, Evento[]>()
    for (const e of filtrados) {
      const chave = dayjs(e.inicio).format('YYYY-MM-DD')
      mapa.set(chave, [...(mapa.get(chave) ?? []), e])
    }
    return { total: filtrados.length, dias: [...mapa.entries()] }
  }, [eventos, busca, filtroTipo])

  const hoje = dayjs().format('YYYY-MM-DD')
  const agora = dayjs()
  const diaDoMesInicio = inicioDayjs?.date()

  const resumoForm = repete
    ? descreverRecorrencia(form.recorrencia === 'DIAS' ? 'PERSONALIZADA' : form.recorrencia, regraDoForm(), diaDoMesInicio)
    : null

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Eventos</h1>
          <p className="text-sm text-gray-500">Agenda da igreja, com cultos e reuniões que se repetem</p>
        </div>
        <Button onClick={openCreate}>+ Novo evento</Button>
      </div>

      {/* Navegação de mês + filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" aria-label="Mês anterior" onClick={() => setMes((m) => m.subtract(1, 'month'))}><ChevronLeft size={16} /></Button>
          <span className="w-40 text-center text-sm font-semibold text-gray-900">{maiuscula(mes.format('MMMM [de] YYYY'))}</span>
          <Button variant="ghost" size="sm" aria-label="Próximo mês" onClick={() => setMes((m) => m.add(1, 'month'))}><ChevronRight size={16} /></Button>
          <Button variant="secondary" size="sm" onClick={() => setMes(dayjs().startOf('month'))} disabled={mes.isSame(dayjs(), 'month')}>Hoje</Button>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou local"
            className="w-full h-9 rounded-lg border border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex gap-1.5">
          {(['', 'CULTO', 'REUNIAO', 'ESPECIAL'] as const).map((t) => (
            <button
              key={t || 'todos'}
              type="button"
              onClick={() => setFiltroTipo(t)}
              className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                filtroTipo === t ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-primary-400'
              }`}
            >
              {t ? tipoLabel[t] : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}

      {loading ? <Spinner /> : grupos.total === 0 ? (
        <EmptyState message={eventos.length === 0 ? 'Nenhum evento neste mês' : 'Nenhum evento corresponde aos filtros'} icon="📅" />
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">{grupos.total} {grupos.total === 1 ? 'evento' : 'eventos'} neste mês</p>
          <div className="space-y-4">
            {grupos.dias.map(([dia, lista]) => {
              const d = dayjs(dia)
              const ehHoje = dia === hoje
              return (
                <section key={dia}>
                  <h2 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${ehHoje ? 'text-primary-600' : 'text-gray-500'}`}>
                    {maiuscula(d.format('dddd'))}, {d.format('DD [de] MMMM')}
                    {ehHoje && <span className="ml-2 normal-case bg-primary-500 text-white rounded-full px-2 py-0.5">Hoje</span>}
                  </h2>
                  <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {lista.map((e) => {
                      const passou = dayjs(e.inicio).isBefore(agora)
                      const serie = e.serieId ? descreverRecorrencia(e.recorrenciaSerie, e.regraSerie, dayjs(e.inicio).date()) : null
                      return (
                        <div key={e.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${passou ? 'opacity-60' : ''}`}>
                          <div className="w-14 text-center flex-shrink-0">
                            <p className="text-base font-bold text-primary-600 leading-none">{dayjs(e.inicio).format('HH:mm')}</p>
                          </div>
                          <div className="flex-1 min-w-[180px]">
                            <p className="text-sm font-semibold text-gray-900">{e.nome}</p>
                            <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3">
                              {e.local && <span className="inline-flex items-center gap-1"><MapPin size={11} />{e.local}</span>}
                              {serie && <span className="inline-flex items-center gap-1 text-primary-600"><Repeat size={11} />{serie}</span>}
                            </p>
                          </div>
                          <Badge variant={tipoVariant[e.tipo]}>{tipoLabel[e.tipo]}</Badge>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>Editar</Button>
                            <Button variant="ghost" size="sm" onClick={() => pedirExclusao(e)} className="text-red-500 hover:bg-red-50">Remover</Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}

      {/* Criar / editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar evento' : 'Novo evento'}>
        <div className="space-y-3">
          {ehOcorrencia && (
            <div className="rounded-xl bg-primary-50 border border-primary-100 p-3 space-y-2 text-sm">
              <p className="text-primary-700 font-medium">Este evento faz parte de uma série</p>
              {([
                ['ocorrencia', 'Alterar somente este dia'],
                ['serie', 'Alterar todos os eventos da série (nome, local, tipo e horário)'],
              ] as const).map(([valor, texto]) => (
                <label key={valor} className="flex items-start gap-2 text-gray-700">
                  <input type="radio" className="mt-1" checked={escopoEdicao === valor} onChange={() => setEscopoEdicao(valor)} />
                  {texto}
                </label>
              ))}
            </div>
          )}

          <Input label="Nome *" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={repete ? 'Primeiro dia e horário *' : 'Data e hora *'} type="datetime-local" value={form.inicio} onChange={(e) => mudarInicio(e.target.value)} />
            <Input label="Local" value={form.local} onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoEvento }))}>
              <option value="CULTO">Culto</option>
              <option value="REUNIAO">Reunião</option>
              <option value="ESPECIAL">Especial</option>
            </Select>
            {recorrenciaEditavel && (
              <Select label="Repetição" value={form.recorrencia} onChange={(e) => { setForm((f) => ({ ...f, recorrencia: e.target.value as Modo })); setIntervalo(1) }}>
                <option value="NENHUMA">Não repete</option>
                <option value="DIAS">A cada N dias</option>
                <option value="SEMANAL">Toda semana (escolhendo os dias)</option>
                <option value="MENSAL">Todo mês</option>
              </Select>
            )}
          </div>

          {repete && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
              {form.recorrencia === 'DIAS' && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="font-medium">Repetir a cada</span>
                  <input type="number" min={1} max={365} value={intervalo} onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value) || 1))} className="w-16 h-8 rounded-lg border border-gray-300 px-2 text-sm" />
                  <span>{intervalo === 1 ? 'dia (todos os dias)' : 'dias'}</span>
                </div>
              )}

              {form.recorrencia === 'SEMANAL' && (
                <>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Em quais dias da semana? <span className="text-gray-400 font-normal">(ex.: só quinta = toda quinta)</span></p>
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS_SEMANA.map((d) => (
                        <button
                          type="button"
                          key={d.valor}
                          onClick={() => alternarDia(d.valor)}
                          aria-pressed={diasSemana.includes(d.valor)}
                          className={`w-11 h-9 rounded-lg text-xs font-medium transition-colors ${
                            diasSemana.includes(d.valor) ? 'bg-primary-500 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-primary-400'
                          }`}
                        >
                          {d.curto}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-medium">A cada</span>
                    <input type="number" min={1} max={52} value={intervalo} onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value) || 1))} className="w-16 h-8 rounded-lg border border-gray-300 px-2 text-sm" />
                    <span>{intervalo === 1 ? 'semana' : 'semanas'}</span>
                    <span className="text-gray-400">(1 = toda semana, 2 = quinzenal)</span>
                  </div>
                </>
              )}

              {form.recorrencia === 'MENSAL' && (
                <div className="space-y-2 text-xs text-gray-700">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={mensalPor === 'DIA_DO_MES'} onChange={() => setMensalPor('DIA_DO_MES')} />
                    No mesmo dia do mês (dia {diaDoMesInicio ?? '—'})
                    {(diaDoMesInicio ?? 0) > 28 && <span className="text-gray-400">· em meses curtos, cai no último dia</span>}
                  </label>
                  <label className="flex flex-wrap items-center gap-2">
                    <input type="radio" checked={mensalPor === 'DIA_DA_SEMANA'} onChange={() => setMensalPor('DIA_DA_SEMANA')} />
                    Sempre na
                    <select value={semanaDoMes} onFocus={() => setMensalPor('DIA_DA_SEMANA')} onChange={(e) => { setMensalPor('DIA_DA_SEMANA'); setSemanaDoMes(Number(e.target.value)) }} className="h-8 rounded-lg border border-gray-300 px-2 text-sm bg-white">
                      {POSICOES_MES.map((p) => <option key={p.valor} value={p.valor}>{p.label}</option>)}
                    </select>
                    <select value={diaSemanaMes} onFocus={() => setMensalPor('DIA_DA_SEMANA')} onChange={(e) => { setMensalPor('DIA_DA_SEMANA'); setDiaSemanaMes(Number(e.target.value)) }} className="h-8 rounded-lg border border-gray-300 px-2 text-sm bg-white">
                      {DIAS_SEMANA.map((d) => <option key={d.valor} value={d.valor}>{d.longo}</option>)}
                    </select>
                    do mês
                  </label>
                  <div className="flex items-center gap-2 text-gray-600 pt-1">
                    <span className="font-medium">A cada</span>
                    <input type="number" min={1} max={12} value={intervalo} onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value) || 1))} className="w-16 h-8 rounded-lg border border-gray-300 px-2 text-sm" />
                    <span>{intervalo === 1 ? 'mês' : 'meses'}</span>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Quando termina?</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-700">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={fimTipo === 'OCORRENCIAS'} onChange={() => setFimTipo('OCORRENCIAS')} />
                    Após
                    <input type="number" min={1} max={200} value={fimOcorrencias} onFocus={() => setFimTipo('OCORRENCIAS')} onChange={(e) => setFimOcorrencias(Math.min(200, Math.max(1, Number(e.target.value) || 1)))} className="w-16 h-8 rounded-lg border border-gray-300 px-2 text-sm" />
                    ocorrências
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={fimTipo === 'DATA'} onChange={() => setFimTipo('DATA')} />
                    Até
                    <input type="date" value={fimData} min={inicioDayjs?.format('YYYY-MM-DD')} onFocus={() => setFimTipo('DATA')} onChange={(e) => { setFimData(e.target.value); setFimTipo('DATA') }} className="h-8 rounded-lg border border-gray-300 px-2 text-sm" />
                  </label>
                </div>
              </div>

              <div className="rounded-lg bg-white border border-gray-200 p-3 text-sm">
                {resumoForm && <p className="font-medium text-primary-700 mb-1">{resumoForm}</p>}
                {previaErro ? (
                  <p className="text-xs text-red-600">{previaErro}</p>
                ) : previa ? (
                  <>
                    <p className="text-xs text-gray-500 mb-2">
                      Serão criados <strong>{previa.total}</strong> {previa.total === 1 ? 'evento' : 'eventos'}:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {previa.datas.slice(0, 12).map((iso) => (
                        <span key={iso} className="px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 text-xs">
                          {dayjs(iso).format('ddd DD/MM')}
                        </span>
                      ))}
                      {previa.total > 12 && <span className="text-xs text-gray-500 self-center">… até {dayjs(previa.datas[previa.datas.length - 1]).format('DD/MM/YYYY')}</span>}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Escolha a data de início, os dias e quando termina para ver as datas.</p>
                )}
              </div>

              {editandoSerie && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Ao salvar, as datas da série são recriadas pela nova regra (ajustes feitos em dias específicos serão desfeitos).
                </p>
              )}
            </div>
          )}

          <Input label="Descrição" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          {erroForm && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erroForm}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!excluindo}
        title="Remover evento"
        confirmLabel="Remover"
        loading={saving}
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluindo(null)}
      >
        <p>
          Remover <strong>{excluindo?.nome}</strong>
          {excluindo ? ` de ${dayjs(excluindo.inicio).format('DD/MM/YYYY [às] HH:mm')}` : ''}?
        </p>
        {excluindo?.serieId && (
          excluindo.eventoPaiId ? (
            <div className="space-y-2 pt-1">
              {([
                ['ocorrencia', 'Somente este dia'],
                ['serie', 'A série inteira (todos os dias em que se repete)'],
              ] as const).map(([valor, texto]) => (
                <label key={valor} className="flex items-start gap-2 text-gray-700">
                  <input type="radio" className="mt-1" checked={escopoExclusao === valor} onChange={() => setEscopoExclusao(valor)} />
                  {texto}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Este é o primeiro evento da série: todos os eventos que se repetem a partir dele serão removidos juntos.
            </p>
          )
        )}
      </ConfirmDialog>
    </div>
  )
}
