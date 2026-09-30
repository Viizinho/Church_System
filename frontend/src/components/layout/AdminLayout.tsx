import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const nav = [
  { to: '/dashboard',    label: 'Dashboard',    icon: '⊞' },
  { to: '/membros',      label: 'Membros',       icon: '👥' },
  { to: '/aniversarios', label: 'Aniversários',  icon: '🎂' },
  { to: '/eventos',      label: 'Eventos',       icon: '📅' },
  { to: '/manutencao',   label: 'Manutenção',    icon: '🔧' },
  { to: '/campanha',     label: 'Campanha',       icon: '🎁' },
  { to: '/mao-amiga',    label: 'Mão Amiga',     icon: '🧺' },
]

export default function AdminLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-100">
          <span className="text-xl">⛪</span>
          <span className="text-sm font-semibold text-gray-800 leading-tight">Gestão Igreja</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                ${isActive ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600">
              {usuario?.nome.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{usuario?.nome}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left px-2 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
