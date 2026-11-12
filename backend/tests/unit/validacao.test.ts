import { describe, expect, it } from 'vitest'
import { enumQuery, telefone, textoCurto, textoLongo, urlHttp } from '../../src/utils/validacao'

describe('urlHttp — links de comprovante e redes sociais', () => {
  it.each(['https://exemplo.com/comprovante.png', 'http://igreja.org'])('aceita %s', (u) => {
    expect(urlHttp.safeParse(u).success).toBe(true)
  })
  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'ftp://x.com/a', 'não é url'])('recusa %s (evita XSS)', (u) => {
    expect(urlHttp.safeParse(u).success).toBe(false)
  })
  it('recusa URL gigante', () => expect(urlHttp.safeParse('https://a.com/' + 'x'.repeat(2100)).success).toBe(false))
})

describe('textoCurto / textoLongo', () => {
  it('remove espaços e respeita o tamanho mínimo', () => {
    expect(textoCurto(2, 10).parse('  Ana  ')).toBe('Ana')
    expect(textoCurto(2, 10).safeParse(' a ').success).toBe(false)
  })
  it('texto longo vazio vira null', () => {
    expect(textoLongo().parse('')).toBeNull()
    expect(textoLongo().parse(undefined)).toBeNull()
    expect(textoLongo(5).safeParse('123456').success).toBe(false)
  })
})

describe('telefone', () => {
  it('aceita formatos comuns', () => expect(telefone.safeParse('+55 (83) 99999-0000').success).toBe(true))
  it('recusa letras', () => expect(telefone.safeParse('83 9999-abcd').success).toBe(false))
})

describe('enumQuery', () => {
  it('devolve o valor quando é válido e ignora o resto', () => {
    expect(enumQuery('ATIVO', ['ATIVO', 'INATIVO'] as const)).toBe('ATIVO')
    expect(enumQuery('QUALQUER', ['ATIVO', 'INATIVO'] as const)).toBeUndefined()
    expect(enumQuery(['ATIVO'], ['ATIVO'] as const)).toBeUndefined()
  })
})
