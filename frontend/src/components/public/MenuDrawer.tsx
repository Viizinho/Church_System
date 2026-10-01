import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { href: '#eventos', label: 'Eventos' },
  { href: '#campanha', label: 'Campanha' },
  { href: '#mao-amiga', label: 'Projeto Mão Amiga' },
]

export default function MenuDrawer() {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button onClick={() => setAberto(true)} aria-label="Abrir menu" className="md:hidden p-2 text-gray-700">
        <Menu size={26} />
      </button>

      <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} className="hover:text-primary-600">
            {link.label}
          </a>
        ))}
        <Link to="/login" className="text-primary-600 font-semibold">
          Área Restrita
        </Link>
      </nav>

      {aberto && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-72 bg-white h-full p-6 flex flex-col gap-5 shadow-xl">
            <button onClick={() => setAberto(false)} aria-label="Fechar menu" className="self-end p-1">
              <X size={22} />
            </button>
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setAberto(false)} className="text-gray-700 text-lg font-medium">
                {link.label}
              </a>
            ))}
            <hr />
            <Link to="/login" onClick={() => setAberto(false)} className="text-primary-600 text-lg font-semibold">
              Área Restrita
            </Link>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setAberto(false)} />
        </div>
      )}
    </>
  )
}
