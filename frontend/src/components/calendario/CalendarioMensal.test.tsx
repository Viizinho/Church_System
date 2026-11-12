import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import CalendarioMensal, { type ItemCalendario } from './CalendarioMensal'

const itens: ItemCalendario[] = [
  { id: '1', dia: '2026-11-15', hora: '18:00', titulo: 'Culto de Celebração', cor: 'purple' },
  { id: '2', dia: '2026-11-15', titulo: 'Ana', detalhe: 'Aniversário · 36 anos', cor: 'pink' },
  { id: '3', dia: '2026-11-12', hora: '19:30', titulo: 'Culto de Doutrina', cor: 'purple' },
]

describe('CalendarioMensal', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 12, 10)) }) // 12/11/2026
  afterEach(() => vi.useRealTimers())

  it('mostra o mês, a semana de domingo a sábado e os dias com seus itens', () => {
    render(<CalendarioMensal mes={dayjs('2026-11-01')} onMudarMes={() => {}} itens={itens} />)
    expect(screen.getByRole('heading', { name: 'Novembro de 2026' })).toBeInTheDocument()
    const cabecalho = screen.getAllByText(/^(Dom|Seg|Ter|Qua|Qui|Sex|Sáb)$/).map((e) => e.textContent)
    expect(cabecalho).toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'])
    expect(screen.getByRole('gridcell', { name: '15 de novembro, 2 itens' })).toBeInTheDocument()
  })

  it('abre no dia de hoje e lista o que tem nele', () => {
    render(<CalendarioMensal mes={dayjs('2026-11-01')} onMudarMes={() => {}} itens={itens} />)
    expect(screen.getByText(/Quinta-feira, 12 de novembro/)).toBeInTheDocument()
    expect(screen.getAllByText('Culto de Doutrina').length).toBeGreaterThan(0)
  })

  it('ao clicar num dia, mostra os itens daquele dia em ordem de horário', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = render(<CalendarioMensal mes={dayjs('2026-11-01')} onMudarMes={() => {}} itens={itens} />)
    await usuario.click(screen.getByRole('gridcell', { name: '15 de novembro, 2 itens' }))
    expect(screen.getByText(/Domingo, 15 de novembro/)).toBeInTheDocument()
    const painel = container.querySelector('ul')!
    expect(within(painel).getAllByText(/Culto de Celebração|Ana/).map((e) => e.textContent?.trim())).toEqual(['Ana', 'Culto de Celebração'])
    expect(within(painel).getByText('Aniversário · 36 anos')).toBeInTheDocument()
  })

  it('setas trocam o mês', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const mudar = vi.fn()
    render(<CalendarioMensal mes={dayjs('2026-11-01')} onMudarMes={mudar} itens={[]} />)
    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(mudar.mock.calls[0][0].format('YYYY-MM')).toBe('2026-12')
    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(mudar.mock.calls[1][0].format('YYYY-MM')).toBe('2026-10')
  })

  it('itens clicáveis chamam a ação (ex.: editar o evento)', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const editar = vi.fn()
    render(<CalendarioMensal mes={dayjs('2026-11-01')} onMudarMes={() => {}} itens={[{ ...itens[2], onClick: editar }]} />)
    await usuario.click(screen.getByRole('button', { name: /Culto de Doutrina/ }))
    expect(editar).toHaveBeenCalledOnce()
  })

  it('dia sem nada mostra a mensagem configurada', () => {
    render(<CalendarioMensal mes={dayjs('2026-11-01')} onMudarMes={() => {}} itens={[]} vazioDia="Nenhum evento neste dia." />)
    expect(screen.getByText('Nenhum evento neste dia.')).toBeInTheDocument()
  })
})
