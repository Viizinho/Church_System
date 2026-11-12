import { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/** Renderiza dentro de um roteador (para páginas que usam <Link> ou useNavigate). */
export function renderizar(ui: ReactElement, rota = '/') {
  return render(<MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>)
}
