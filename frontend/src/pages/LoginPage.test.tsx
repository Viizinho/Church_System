import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import LoginPage from './LoginPage'
import { AuthProvider } from '@/hooks/useAuth'
import { renderizar } from '@/test/renderizar'

const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock('@/services/api', () => ({ default: api }))

function montar() {
  return renderizar(
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Painel</p>} />
      </Routes>
    </AuthProvider>,
    '/login'
  )
}

describe('LoginPage', () => {
  beforeEach(() => { api.post.mockReset() })

  it('com e-mail e senha certos, guarda a sessão e vai para o painel', async () => {
    api.post.mockResolvedValue({ data: { token: 'tok', usuario: { id: 'u1', nome: 'Admin', email: 'admin@igreja.com' } } })
    montar()
    await userEvent.type(screen.getByLabelText('E-mail'), 'admin@igreja.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'SenhaForte123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Painel')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'admin@igreja.com', senha: 'SenhaForte123' })
    expect(localStorage.getItem('token')).toBe('tok')
  })

  it('com senha errada, mostra a mensagem e continua na tela', async () => {
    api.post.mockRejectedValue(new Error('401'))
    montar()
    await userEvent.type(screen.getByLabelText('E-mail'), 'admin@igreja.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'errada')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('tem os links de "esqueci minha senha" e de volta à página pública', () => {
    montar()
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/esqueci-senha')
    expect(screen.getByRole('link', { name: /Voltar à página pública/ })).toHaveAttribute('href', '/')
  })
})
