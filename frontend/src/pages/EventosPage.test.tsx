import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventosPage from './EventosPage'
import { renderizar } from '@/test/renderizar'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('@/services/api', () => ({ default: api }))

const ev = (id: string, nome: string, inicio: string, tipo = 'CULTO') => ({ id, nome, inicio, tipo, recorrencia: 'NENHUMA', local: 'Templo' })
const ultimaChamada = () => api.get.mock.calls[api.get.mock.calls.length - 1][1].params

describe('EventosPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 12, 10)) // quinta, 12/11/2026
    api.get.mockReset().mockResolvedValue({
      data: [ev('1', 'Culto de Celebração', '2026-11-08T21:00:00.000Z'), ev('2', 'Vigília', '2026-11-14T01:00:00.000Z', 'ESPECIAL'), ev('3', 'Reunião', '2026-11-11T22:00:00.000Z', 'REUNIAO')],
    })
  })
  afterEach(() => vi.useRealTimers())

  it('abre na aba "Esta semana" (domingo a sábado) buscando só esse intervalo', async () => {
    renderizar(<EventosPage />)
    expect(await screen.findByRole('tab', { name: /Esta semana/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Esta semana/ })).toHaveTextContent('08/11 a 14/11')
    const { de, ate } = ultimaChamada()
    expect(new Date(de)).toEqual(new Date(2026, 10, 8))
    expect(new Date(ate)).toEqual(new Date(2026, 10, 15))
  })

  it('aba "Passados" busca antes desta semana, do mais recente para o mais antigo', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderizar(<EventosPage />)
    await usuario.click(await screen.findByRole('tab', { name: 'Passados' }))
    await waitFor(() => expect(ultimaChamada()).toMatchObject({ ordem: 'desc' }))
    expect(new Date(ultimaChamada().ate)).toEqual(new Date(2026, 10, 8))
    expect(screen.getByLabelText('Ordenar')).toHaveValue('data-desc')
  })

  it('aba "Futuros" busca a partir da próxima semana', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderizar(<EventosPage />)
    await usuario.click(await screen.findByRole('tab', { name: 'Futuros' }))
    await waitFor(() => expect(ultimaChamada()).toMatchObject({ ordem: 'asc' }))
    expect(new Date(ultimaChamada().de)).toEqual(new Date(2026, 10, 15))
  })

  it('ordenar por nome e filtrar por tipo', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderizar(<EventosPage />)
    await screen.findByText('Vigília')
    await usuario.selectOptions(screen.getByLabelText('Ordenar'), 'Nome (A–Z)')
    const nomes = () => screen.getAllByText(/^(Culto de Celebração|Vigília|Reunião)$/, { selector: 'p' }).map((e) => e.textContent)
    expect(nomes()).toEqual(['Culto de Celebração', 'Reunião', 'Vigília'])

    await usuario.click(screen.getByRole('button', { name: 'Especial' }))
    expect(nomes()).toEqual(['Vigília'])
  })

  it('a visão de calendário busca o mês inteiro', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderizar(<EventosPage />)
    await usuario.click(await screen.findByRole('button', { name: 'Calendário' }))
    await waitFor(() => expect(ultimaChamada()).toEqual({ mes: 11, ano: 2026 }))
    expect(screen.getByRole('heading', { name: 'Novembro de 2026' })).toBeInTheDocument()
  })
})
