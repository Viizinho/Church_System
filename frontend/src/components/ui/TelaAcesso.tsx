import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Moldura das telas de acesso (login, esqueci a senha, redefinir senha). */
export default function TelaAcesso({ titulo, subtitulo, voltarPara = '/login', voltarTexto = 'Voltar ao login', children }: {
  titulo: string
  subtitulo?: string
  voltarPara?: string
  voltarTexto?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mb-4">
        <Link to={voltarPara} className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors">
          <ArrowLeft size={16} /> {voltarTexto}
        </Link>
      </div>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3" aria-hidden="true">⛪</div>
          <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
          {subtitulo && <p className="text-sm text-gray-500 mt-1">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
