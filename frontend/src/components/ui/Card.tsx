interface CardProps { children: React.ReactNode; className?: string }
export default function Card({ children, className = '' }: CardProps) {
  return <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>{children}</div>
}

export function CardHeader({ children, className = '' }: CardProps) {
  return <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 ${className}`}>{children}</div>
}

export function CardBody({ children, className = '' }: CardProps) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>
}
