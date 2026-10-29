import type { ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'

export interface RedesSociais {
  instagramUrl?: string | null
  facebookUrl?: string | null
  youtubeUrl?: string | null
  whatsappContato?: string | null
}

const svgProps = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const InstagramIcon = () => (
  <svg {...svgProps}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
  </svg>
)

const FacebookIcon = () => (
  <svg {...svgProps}>
    <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />
  </svg>
)

const YoutubeIcon = () => (
  <svg {...svgProps}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
  </svg>
)

interface Rede {
  chave: string
  nome: string
  descricao: string
  href: string
  icone: ReactNode
  cor: string
}

export default function RedesSociaisSection({ redes }: { redes: RedesSociais }) {
  const lista: Rede[] = []

  if (redes.instagramUrl) {
    lista.push({
      chave: 'instagram',
      nome: 'Instagram',
      descricao: 'Fotos, avisos e momentos da nossa comunidade.',
      href: redes.instagramUrl,
      icone: <InstagramIcon />,
      cor: 'bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400',
    })
  }
  if (redes.facebookUrl) {
    lista.push({
      chave: 'facebook',
      nome: 'Facebook',
      descricao: 'Acompanhe a programação e fale com a igreja.',
      href: redes.facebookUrl,
      icone: <FacebookIcon />,
      cor: 'bg-blue-600',
    })
  }
  if (redes.youtubeUrl) {
    lista.push({
      chave: 'youtube',
      nome: 'YouTube',
      descricao: 'Assista aos cultos e mensagens.',
      href: redes.youtubeUrl,
      icone: <YoutubeIcon />,
      cor: 'bg-red-600',
    })
  }
  if (redes.whatsappContato) {
    lista.push({
      chave: 'whatsapp',
      nome: 'WhatsApp',
      descricao: 'Tire dúvidas e fale diretamente com a igreja.',
      href: `https://wa.me/${redes.whatsappContato.replace(/\D/g, '')}`,
      icone: <MessageCircle size={28} aria-hidden />,
      cor: 'bg-green-600',
    })
  }

  if (lista.length === 0) return null

  return (
    <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {lista.map((rede) => (
        <a
          key={rede.chave}
          href={rede.href}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 hover:border-primary-400 hover:shadow-md transition-all"
        >
          <span className={`w-14 h-14 rounded-xl text-white flex items-center justify-center flex-shrink-0 ${rede.cor}`}>
            {rede.icone}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-gray-900 group-hover:text-primary-600">{rede.nome}</span>
            <span className="block text-sm text-gray-500">{rede.descricao}</span>
          </span>
        </a>
      ))}
    </div>
  )
}
