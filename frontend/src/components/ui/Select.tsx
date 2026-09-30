import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, children, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-gray-600">{label}</label>}
    <select
      ref={ref}
      {...props}
      className={`h-9 rounded-lg border px-3 text-sm outline-none transition-colors bg-white
        ${error ? 'border-red-400' : 'border-gray-300 focus:border-primary-500'}
        ${className}`}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
))
Select.displayName = 'Select'
export default Select
