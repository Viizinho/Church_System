import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { RotaProtegida } from '@/components/routing/RotaProtegida'
import AdminLayout from '@/components/layout/AdminLayout'

import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import CampanhaPublicaPage from '@/pages/CampanhaPublicaPage'
import MaoAmigaPublicaPage from '@/pages/MaoAmigaPublicaPage'
import DashboardPage from '@/pages/DashboardPage'
import MembrosPage from '@/pages/MembrosPage'
import AniversariosPage from '@/pages/AniversariosPage'
import EventosPage from '@/pages/EventosPage'
import ManutencaoPage from '@/pages/ManutencaoPage'
import CampanhaAdminPage from '@/pages/CampanhaAdminPage'
import MaoAmigaAdminPage from '@/pages/MaoAmigaAdminPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Público */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/contribuir" element={<CampanhaPublicaPage />} />
          <Route path="/doar" element={<MaoAmigaPublicaPage />} />

          {/* Admin — protegido por autenticação (rotas sem prefixo, como o AdminLayout espera) */}
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
            <Route path="campanha" element={<CampanhaAdminPage />} />
            <Route path="mao-amiga" element={<MaoAmigaAdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
