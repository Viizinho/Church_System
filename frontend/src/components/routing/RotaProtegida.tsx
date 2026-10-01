import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { token, carregando } = useAuth()

  if (carregando) return null
  if (!token) return <Navigate to="/login" replace />

  return <>{children}</>
}
