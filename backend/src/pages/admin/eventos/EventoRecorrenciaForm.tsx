import { FormEvent, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'

const DIAS_SEMANA = [
  { valor: 0, label: 'Dom' },
  { valor: 1, label: 'Seg' },
  { valor: 2, label: 'Ter' },
  { valor: 3, label: 'Qua' },
  { valor: 4, label: 'Qui' },
  { valor: 5, label: 'Sex' },
  { valor: 6, label: 'Sáb' },
]

type CriterioTipo = 'DATA' | 'OCORRENCIAS'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function EventoRecorrenciaForm() {
  const { token } = useAuth()

  const [nome, setNome] = useState('')
  const [inicio, setInicio] = useState('')
  const [tipo, setTipo] = useState<'CULTO' | 'REUNIAO' | 'ESPECIAL'>('CULTO')
  const [recorrente, setRecorrente] = useState(false)
  const [diasSemana, setDiasSemana] = useState<number[]>([])
  const [intervaloSemanas, setIntervaloSemanas] = useState(1)
  const [criterioTipo, setCriterioTipo] = useState<CriterioTipo>('OCORRENCIAS')
  const [criterioData, setCriterioData] = useState('')
  const [criterioOcorrencias, setCriterioOcorrencias] = useState(10)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [salvando, setSalvando] = useState(false)

  function alternarDia(dia: number) {
    setDiasSemana((atual) => (atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(false)

    if (recorrente && diasSemana.length === 0) {
      setErro('Selecione ao menos um dia da semana para a recorrência.')
      return
    }

    setSalvando(true)
    try {
      const payload = {
        nome,
        inicio: new Date(inicio).toISOString(),
        tipo,
        recorrencia: recorrente ? 'PERSONALIZADA' : 'NENHUMA',
        regraRecorrencia: recorrente
          ? {
              diasSemana,
              intervaloSemanas,
              criterioParada:
                criterioTipo === 'DATA'
                  ? { tipo: 'DATA', valor: criterioData }
                  : { tipo: 'OCORRENCIAS', valor: criterioOcorrencias },
            }
          : null,
      }

      const resp = await fetch(`${API_URL}/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error ?? data.detalhes?.join(', ') ?? 'Erro ao criar evento.')
      }

      setSucesso(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Novo evento</h1>

      <div>
        <label className="block text-sm font-medium mb-1">Nome do evento</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full border rounded px-3 py-2" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Data/hora inicial</label>
          <input
            type="datetime-local"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="w-full border rounded px-3 py-2">
            <option value="CULTO">Culto</option>
            <option value="REUNIAO">Reunião</option>
            <option value="ESPECIAL">Especial</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} />
        <span className="text-sm font-medium">Evento recorrente</span>
      </label>

      {recorrente && (
        <div className="bg-slate-50 border rounded-lg p-4 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Repetir nos dias</p>
            <div className="flex gap-2">
              {DIAS_SEMANA.map((d) => (
                <button
                  type="button"
                  key={d.valor}
                  onClick={() => alternarDia(d.valor)}
                  className={`w-10 h-10 rounded-full text-sm ${
                    diasSemana.includes(d.valor) ? 'bg-blue-600 text-white' : 'bg-white border'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Repetir a cada</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={intervaloSemanas}
                onChange={(e) => setIntervaloSemanas(Number(e.target.value))}
                className="w-20 border rounded px-2 py-1"
              />
              <span className="text-sm text-slate-600">semana(s)</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Critério de parada</p>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  checked={criterioTipo === 'OCORRENCIAS'}
                  onChange={() => setCriterioTipo('OCORRENCIAS')}
                />
                Número de ocorrências
              </label>
              <label className="flex items-center gap-1 text-sm">
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
                className="w-24 border rounded px-2 py-1"
              />
            ) : (
              <input
                type="date"
                value={criterioData}
                onChange={(e) => setCriterioData(e.target.value)}
                className="border rounded px-2 py-1"
              />
            )}
          </div>
        </div>
      )}

      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      {sucesso && <p className="text-emerald-600 text-sm">Evento (e suas ocorrências) criado com sucesso!</p>}

      <button
        type="submit"
        disabled={salvando}
        className="bg-blue-600 text-white px-6 py-2 rounded font-medium disabled:opacity-50"
      >
        {salvando ? 'Salvando...' : 'Salvar evento'}
      </button>
    </form>
  )
}
