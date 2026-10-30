import { SelectHTMLAttributes, forwardRef, useId } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, children, className = '', id, ...props }, ref) => {
  const gerado = useId()
  const selectId = id ?? gerado
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={selectId} className="text-xs font-medium text-gray-600">{label}</label>}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        {...props}
        className={`h-9 rounded-lg border px-3 text-sm outline-none transition-colors bg-white focus-visible:ring-2 focus-visible:ring-primary-200
          ${error ? 'border-red-400' : 'border-gray-300 focus:border-primary-500'}
          ${className}`}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})
Select.displayName = 'Select'
export default Select
