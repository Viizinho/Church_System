import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { RotaProtegida } from '@/components/routing/RotaProtegida'
import AdminLayout from '@/components/layout/AdminLayout'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import Spinner from '@/components/ui/Spinner'

// Cada página vira um arquivo JS separado, baixado só quando a rota é aberta:
// a landing page (a mais visitada, por pessoas no celular) não carrega o código do painel administrativo.
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const EsqueciSenhaPage = lazy(() => import('@/pages/EsqueciSenhaPage'))
const RedefinirSenhaPage = lazy(() => import('@/pages/RedefinirSenhaPage'))
const CampanhaPublicaPage = lazy(() => import('@/pages/CampanhaPublicaPage'))
const MaoAmigaPublicaPage = lazy(() => import('@/pages/MaoAmigaPublicaPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const MembrosPage = lazy(() => import('@/pages/MembrosPage'))
const AniversariosPage = lazy(() => import('@/pages/AniversariosPage'))
const EventosPage = lazy(() => import('@/pages/EventosPage'))
const ManutencaoPage = lazy(() => import('@/pages/ManutencaoPage'))
const CampanhaAdminPage = lazy(() => import('@/pages/CampanhaAdminPage'))
const MaoAmigaAdminPage = lazy(() => import('@/pages/MaoAmigaAdminPage'))
const RelatorioManutencoesPage = lazy(() => import('@/pages/RelatorioManutencoesPage'))

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Spinner />}>
            <Routes>
              {/* Público */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
              <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
              <Route path="/contribuir" element={<CampanhaPublicaPage />} />
              <Route path="/doar" element={<MaoAmigaPublicaPage />} />

              {/* Admin — protegido por autenticação */}
              <Route
                element={
                  <RotaProtegida>
                    <AdminLayout />
                  </RotaProtegida>
                }
              >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="membros" element={<MembrosPage />} />
                <Route path="aniversarios" element={<AniversariosPage />} />
                <Route path="eventos" element={<EventosPage />} />
                <Route path="manutencao" element={<ManutencaoPage />} />
                <Route path="manutencao/relatorio" element={<RelatorioManutencoesPage />} />
                <Route path="campanha" element={<CampanhaAdminPage />} />
                <Route path="mao-amiga" element={<MaoAmigaAdminPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
