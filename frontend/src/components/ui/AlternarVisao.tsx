import { useState } from 'react'
import { CalendarDays, List } from 'lucide-react'

export type Visao = 'lista' | 'calendario'

interface Props {
  value: Visao
  onChange: (v: Visao) => void
  className?: string
}

/** Botões "Lista | Calendário". */
export default function AlternarVisao({ value, onChange, className = '' }: Props) {
  const opcoes = [
    { valor: 'lista' as const, texto: 'Lista', Icone: List },
    { valor: 'calendario' as const, texto: 'Calendário', Icone: CalendarDays },
  ]
  return (
    <div role="group" aria-label="Forma de visualização" className={`inline-flex rounded-lg border border-gray-300 p-0.5 bg-gray-50 ${className}`}>
      {opcoes.map(({ valor, texto, Icone }) => (
        <button
          key={valor}
          type="button"
          aria-pressed={value === valor}
          onClick={() => onChange(valor)}
          className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
            value === valor ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icone size={15} aria-hidden /> {texto}
        </button>
      ))}
    </div>
  )
}

/** Lembra a visão escolhida neste navegador (ex.: quem prefere sempre o calendário). */
export function useVisao(chave: string, padrao: Visao = 'lista'): [Visao, (v: Visao) => void] {
  const [visao, setVisao] = useState<Visao>(() => {
    try {
      const salvo = localStorage.getItem(`visao:${chave}`)
      return salvo === 'lista' || salvo === 'calendario' ? salvo : padrao
    } catch {
      return padrao
    }
  })
  function mudar(v: Visao) {
    setVisao(v)
    try { localStorage.setItem(`visao:${chave}`, v) } catch { /* navegador sem armazenamento */ }
  }
  return [visao, mudar]
}
