import { ReactNode } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  /** Botões de ação (ficam à direita; em telas pequenas descem para baixo do título). */
  actions?: ReactNode
  /** Título da aba, se for diferente do título da página. */
  tabTitle?: string
}

export default function PageHeader({ title, subtitle, actions, tabTitle }: PageHeaderProps) {
  usePageTitle(tabTitle ?? title)
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
