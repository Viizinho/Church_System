import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
}

const variants = {
  primary:   'bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60',
  secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60',
  danger:    'bg-red-600 text-white hover:bg-red-700 disabled:opacity-60',
  ghost:     'text-gray-600 hover:bg-gray-100 disabled:opacity-50',
}
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' }

export default function Button({ variant = 'primary', size = 'md', loading, children, className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-1
        ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
      {children}
    </button>
  )
}
