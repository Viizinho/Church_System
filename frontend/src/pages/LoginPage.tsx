import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await login(email, senha)
      navigate('/dashboard')
    } catch {
      setErro('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⛪</div>
          <h1 className="text-xl font-bold text-gray-900">Gestão Igreja</h1>
          <p className="text-sm text-gray-500 mt-1">Assembleia de Deus JCU</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@igreja.com" required />
          <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" required />
          {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
          <Button type="submit" loading={loading} className="w-full justify-center mt-2">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}
