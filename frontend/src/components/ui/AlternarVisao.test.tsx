import { describe, expect, it, vi } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AlternarVisao, { useVisao } from './AlternarVisao'

describe('AlternarVisao', () => {
  it('marca a opção ativa e avisa a troca', async () => {
    const mudar = vi.fn()
    render(<AlternarVisao value="lista" onChange={mudar} />)
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Ano' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Calendário' }))
    expect(mudar).toHaveBeenCalledWith('calendario')
  })

  it('com comAno, mostra também a opção "Ano"', () => {
    render(<AlternarVisao value="ano" onChange={() => {}} comAno />)
    expect(screen.getByRole('button', { name: 'Ano' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('useVisao', () => {
  it('lembra a escolha no navegador', () => {
    const { result } = renderHook(() => useVisao('eventos'))
    expect(result.current[0]).toBe('lista')
    act(() => result.current[1]('calendario'))
    expect(localStorage.getItem('visao:eventos')).toBe('calendario')
    expect(renderHook(() => useVisao('eventos')).result.current[0]).toBe('calendario')
  })

  it('ignora valor salvo que não é permitido naquela tela', () => {
    localStorage.setItem('visao:eventos', 'ano')
    expect(renderHook(() => useVisao('eventos')).result.current[0]).toBe('lista')
    expect(renderHook(() => useVisao('eventos', 'lista', ['lista', 'calendario', 'ano'])).result.current[0]).toBe('ano')
  })
})
