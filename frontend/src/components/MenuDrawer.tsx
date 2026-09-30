import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { href: '#eventos', label: 'Eventos' },
  { href: '#campanha', label: 'Campanha' },
  { href: '#mao-amiga', label: 'Projeto Mão Amiga' },
  { href: '#contato', label: 'Contato' },
]

export function MenuDrawer() {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        className="md:hidden p-2 text-slate-700"
      >
        <Menu size={28} />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-72 bg-white h-full p-6 flex flex-col gap-5 shadow-xl animate-in slide-in-from-left">
            <button onClick={() => setAberto(false)} aria-label="Fechar menu" className="self-end p-1">
              <X size={24} />
            </button>

            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setAberto(false)}
                className="text-slate-700 text-lg font-medium"
              >
                {link.label}
              </a>
            ))}

            <hr className="my-2" />

            <Link
              to="/login"
              onClick={() => setAberto(false)}
              className="text-blue-700 text-lg font-semibold"
            >
              Área Restrita
            </Link>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setAberto(false)} />
        </div>
      )}
    </>
  )
}
