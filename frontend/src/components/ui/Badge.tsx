interface BadgeProps {
  variant?: 'green' | 'amber' | 'red' | 'purple' | 'gray' | 'blue'
  children: React.ReactNode
}

const variants = {
  green:  'bg-green-100 text-green-800',
  amber:  'bg-amber-100 text-amber-800',
  red:    'bg-red-100 text-red-800',
  purple: 'bg-primary-50 text-primary-600',
  gray:   'bg-gray-100 text-gray-600',
  blue:   'bg-blue-100 text-blue-800',
}

export default function Badge({ variant = 'gray', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
