import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { RotaProtegida } from './components/RotaProtegida'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DashboardLayout } from './layouts/DashboardLayout'

import { LandingPage } from './pages/publico/LandingPage'
import { Login } from './pages/publico/Login'
import { Dashboard } from './pages/admin/Dashboard'
import { MembrosLista } from './pages/admin/membros/MembrosLista'
import { MembroForm } from './pages/admin/membros/MembroForm'
import { MaoAmigaForm } from './pages/admin/maoAmiga/MaoAmigaForm'
import { EventosLista } from './pages/admin/eventos/EventosLista'
import { EventoRecorrenciaForm } from './pages/admin/eventos/EventoRecorrenciaForm'
import { AtivosLista } from './pages/admin/ativos/AtivosLista'
import { CampanhaAdmin } from './pages/admin/campanha/CampanhaAdmin'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary fallbackTitulo="Ocorreu um erro inesperado na página.">
          <Routes>
          {/* Público */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Admin — protegido por autenticação */}
          <Route
            path="/admin"
            element={
              <RotaProtegida>
                <DashboardLayout />
              </RotaProtegida>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="membros" element={<MembrosLista />} />
            <Route path="membros/novo" element={<MembroForm />} />
            <Route path="membros/:id" element={<MembroForm />} />
            <Route path="eventos" element={<EventosLista />} />
            <Route path="eventos/novo" element={<EventoRecorrenciaForm />} />
            <Route path="ativos" element={<AtivosLista />} />
            <Route path="campanha" element={<CampanhaAdmin />} />
            <Route path="mao-amiga" element={<MaoAmigaForm />} />
            {/* demais rotas admin existentes (detalhe de ativo, etc.) continuam aqui */}
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
