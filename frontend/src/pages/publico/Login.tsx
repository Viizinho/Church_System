import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    try {
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })

      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error ?? 'Não foi possível entrar.')
      }

      const data = await resp.json()
      login(data.token, data.usuario)
      navigate('/admin')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-xl shadow space-y-4">
        <h1 className="text-xl font-bold text-slate-800">Área Restrita</h1>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-blue-600 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
