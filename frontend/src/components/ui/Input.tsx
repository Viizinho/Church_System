import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-medium text-gray-600">{label}</label>}
    <input
      ref={ref}
      {...props}
      className={`h-9 rounded-lg border px-3 text-sm outline-none transition-colors
        ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'}
        ${className}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
))
Input.displayName = 'Input'
export default Input
