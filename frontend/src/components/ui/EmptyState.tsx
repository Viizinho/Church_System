interface EmptyStateProps { message: string; icon?: string }
export default function EmptyState({ message, icon = '📭' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  )
}
