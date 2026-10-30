/**
 * Dados de EXEMPLO para demonstrar o sistema (reuniões, apresentações, testes).
 *
 *   npm run db:seed:demo
 *
 * ⚠️  APAGA membros, eventos, ativos/manutenções, campanha e Mão Amiga e recria
 *     tudo com dados fictícios. Usuários e o catálogo (cargos, categorias,
 *     conjuntos) são mantidos. Não roda em produção.
 *
 * Todas as datas são relativas a HOJE, então os exemplos sempre "fazem sentido"
 * na hora de mostrar: aniversário hoje e nesta semana, manutenção vencida,
 * contribuições pendentes e recusadas, eventos nos próximos dias etc.
 * Roteiro do que mostrar: veja DEMO.md na raiz do projeto.
 */
import { PrismaClient, StatusMembro, TipoEvento, RecorrenciaEvento } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Datas relativas a hoje ──────────────────────────────────────────────────

const agora = new Date()
const hoje0 = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())

/** Coluna DATE (meia-noite UTC) a N dias de hoje. */
function dia(offsetDias: number): Date {
  const d = new Date(hoje0)
  d.setDate(d.getDate() + offsetDias)
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

/** Data e hora (local) daqui a N dias. */
function quando(offsetDias: number, hora: number, min = 0): Date {
  const d = new Date(hoje0)
  d.setDate(d.getDate() + offsetDias)
  d.setHours(hora, min, 0, 0)
  return d
}

/** Próxima ocorrência de um dia da semana (0 = domingo) em determinado horário. */
function proximoDiaSemana(diaSemana: number, hora: number, min = 0): Date {
  let offset = (diaSemana - hoje0.getDay() + 7) % 7
  if (offset === 0 && quando(0, hora, min) < agora) offset = 7
  return quando(offset, hora, min)
}

/** Data de nascimento cujo aniversário cai daqui a N dias (0 = hoje). */
function nascimentoEm(emDias: number, ano: number): Date {
  const d = new Date(hoje0)
  d.setDate(d.getDate() + emDias)
  const mes = d.getMonth()
  const dd = d.getDate()
  const a = mes === 1 && dd === 29 ? 1992 : ano // evita 29/02 em ano não bissexto
  return new Date(Date.UTC(a, mes, dd))
}

function horasAtras(h: number): Date {
  return new Date(agora.getTime() - h * 60 * 60 * 1000)
}

function semanas(inicio: Date, n: number, intervalo = 1): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(inicio)
    d.setDate(d.getDate() + 7 * i * intervalo)
    return d
  })
}

