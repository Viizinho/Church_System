import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 20_000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Só trata como "sessão expirada" quando havia um token. No login, 401 = senha errada
    // e a mensagem precisa aparecer na própria tela (sem recarregar a página).
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

/** Mensagem amigável a partir de um erro de requisição. */
export function mensagemDeErro(e: unknown, padrao = 'Algo deu errado. Tente novamente.'): string {
  const r = (e as { response?: { data?: { error?: string; detalhes?: string[] } } })?.response?.data
  if (r?.detalhes?.length) return r.detalhes.join(' ')
  return r?.error ?? padrao
}

export default api
