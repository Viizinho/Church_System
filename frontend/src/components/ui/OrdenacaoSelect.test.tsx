import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrdenacaoSelect from './OrdenacaoSelect'

describe('OrdenacaoSelect', () => {
  it('é um seletor acessível pelo rótulo e devolve a opção escolhida', async () => {
    const mudar = vi.fn()
    render(<OrdenacaoSelect value="nome" onChange={mudar} opcoes={[{ valor: 'nome', label: 'Nome (A–Z)' }, { valor: 'data', label: 'Data' }]} />)
    const select = screen.getByLabelText('Ordenar')
    expect(select).toHaveValue('nome')
    await userEvent.selectOptions(select, 'Data')
    expect(mudar).toHaveBeenCalledWith('data')
  })
})
