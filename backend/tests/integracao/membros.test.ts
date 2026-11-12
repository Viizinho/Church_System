import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { criarAdmin, limparBanco, prisma } from '../helpers/bancoReal'
import { entrar } from '../helpers/api'

let app: Express
let auth: Record<string, string>
beforeAll(async () => { app = (await import('../../src/app')).default })
beforeEach(async () => {
  await limparBanco()
  await criarAdmin()
  auth = await entrar(app)
})
afterAll(() => prisma.$disconnect())

const criarCargo = async (nome: string) => (await request(app).post('/api/cargos').set(auth).send({ nome })).body.id as string
const criarMembro = (dados: Record<string, unknown>) => request(app).post('/api/membros').set(auth).send(dados)

describe('membros no PostgreSQL', () => {
  it('cadastra com cargos e grava as ligações na tabela membro_cargos', async () => {
    const diacono = await criarCargo('Diácono')
    const r = await criarMembro({ nomeCompleto: 'José da Silva', dataNascimento: '1980-05-10', cargoIds: [diacono] })
    expect(r.status).toBe(201)
    expect(r.body.cargos[0].cargo.nome).toBe('Diácono')
    expect(await prisma.membroCargo.count()).toBe(1)
  })

  it('data de nascimento é só data (sem fuso): 10/05 continua 10/05', async () => {
    const r = await criarMembro({ nomeCompleto: 'Maria', dataNascimento: '1990-05-10' })
    expect(String(r.body.dataNascimento)).toMatch(/^1990-05-10/)
  })

  it('busca sem diferenciar maiúsculas e filtra por cargo', async () => {
    const auxiliar = await criarCargo('Auxiliar')
    await criarMembro({ nomeCompleto: 'Ana Souza', cargoIds: [auxiliar] })
    await criarMembro({ nomeCompleto: 'Bruno Lima' })

    const busca = await request(app).get('/api/membros?busca=ana').set(auth)
    expect(busca.body.map((m: any) => m.nomeCompleto)).toEqual(['Ana Souza'])

    const porCargo = await request(app).get(`/api/membros?cargoIds=${auxiliar}`).set(auth)
    expect(porCargo.body.map((m: any) => m.nomeCompleto)).toEqual(['Ana Souza'])
  })

  it('lista em ordem alfabética e filtra por status', async () => {
    await criarMembro({ nomeCompleto: 'Carlos' })
    await criarMembro({ nomeCompleto: 'Abel', status: 'INATIVO' })
    expect((await request(app).get('/api/membros').set(auth)).body.map((m: any) => m.nomeCompleto)).toEqual(['Abel', 'Carlos'])
    expect((await request(app).get('/api/membros?status=ATIVO').set(auth)).body.map((m: any) => m.nomeCompleto)).toEqual(['Carlos'])
  })

  it('aniversariantes: só membros ATIVOS com data de nascimento', async () => {
    const hoje = new Date()
    const nasc = `1990-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    await criarMembro({ nomeCompleto: 'Aniversariante', dataNascimento: nasc })
    await criarMembro({ nomeCompleto: 'Inativo', dataNascimento: nasc, status: 'INATIVO' })
    await criarMembro({ nomeCompleto: 'Sem data' })

    const semana = await request(app).get('/api/membros/aniversariantes?periodo=semana').set(auth)
    expect(semana.body.map((m: any) => [m.nomeCompleto, m.diffDias])).toEqual([['Aniversariante', 0]])
    const todos = await request(app).get('/api/membros/aniversariantes?periodo=todos').set(auth)
    expect(todos.body).toHaveLength(1)
  })

  it('atualizar troca os cargos e excluir apaga as ligações (cascata)', async () => {
    const [a, b] = [await criarCargo('Pastor'), await criarCargo('Secretária')]
    const { body: membro } = await criarMembro({ nomeCompleto: 'Rute', cargoIds: [a] })

    const r = await request(app).put(`/api/membros/${membro.id}`).set(auth).send({ nomeCompleto: 'Rute', cargoIds: [b] })
    expect(r.status).toBe(200)
    expect((await prisma.membroCargo.findMany()).map((x) => x.cargoId)).toEqual([b])

    expect((await request(app).delete(`/api/membros/${membro.id}`).set(auth)).status).toBe(204)
    expect(await prisma.membroCargo.count()).toBe(0)
    expect((await request(app).get(`/api/membros/${membro.id}`).set(auth)).status).toBe(404)
  })

  it('e-mail inválido → 400 e nada é gravado', async () => {
    expect((await criarMembro({ nomeCompleto: 'X Y', email: 'nao-e-email' })).status).toBe(400)
    expect(await prisma.membro.count()).toBe(0)
  })
})
