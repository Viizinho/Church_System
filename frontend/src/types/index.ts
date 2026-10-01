// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface Usuario {
  id: string
  nome: string
  email: string
}

// ─── Membros ──────────────────────────────────────────────────────────────────
export type StatusMembro = 'ATIVO' | 'INATIVO'

export interface Cargo {
  id: string
  nome: string
  descricao?: string | null
}

export interface MembroCargo {
  cargoId: string
  cargo: Cargo
}

export interface Categoria {
  id: string
  nome: string
  grupo?: string | null
}

export interface MembroCategoria {
  categoriaId: string
  categoria: Categoria
}

export interface ConjuntoMusical {
  id: string
  nome: string
}

export interface MembroConjunto {
  conjuntoId: string
  conjunto: ConjuntoMusical
}

export interface Membro {
  id: string
  nomeCompleto: string
  dataNascimento?: string | null
  telefone?: string | null
  email?: string | null
  endereco?: string | null
  fotoUrl?: string | null
  status: StatusMembro
  cargos: MembroCargo[]
  categorias: MembroCategoria[]
  conjuntos: MembroConjunto[]
  consentimentoImagem: boolean
  criadoEm: string
}

// ─── Eventos ──────────────────────────────────────────────────────────────────
export type TipoEvento = 'CULTO' | 'REUNIAO' | 'ESPECIAL'
export type RecorrenciaEvento = 'NENHUMA' | 'SEMANAL' | 'MENSAL' | 'PERSONALIZADA'

export interface Evento {
  id: string
  nome: string
  descricao?: string | null
  local?: string | null
  inicio: string
  tipo: TipoEvento
  recorrencia: RecorrenciaEvento
  regraRecorrencia?: unknown
}

// ─── Manutenção ───────────────────────────────────────────────────────────────
export type StatusManutencao = 'EM_DIA' | 'PROXIMO' | 'VENCIDO' | 'SEM_REGISTRO'

export interface Manutencao {
  id: string
  data: string
  descricao: string
  responsavel: string
  criadoEm: string
}

export interface Ativo {
  id: string
  nome: string
  descricao?: string | null
  periodicidadeDias: number
  ultimaManutencao?: Manutencao | null
  proximaManutencao?: string | null
  status: StatusManutencao
  historico?: Manutencao[]
}

// ─── Campanha ─────────────────────────────────────────────────────────────────
export type StatusContribuicao = 'PENDENTE' | 'CONFIRMADO' | 'RECUSADO'

export interface ItemCampanha {
  id: string
  nome: string
  descricao?: string | null
  valorTotal: number
  valorArrecadado: number
  chavePix: string
  whatsappTesoureiro: string
  ativo: boolean
  ordem: number
}

export interface Contribuicao {
  id: string
  itemId: string
  item?: { id: string; nome: string }
  nomeContribuidor: string
  valor: number
  comprovanteUrl?: string | null
  status: StatusContribuicao
  motivoRecusa?: string | null
  criadoEm: string
}

// ─── Mão Amiga ────────────────────────────────────────────────────────────────
export type TipoDoacao = 'FISICA' | 'PIX'
export type StatusDoacao = 'PENDENTE' | 'CONFIRMADO' | 'RECUSADO'

export interface DoacaoAlimento {
  id: string
  membroId?: string | null
  membro?: { id: string; nomeCompleto: string } | null
  nomeDoador?: string | null
  data: string
  itemDoado: string
  quantidade: string
  tipo: TipoDoacao
  comprovanteUrl?: string | null
  status: StatusDoacao
  criadoEm: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardData {
  membros: { total: number; totalGeral: number }
  eventosProximos: Evento[]
  aniversariantes: (Membro & { diffDias: number })[]
  manutencao: {
    alertas: number
    vencidos: number
    proximos: number
    itens: Ativo[]
  }
  contribuicoesPendentes: number
  doacoesPendentes: number
}
