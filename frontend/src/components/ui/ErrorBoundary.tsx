import { Component, ReactNode } from 'react'

interface State { erro: boolean }

/** Evita a "tela branca": se uma página quebrar, o usuário vê uma mensagem e pode recarregar. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { erro: false }

  static getDerivedStateFromError(): State {
    return { erro: true }
  }

  componentDidCatch(erro: Error) {
    console.error('[ErrorBoundary]', erro)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="text-4xl" aria-hidden>😕</span>
        <h1 className="text-lg font-semibold text-gray-900">Algo deu errado por aqui</h1>
        <p className="text-sm text-gray-500 max-w-sm">Recarregue a página. Se o problema continuar, avise quem cuida do sistema.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600">
          Recarregar
        </button>
      </div>
    )
  }
}
