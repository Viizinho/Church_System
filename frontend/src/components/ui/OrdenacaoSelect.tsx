import { useId } from 'react'
import { ArrowUpDown } from 'lucide-react'
import type { OpcaoOrdenacao } from '@/utils/ordenacao'

interface Props<C extends string> {
  value: C
  onChange: (valor: C) => void
  opcoes: OpcaoOrdenacao<C>[]
  /** Texto antes do seletor (padrão: "Ordenar") */
  rotulo?: string
  className?: string
}

/** Seletor compacto de ordenação, para ficar ao lado da busca e dos filtros. */
export default function OrdenacaoSelect<C extends string>({ value, onChange, opcoes, rotulo = 'Ordenar', className = '' }: Props<C>) {
  const id = useId()
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <label htmlFor={id} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 whitespace-nowrap">
        <ArrowUpDown size={13} aria-hidden /> {rotulo}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as C)}
        className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-gray-700 outline-none focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-200"
      >
        {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
      </select>
    </div>
  )
}
