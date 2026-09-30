import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ITENS_MENU = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/membros', label: 'Membros' },
  { to: '/admin/eventos', label: 'Eventos' },
  { to: '/admin/ativos', label: 'Manutenção' },
  { to: '/admin/campanha', label: 'Campanha' },
  { to: '/admin/mao-amiga', label: 'Mão Amiga' },
]

export function DashboardLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col p-4">
        <p className="font-bold mb-6">Painel Administrativo</p>
        <nav className="flex flex-col gap-2 flex-1">
          {ITENS_MENU.map((item) => (
            <Link key={item.to} to={item.to} className="px-3 py-2 rounded hover:bg-slate-800">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-slate-700 text-sm">
          <p className="mb-2">{usuario?.nome}</p>
          <button onClick={handleLogout} className="text-red-400">
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 bg-slate-50">
        {/* As páginas existentes (MembrosLista, EventosLista, etc.) são
            renderizadas aqui via rotas aninhadas — ver App.tsx */}
        <Outlet />
      </main>
    </div>
  )
}
