import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface FilterOption {
  id: string
  label: string
  /** Opcional: agrupa as opções sob um subtítulo (ex.: EBD, Louvor, Mídia) */
  grupo?: string | null
}

interface Props {
  label: string
  options: FilterOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}

/**
 * Botão que abre uma lista com caixas de seleção (check), para filtrar por
 * várias opções ao mesmo tempo.
 */
export default function MultiSelectFilter({ label, options, selected, onChange }: Props) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  function alternar(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  const temSelecao = selected.length > 0
  // Agrupa preservando a ordem das opções
  const grupos = options.reduce<{ nome: string | null; itens: FilterOption[] }[]>((acc, o) => {
    const nome = o.grupo ?? null
    const atual = acc[acc.length - 1]
    if (atual && atual.nome === nome) atual.itens.push(o)
    else acc.push({ nome, itens: [o] })
    return acc
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="true"
        aria-expanded={aberto}
        className={`h-9 inline-flex items-center gap-2 rounded-lg border px-3 text-sm transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300
          ${temSelecao
            ? 'border-primary-500 bg-primary-50 text-primary-600 font-medium'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}
      >
        {label}
        {temSelecao && (
          <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">
            {selected.length}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {aberto && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto py-1.5">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">Nada cadastrado ainda.</p>
            ) : (
              grupos.map((g, i) => (
                <div key={`${g.nome}-${i}`}>
                  {g.nome && <p className="px-3 pt-2 pb-1 text-xs font-medium text-gray-400">{g.nome}</p>}
                  {g.itens.map((o) => {
                    const marcado = selected.includes(o.id)
                    return (
                      <label
                        key={o.id}
                        className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternar(o.id)}
                          className="sr-only peer"
                        />
                        <span
                          aria-hidden
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                            peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300
                            ${marcado ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-300 bg-white'}`}
                        >
                          {marcado && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span className={marcado ? 'font-medium text-gray-900' : ''}>{o.label}</span>
                      </label>
                    )
                  })}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
            <span className="text-xs text-gray-400">
              {temSelecao ? `${selected.length} selecionado${selected.length > 1 ? 's' : ''}` : 'Vale qualquer uma das marcadas'}
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={!temSelecao}
              className="text-xs font-medium text-primary-600 disabled:text-gray-300 hover:underline disabled:no-underline"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
