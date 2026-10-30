import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Menu, LayoutDashboard, Users, Cake, CalendarDays, Wrench, Gift, HeartHandshake, KeyRound, LogOut, Church, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import AlterarSenhaModal from './AlterarSenhaModal'

const nav = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/membros',      label: 'Membros',      icon: Users },
  { to: '/aniversarios', label: 'Aniversários', icon: Cake },
  { to: '/eventos',      label: 'Eventos',      icon: CalendarDays },
  { to: '/manutencao',   label: 'Manutenção',   icon: Wrench },
  { to: '/campanha',     label: 'Campanha',     icon: Gift },
  { to: '/mao-amiga',    label: 'Mão Amiga',    icon: HeartHandshake },
]

const itemRodape =
  'w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300'

export default function AdminLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [senhaAberta, setSenhaAberta] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-white focus:shadow">
        Ir para o conteúdo
      </a>

      {/* Celular: o menu abre por cima do conteúdo */}
      {menuAberto && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMenuAberto(false)} aria-hidden />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-transform
          md:static md:translate-x-0 ${menuAberto ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Menu principal"
      >
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-100">
          <span className="w-8 h-8 rounded-lg bg-primary-500 text-white flex items-center justify-center"><Church size={18} aria-hidden /></span>
          <span className="text-sm font-semibold text-gray-800 leading-tight">Gestão Igreja</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300
                ${isActive ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`
              }
            >
              <Icon size={17} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-0.5">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600" aria-hidden>
              {usuario?.nome.charAt(0)}
            </div>
            <p className="flex-1 min-w-0 text-xs font-medium text-gray-800 truncate">{usuario?.nome}</p>
          </div>
          <a href="/" target="_blank" rel="noreferrer" className={`${itemRodape} hover:bg-gray-100`}>
            <ExternalLink size={14} aria-hidden /> Ver página pública
          </a>
          <button onClick={() => setSenhaAberta(true)} className={`${itemRodape} hover:bg-gray-100`}>
            <KeyRound size={14} aria-hidden /> Alterar senha
          </button>
          <button onClick={handleLogout} className={`${itemRodape} hover:text-red-600 hover:bg-red-50`}>
            <LogOut size={14} aria-hidden /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-12 flex items-center gap-2 px-3 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="p-2 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-gray-800">Gestão Igreja</span>
        </header>
        <main id="conteudo" className="flex-1 overflow-y-auto" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <AlterarSenhaModal open={senhaAberta} onClose={() => setSenhaAberta(false)} />
    </div>
  )
}
