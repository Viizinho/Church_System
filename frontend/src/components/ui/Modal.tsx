import { ReactNode, useEffect, useId, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  const tituloId = useId()
  const caixa = useRef<HTMLDivElement>(null)
  const aoFechar = useRef(onClose)
  aoFechar.current = onClose

  useEffect(() => {
    if (!open) return
    const anterior = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // a página atrás não rola

    // Foco entra no diálogo (no primeiro campo, se houver) e fica preso nele enquanto aberto
    const alvo = caixa.current?.querySelector<HTMLElement>('input, select, textarea') ?? caixa.current?.querySelector<HTMLElement>(FOCAVEIS)
    alvo?.focus()

    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { aoFechar.current(); return }
      if (e.key !== 'Tab' || !caixa.current) return
      const itens = [...caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS)]
      if (itens.length === 0) return
      const primeiro = itens[0], ultimo = itens[itens.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', teclas)
    return () => {
      document.removeEventListener('keydown', teclas)
      document.body.style.overflow = overflow
      anterior?.focus() // devolve o foco a quem abriu
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={`relative bg-white rounded-2xl shadow-xl w-full ${width} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id={tituloId} className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
