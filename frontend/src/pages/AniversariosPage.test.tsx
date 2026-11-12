import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AniversariosPage from './AniversariosPage'
import { renderizar } from '@/test/renderizar'

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/services/api', () => ({ default: api }))

const membro = (id: string, nome: string, nasc: string, diffDias: number) => ({
  id, nomeCompleto: nome, dataNascimento: `${nasc}T00:00:00.000Z`, diffDias, proximoAniversario: '', status: 'ATIVO', cargos: [],
})

describe('AniversariosPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 12, 10)) // 12/11/2026
    api.get.mockResolvedValue({
      data: [
        membro('a', 'Ana Souza', '1990-11-12', 0),
        membro('b', 'Bruno Lima', '1985-11-20', 8),
        membro('c', 'Carla Dias', '2001-03-05', 113),
        membro('d', 'Davi Rocha', '1978-03-01', 109),
      ],
    })
  })
  afterEach(() => vi.useRealTimers())

  it('busca todos os aniversariantes ativos e separa por período', async () => {
    renderizar(<AniversariosPage />)
    expect(await screen.findByText('🎂 Esta semana (1)')).toBeInTheDocument()
    expect(screen.getByText('📅 Próximas semanas (1)')).toBeInTheDocument()
    expect(screen.getByText('Mais adiante (2)')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/membros/aniversariantes', { params: { periodo: 'todos' } })
    expect(screen.queryByLabelText('Ordenar')).not.toBeInTheDocument()
  })

  it('visão "Ano": os 12 meses, cada um com os aniversariantes em ordem de dia', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderizar(<AniversariosPage />)
    await usuario.click(await screen.findByRole('button', { name: 'Ano' }))

    expect(screen.getAllByRole('region')).toHaveLength(12)
    const marco = screen.getByRole('region', { name: 'Março' })
    expect(within(marco).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['01Davi Rocha48 anos', '05Carla Dias25 anos'])
    expect(within(screen.getByRole('region', { name: 'Janeiro' })).getByText('Nenhum aniversariante')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Próximo ano' }))
    expect(within(screen.getByRole('region', { name: 'Março' })).getByText('49 anos')).toBeInTheDocument()
  })

  it('a busca filtra também a visão do ano', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderizar(<AniversariosPage />)
    await usuario.click(await screen.findByRole('button', { name: 'Ano' }))
    await usuario.type(screen.getByLabelText('Buscar aniversariante'), 'carla')
    expect(within(screen.getByRole('region', { name: 'Março' })).getAllByRole('listitem')).toHaveLength(1)
    expect(within(screen.getByRole('region', { name: 'Novembro' })).getByText('Nenhum aniversariante')).toBeInTheDocument()
  })
})