// ─── Execução ────────────────────────────────────────────────────────────────

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Recusado: o seed de demonstração não roda em produção.')
    process.exit(1)
  }

  if (!process.argv.includes('--sim')) {
    console.log('⚠️  Isto vai APAGAR membros, eventos, manutenções, campanha e Mão Amiga')
    console.log('    e recriar tudo com dados de exemplo. Ctrl+C para cancelar (5 s)...')
    await new Promise((r) => setTimeout(r, 5000))
  }

  console.log('🧹 Limpando dados de demonstração anteriores...')
  await prisma.doacaoAlimento.deleteMany()
  await prisma.metaCesta.deleteMany()
  await prisma.contribuicao.deleteMany()
  await prisma.itemCampanha.deleteMany()
  await prisma.notificacaoManutencao.deleteMany()
  await prisma.manutencao.deleteMany()
  await prisma.ativo.deleteMany()
  await prisma.evento.deleteMany()
  await prisma.membro.deleteMany()

  // ── Usuário administrador (mantém a senha se já existir)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@igreja.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@igreja.com',
      senhaHash: await bcrypt.hash('admin123', 10),
      telefone: '5583999990000',
    },
  })

  // ── Catálogo: cargos, categorias, conjuntos
  const nomesCargos: [string, string][] = [
    ['Pastor', 'Líder pastoral da igreja'],
    ['Presbítero', 'Ancião da congregação'],
    ['Diácono', 'Servo da congregação'],
    ['Coord. Mocidade', 'Coordenador(a) do ministério de jovens'],
    ['Auxiliar', 'Auxiliar da congregação'],
    ['Secretária', 'Secretaria da igreja'],
  ]
  const cargo = new Map<string, string>()
  for (const [nome, descricao] of nomesCargos) {
    const c = await prisma.cargo.upsert({ where: { nome }, update: {}, create: { nome, descricao } })
    cargo.set(nome, c.id)
  }

  const nomesCategorias: [string, string][] = [
    ['Professor(a) EBD — Irmãs', 'EBD'],
    ['Professor(a) EBD — Irmãos', 'EBD'],
    ['Professor(a) EBD — Juvenis', 'EBD'],
    ['Professor(a) EBD — Crianças', 'EBD'],
    ['Professor(a) EBD — Jovens', 'EBD'],
    ['Músico', 'Louvor'],
    ['Mídia', 'Mídia'],
  ]
  const categoria = new Map<string, string>()
  for (const [nome, grupo] of nomesCategorias) {
    const c = await prisma.categoria.upsert({ where: { nome }, update: {}, create: { nome, grupo } })
    categoria.set(nome, c.id)
  }

  const conjunto = new Map<string, string>()
  for (const nome of ['Lírios dos Vales', 'Colunas de Prata', 'Filhas de Jerusalém', 'Oráculos de Deus']) {
    const c = await prisma.conjuntoMusical.upsert({ where: { nome }, update: {}, create: { nome } })
    conjunto.set(nome, c.id)
  }

  const idDe = (mapa: Map<string, string>, nome: string): string => {
    const id = mapa.get(nome)
    if (!id) throw new Error(`Item de catálogo não encontrado: ${nome}`)
    return id
  }

  // ── Membros: cargos variados, ativos e inativos, aniversários espalhados
  //    aniv = dias até o aniversário (0 = hoje). Inativos não aparecem em Aniversários.
  interface MembroDemo {
    nome: string
    aniv: number
    ano: number
    tel?: string
    email?: string
    status?: StatusMembro
    semImagem?: boolean
    cargos?: string[]
    categorias?: string[]
    conjuntos?: string[]
  }
  const EBD = (s: string) => `Professor(a) EBD — ${s}`
  const membrosDemo: MembroDemo[] = [
    { nome: 'Roberto Silva', aniv: 12, ano: 1970, tel: '83999990001', email: 'pastor@igreja.com', cargos: ['Pastor', 'Presbítero'] },
    { nome: 'Maria Rodrigues', aniv: 0, ano: 1985, tel: '83999990002', cargos: ['Secretária'], categorias: ['Músico'], conjuntos: ['Filhas de Jerusalém'] },
    { nome: 'João Pedro Lima', aniv: 1, ano: 1995, tel: '83999990003', cargos: ['Auxiliar'], categorias: [EBD('Jovens'), 'Mídia'], semImagem: true },
    { nome: 'Carlos Ferreira', aniv: 5, ano: 1978, tel: '83999990004', cargos: ['Diácono'] },
    { nome: 'Helena Souza', aniv: 7, ano: 1992, tel: '83999990005', cargos: ['Coord. Mocidade'], categorias: [EBD('Juvenis')] },
    { nome: 'Paulo Henrique Gomes', aniv: 9, ano: 1980, tel: '83999990006', cargos: ['Presbítero'], categorias: ['Músico'], conjuntos: ['Colunas de Prata'] },
    { nome: 'Lúcia Fernandes', aniv: 15, ano: 1968, tel: '83999990007', cargos: ['Auxiliar'], categorias: [EBD('Irmãs')], conjuntos: ['Filhas de Jerusalém'] },
    { nome: 'Marcos Vinícius Alves', aniv: 21, ano: 1999, tel: '83999990008', cargos: ['Diácono'], categorias: ['Mídia'], semImagem: true },
    { nome: 'Sandra Oliveira', aniv: 28, ano: 1983, tel: '83999990009', cargos: ['Secretária'], categorias: [EBD('Crianças')] },
    { nome: 'Rafaela Barbosa', aniv: 45, ano: 2001, tel: '83999990010', cargos: ['Auxiliar'], categorias: ['Músico'], conjuntos: ['Lírios dos Vales'] },
    { nome: 'Gabriel Nunes', aniv: 60, ano: 1997, tel: '83999990011', categorias: [EBD('Jovens'), 'Músico'], conjuntos: ['Oráculos de Deus'] },
    { nome: 'José Santos', aniv: 100, ano: 1962, tel: '83999990012', categorias: [EBD('Irmãos')] },
    { nome: 'Elias Cardoso', aniv: 250, ano: 1974, tel: '83999990013', cargos: ['Presbítero'], conjuntos: ['Colunas de Prata'] },
    // Inativos (mudaram de cidade, afastados...) — mostram o filtro de situação
    { nome: 'Ana Beatriz Costa', aniv: 2, ano: 1990, email: 'ana.costa@email.com', status: StatusMembro.INATIVO, categorias: ['Músico'], conjuntos: ['Lírios dos Vales', 'Colunas de Prata', 'Filhas de Jerusalém'] },
    { nome: 'Tiago Monteiro', aniv: 3, ano: 1988, tel: '83999990014', status: StatusMembro.INATIVO, cargos: ['Diácono'], categorias: ['Músico'], conjuntos: ['Oráculos de Deus'] },
    { nome: 'Débora Martins', aniv: 200, ano: 1993, tel: '83999990015', status: StatusMembro.INATIVO },
  ]

  const membroId = new Map<string, string>()
  for (const m of membrosDemo) {
    const criado = await prisma.membro.create({
      data: {
        nomeCompleto: m.nome,
        dataNascimento: nascimentoEm(m.aniv, m.ano),
        telefone: m.tel ?? null,
        email: m.email ?? null,
        status: m.status ?? StatusMembro.ATIVO,
        naoQuerImagemGravada: m.semImagem ?? false,
        cargos: m.cargos?.length ? { create: m.cargos.map((n) => ({ cargoId: idDe(cargo, n) })) } : undefined,
        categorias: m.categorias?.length ? { create: m.categorias.map((n) => ({ categoriaId: idDe(categoria, n) })) } : undefined,
        conjuntos: m.conjuntos?.length ? { create: m.conjuntos.map((n) => ({ conjuntoId: idDe(conjunto, n) })) } : undefined,
      },
    })
    membroId.set(m.nome, criado.id)
  }
  const mid = (nome: string): string => {
    const id = membroId.get(nome)
    if (!id) throw new Error(`Membro de demonstração não encontrado: ${nome}`)
    return id
  }
  console.log(`✅ ${membrosDemo.length} membros (${membrosDemo.filter((m) => m.status === StatusMembro.INATIVO).length} inativos)`)

  // ── Eventos: recorrentes (com ocorrências), únicos, especiais e um já realizado
  // Série: o 1º evento é o "pai" (guarda a regra) e os demais apontam para ele — igual ao que o sistema cria.
  async function serie(
    nome: string, descricao: string, local: string, tipo: TipoEvento,
    datas: Date[], recorrencia: RecorrenciaEvento, regra: object
  ) {
    const pai = await prisma.evento.create({
      data: { nome, descricao, local, inicio: datas[0], tipo, recorrencia, regraRecorrencia: regra },
    })
    await prisma.evento.createMany({
      data: datas.slice(1).map((d) => ({ nome, descricao, local, inicio: d, tipo, recorrencia, eventoPaiId: pai.id })),
    })
  }
  const semanal = (nome: string, descricao: string, local: string, tipo: TipoEvento, inicio: Date, repeticoes: number, intervalo = 1) =>
    serie(nome, descricao, local, tipo, semanas(inicio, repeticoes, intervalo), RecorrenciaEvento.SEMANAL, {
      diasSemana: [inicio.getDay()], intervalo, criterioParada: { tipo: 'OCORRENCIAS', valor: repeticoes },
    })
  await semanal('Escola Bíblica Dominical', 'Classes para todas as idades', 'Salas de aula', TipoEvento.REUNIAO, proximoDiaSemana(0, 9), 8)
  await semanal('Culto de celebração', 'Culto da família', 'Templo principal', TipoEvento.CULTO, proximoDiaSemana(0, 18, 30), 8)
  await semanal('Culto de oração', 'Momento de intercessão', 'Templo principal', TipoEvento.CULTO, proximoDiaSemana(3, 19, 30), 8)

  // Várias dias na mesma regra (terça e quinta), quinzenal e mensal
  await serie('Ensaio do louvor', 'Ensaio dos conjuntos musicais', 'Templo principal', TipoEvento.REUNIAO,
    [2, 4].flatMap((dow) => semanas(proximoDiaSemana(dow, 20), 4)).sort((a, b) => a.getTime() - b.getTime()),
    RecorrenciaEvento.SEMANAL, { diasSemana: [2, 4], intervalo: 1, criterioParada: { tipo: 'OCORRENCIAS', valor: 8 } })
  await semanal('Reunião de líderes (quinzenal)', 'Alinhamento entre os ministérios', 'Sala de reuniões', TipoEvento.REUNIAO, proximoDiaSemana(6, 16), 5, 2)
  // "Primeira terça do mês" / "primeiro domingo do mês" (regra por dia da semana)
  const enesimoDia = (ano: number, mes: number, dow: number, nth: number, h: number, m = 0) => {
    const primeiro = new Date(ano, mes, 1).getDay()
    return new Date(ano, mes, 1 + ((dow - primeiro + 7) % 7) + (nth - 1) * 7, h, m)
  }
  const mensalNoDiaDaSemana = async (nome: string, descricao: string, local: string, tipo: TipoEvento, dow: number, nth: number, h: number, m: number, meses: number) => {
    const datas: Date[] = []
    for (let k = 0; datas.length < meses && k < 24; k++) {
      const d = enesimoDia(hoje0.getFullYear(), hoje0.getMonth() + k, dow, nth, h, m)
      if (d >= agora) datas.push(d)
    }
    await serie(nome, descricao, local, tipo, datas, RecorrenciaEvento.MENSAL, {
      mensalPor: 'DIA_DA_SEMANA', semanaDoMes: nth, diaSemanaMes: dow, intervalo: 1,
      criterioParada: { tipo: 'OCORRENCIAS', valor: meses },
    })
  }
  await mensalNoDiaDaSemana('Santa Ceia', 'Celebração da Santa Ceia', 'Templo principal', TipoEvento.CULTO, 2, 1, 19, 30, 4) // 1ª terça
  await mensalNoDiaDaSemana('Culto de jovens', 'Culto da mocidade', 'Templo principal', TipoEvento.CULTO, 0, 1, 18, 30, 4) // 1º domingo
  // A cada 15 dias
  await serie('Mutirão de limpeza', 'Cuidado com o espaço da igreja', 'Salão da igreja', TipoEvento.REUNIAO,
    Array.from({ length: 4 }, (_, i) => quando(3 + i * 15, 8)), RecorrenciaEvento.PERSONALIZADA,
    { unidade: 'DIAS', intervalo: 15, criterioParada: { tipo: 'OCORRENCIAS', valor: 4 } })

  await prisma.evento.createMany({
    data: [
      { nome: 'Culto de ação de graças', descricao: 'Aniversário da congregação', local: 'Templo principal', inicio: quando(-6, 19, 0), tipo: TipoEvento.ESPECIAL },
      { nome: 'Reunião de líderes', descricao: 'Planejamento do mês', local: 'Sala de reuniões', inicio: quando(2, 19, 30), tipo: TipoEvento.REUNIAO },
      { nome: 'Entrega de cestas — Mão Amiga', descricao: 'Distribuição das cestas básicas às famílias cadastradas', local: 'Salão da igreja', inicio: quando(4, 14, 0), tipo: TipoEvento.ESPECIAL },
      { nome: 'Retiro de jovens', descricao: 'Retiro anual da mocidade', local: 'Sítio Esperança', inicio: quando(18, 8, 0), tipo: TipoEvento.ESPECIAL },
    ],
  })
  console.log('✅ Eventos: recorrentes, únicos, especiais e um já realizado')

  // ── Manutenção: um ativo em cada situação (vencido, próximo, em dia, sem registro)
  const ativosDemo: { nome: string; descricao: string; periodicidadeDias: number; historico: [number, string, string][] }[] = [
    {
      nome: 'Ar-condicionado — salão principal',
      descricao: 'Dois aparelhos split de 60.000 BTU',
      periodicidadeDias: 180,
      historico: [
        [215, 'Limpeza geral e troca dos filtros', 'Refrigeração Santos'],
        [395, 'Recarga de gás', 'Refrigeração Santos'],
        [580, 'Instalação dos aparelhos', 'Refrigeração Santos'],
      ],
    },
    {
      nome: 'Bomba d’água',
      descricao: 'Bomba do reservatório',
      periodicidadeDias: 90,
      historico: [
        [70, 'Troca do rolamento', 'Eletro Bombas'],
        [160, 'Revisão geral', 'Eletro Bombas'],
      ],
    },
    {
      nome: 'Extintores de incêndio',
      descricao: '6 extintores tipo ABC',
      periodicidadeDias: 365,
      historico: [
        [200, 'Recarga e vistoria anual', 'Extintores JP'],
        [565, 'Recarga e vistoria anual', 'Extintores JP'],
      ],
    },
    {
      nome: 'Caixa d’água',
      descricao: 'Limpeza e higienização',
      periodicidadeDias: 180,
      historico: [
        [40, 'Limpeza e higienização', 'José Santos'],
        [225, 'Limpeza e higienização', 'José Santos'],
      ],
    },
    {
      nome: 'Gerador',
      descricao: 'Gerador de emergência',
      periodicidadeDias: 120,
      historico: [[30, 'Teste de carga e troca de óleo', 'Mecânica Silva']],
    },
    { nome: 'Instalação elétrica', descricao: 'Revisão geral do quadro e da fiação', periodicidadeDias: 365, historico: [] },
  ]
  for (const a of ativosDemo) {
    const ativo = await prisma.ativo.create({
      data: { nome: a.nome, descricao: a.descricao, periodicidadeDias: a.periodicidadeDias },
    })
    if (a.historico.length > 0) {
      await prisma.manutencao.createMany({
        data: a.historico.map(([diasAtras, descricao, responsavel]) => ({
          ativoId: ativo.id,
          data: dia(-diasAtras),
          descricao,
          responsavel,
          realizadaPor: admin.id,
        })),
      })
    }
  }
  console.log('✅ Ativos: vencido, próximo do vencimento, em dia e sem registro (com histórico)')

  // ── Campanha: itens concluído, em andamento, só com pendentes e não iniciado
  const pix = 'igreja.adju@gmail.com'
  const tesoureiro = '5583999990010'
  const item = async (nome: string, descricao: string, valorTotal: number, ordem: number) =>
    prisma.itemCampanha.create({ data: { nome, descricao, valorTotal, chavePix: pix, whatsappTesoureiro: tesoureiro, ordem } })

  const geladeira = await item('Geladeira', 'Geladeira duplex para a cozinha da igreja', 2800, 1)
  const tv = await item('Televisão — sala de reuniões', 'TV 50" para a sala de reuniões', 1500, 2)
  const caixaSom = await item('Caixa de som', 'Caixa de som ativa para eventos', 800, 3)
  const ventiladores = await item('Ventiladores do salão', '4 ventiladores de parede', 600, 4)
  await item('Projetor multimídia', 'Projetor para a sala da EBD', 3200, 5) // não iniciado

  const confirmada = (itemId: string, nome: string, valor: number, horas: number) => ({
    itemId, nomeContribuidor: nome, valor, status: 'CONFIRMADO' as const,
    confirmadoPor: admin.id, confirmadoEm: horasAtras(horas - 2), criadoEm: horasAtras(horas),
  })
  const pendente = (itemId: string, nome: string, valor: number, horas: number) => ({
    itemId, nomeContribuidor: nome, valor, status: 'PENDENTE' as const, criadoEm: horasAtras(horas),
  })
  const recusada = (itemId: string, nome: string, valor: number, horas: number, motivo: string) => ({
    itemId, nomeContribuidor: nome, valor, status: 'RECUSADO' as const, motivoRecusa: motivo,
    confirmadoPor: admin.id, confirmadoEm: horasAtras(horas - 3), criadoEm: horasAtras(horas),
  })

  await prisma.contribuicao.createMany({
    data: [
      // Geladeira: em andamento, com pendentes e uma recusada
      confirmada(geladeira.id, 'Carlos Ferreira', 900, 240),
      confirmada(geladeira.id, 'Família Albuquerque', 500, 200),
      confirmada(geladeira.id, 'Maria Rodrigues', 150, 120),
      confirmada(geladeira.id, 'Lúcia Fernandes', 100, 90),
      pendente(geladeira.id, 'Helena Souza', 200, 5),
      pendente(geladeira.id, 'Gabriel Nunes', 100, 2),
      recusada(geladeira.id, 'Visitante', 50, 70, 'Pix não localizado na conta'),
      // TV: meta atingida
      confirmada(tv.id, 'Paulo Henrique Gomes', 700, 300),
      confirmada(tv.id, 'Elias Cardoso', 500, 280),
      confirmada(tv.id, 'Sandra Oliveira', 300, 260),
      // Caixa de som: só tem pendente (nada contabilizado ainda)
      pendente(caixaSom.id, 'João Pedro Lima', 80, 8),
      // Ventiladores: parcial, com uma recusada
      confirmada(ventiladores.id, 'Rafaela Barbosa', 120, 150),
      confirmada(ventiladores.id, 'Marcos Vinícius Alves', 80, 110),
      recusada(ventiladores.id, 'Doador não identificado', 30, 50, 'Comprovante ilegível'),
    ],
  })
  console.log('✅ Campanha: 5 itens com contribuições aprovadas, pendentes e recusadas')

  // ── Mão Amiga: metas em diferentes estágios + doações aprovadas, pendentes e recusadas
  const meta = async (nomeItem: string, unidade: string, quantidadeNecessaria: number) =>
    prisma.metaCesta.create({ data: { nomeItem, unidade, quantidadeNecessaria } })

  const arroz = await meta('Arroz', 'kg', 50)
  const feijao = await meta('Feijão', 'kg', 30)
  const oleo = await meta('Óleo', 'L', 20) // será atingida
  const acucar = await meta('Açúcar', 'kg', 25)
  const macarrao = await meta('Macarrão', 'pct', 40)
  await meta('Leite em pó', 'un', 20) // sem doações ainda

  const fisica = (metaCestaId: string, itemDoado: string, qtd: number, unidade: string, quem: { membro?: string; nome?: string }, diasAtras: number) => ({
    membroId: quem.membro ? mid(quem.membro) : null,
    nomeDoador: quem.nome ?? null,
    data: dia(-diasAtras),
    itemDoado,
    quantidade: `${qtd} ${unidade}`,
    quantidadeNumerica: qtd,
    metaCestaId,
    tipo: 'FISICA' as const,
    criadoEm: horasAtras(diasAtras * 24),
  })
  const confirmadaMA = <T extends object>(d: T, horas: number) => ({
    ...d, status: 'CONFIRMADO' as const, confirmadoPor: admin.id, confirmadoEm: horasAtras(horas),
  })
  const pendenteMA = <T extends object>(d: T) => ({ ...d, status: 'PENDENTE' as const })
  const recusadaMA = <T extends object>(d: T, horas: number, motivo: string) => ({
    ...d, status: 'RECUSADO' as const, motivoRecusa: motivo, confirmadoPor: admin.id, confirmadoEm: horasAtras(horas),
  })
  const pixMA = (nome: string, valor: number, horas: number) => ({
    membroId: null,
    nomeDoador: nome,
    data: dia(-Math.floor(horas / 24)),
    itemDoado: 'Pix — compra de alimentos',
    quantidade: `R$ ${valor.toFixed(2).replace('.', ',')}`,
    tipo: 'PIX' as const,
    criadoEm: horasAtras(horas),
  })

  await prisma.doacaoAlimento.createMany({
    data: [
      // Aprovadas (contam nas metas)
      confirmadaMA(fisica(arroz.id, 'Arroz', 5, 'kg', { membro: 'Maria Rodrigues' }, 20), 470),
      confirmadaMA(fisica(arroz.id, 'Arroz', 10, 'kg', { membro: 'Lúcia Fernandes' }, 14), 330),
      confirmadaMA(fisica(arroz.id, 'Arroz', 8, 'kg', { membro: 'Carlos Ferreira' }, 9), 210),
      confirmadaMA(fisica(feijao.id, 'Feijão', 5, 'kg', { membro: 'Paulo Henrique Gomes' }, 12), 280),
      confirmadaMA(fisica(feijao.id, 'Feijão', 2, 'kg', { membro: 'Sandra Oliveira' }, 6), 140),
      confirmadaMA(fisica(oleo.id, 'Óleo', 12, 'L', { membro: 'Elias Cardoso' }, 18), 430),
      confirmadaMA(fisica(oleo.id, 'Óleo', 8, 'L', { membro: 'Rafaela Barbosa' }, 8), 190),
      confirmadaMA(fisica(acucar.id, 'Açúcar', 6, 'kg', { membro: 'Helena Souza' }, 10), 230),
      confirmadaMA(fisica(macarrao.id, 'Macarrão', 10, 'pct', { membro: 'Gabriel Nunes' }, 7), 160),
      confirmadaMA(pixMA('Família Albuquerque', 80, 360), 350),
      // Pendentes (aguardando conferência — é o que chega pela página pública)
      pendenteMA(fisica(arroz.id, 'Arroz', 5, 'kg', { nome: 'Beatriz Mendes' }, 0)),
      pendenteMA(fisica(feijao.id, 'Feijão', 3, 'kg', { nome: 'Família Torres' }, 0)),
      pendenteMA(fisica(macarrao.id, 'Macarrão', 6, 'pct', { nome: 'Família Torres' }, 0)),
      pendenteMA(pixMA('Carla Dias', 50, 3)),
      pendenteMA(pixMA('Davi Lima', 100, 1)),
      // Recusadas (com motivo)
      recusadaMA(pixMA('Doador anônimo', 20, 100), 96, 'Pix não localizado na conta'),
      recusadaMA(fisica(acucar.id, 'Açúcar', 4, 'kg', { nome: 'Visitante' }, 4), 90, 'Itens vencidos'),
    ],
  })
  console.log('✅ Mão Amiga: 6 metas (uma atingida) e doações aprovadas, pendentes e recusadas')

  // ── Landing page pública (não sobrescreve se já estiver configurada)
  await prisma.configuracaoIgreja.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      sobre: 'Uma comunidade de fé, acolhimento e serviço no Jardim Cidade Universitária.',
      endereco: 'Rua Exemplo, 123 — Jardim Cidade Universitária, João Pessoa/PB',
      instagramUrl: 'https://www.instagram.com/adpb_jcu/',
      whatsappContato: '5583999990000',
    },
  })

  console.log('\n🎉 Dados de exemplo prontos!')
  console.log('👤 Login: admin@igreja.com / admin123')
  console.log('📋 O que mostrar: veja DEMO.md')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
