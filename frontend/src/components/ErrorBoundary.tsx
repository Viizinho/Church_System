import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitulo?: string
}

interface State {
  temErro: boolean
  mensagem: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { temErro: false, mensagem: '' }

  static getDerivedStateFromError(erro: Error): State {
    return { temErro: true, mensagem: erro.message }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Loga no console pra facilitar diagnóstico — nunca deixa a tela em branco silenciosamente.
    console.error('[ErrorBoundary]', erro, info.componentStack)
  }

  render() {
    if (this.state.temErro) {
      return (
        <div className="p-6 border border-red-200 bg-red-50 rounded-lg text-sm text-red-700">
          <p className="font-semibold">{this.props.fallbackTitulo ?? 'Algo deu errado ao carregar esta seção.'}</p>
          <p className="mt-1 text-red-600">{this.state.mensagem}</p>
        </div>
      )
    }
    return this.props.children
  }
}
