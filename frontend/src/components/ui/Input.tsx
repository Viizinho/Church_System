import { InputHTMLAttributes, forwardRef, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', id, ...props }, ref) => {
  const gerado = useId()
  const inputId = id ?? gerado
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-gray-600">{label}</label>}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-erro` : undefined}
        {...props}
        className={`h-9 rounded-lg border px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-200
          ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'}
          ${className}`}
      />
      {error && <p id={`${inputId}-erro`} className="text-xs text-red-500">{error}</p>}
    </div>
  )
})
Input.displayName = 'Input'
export default Input
