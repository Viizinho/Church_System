import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Usuario {
  id: string
  nome: string
  email: string
}

interface AuthContextValue {
  token: string | null
  usuario: Usuario | null
  carregando: boolean
  login: (token: string, usuario: Usuario) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const tokenSalvo = localStorage.getItem('igreja:token')
    const usuarioSalvo = localStorage.getItem('igreja:usuario')
    if (tokenSalvo && usuarioSalvo) {
      setToken(tokenSalvo)
      setUsuario(JSON.parse(usuarioSalvo))
    }
    setCarregando(false)
  }, [])

  function login(novoToken: string, novoUsuario: Usuario) {
    localStorage.setItem('igreja:token', novoToken)
    localStorage.setItem('igreja:usuario', JSON.stringify(novoUsuario))
    setToken(novoToken)
    setUsuario(novoUsuario)
  }

  function logout() {
    localStorage.removeItem('igreja:token')
    localStorage.removeItem('igreja:usuario')
    setToken(null)
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ token, usuario, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider.')
  return ctx
}
