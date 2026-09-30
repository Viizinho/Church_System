import { InputHTMLAttributes } from 'react'
import { mascararTelefone } from '../utils/mascaraTelefone'

interface InputTelefoneProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onChange: (valorMascarado: string) => void
}

export function InputTelefone({ value, onChange, ...props }: InputTelefoneProps) {
  return (
    <input
      {...props}
      type="tel"
      inputMode="numeric"
      placeholder="(83) 99999-0001"
      value={value}
      onChange={(e) => onChange(mascararTelefone(e.target.value))}
    />
  )
}
