import { Router } from 'express'
import { autenticar } from '../middlewares/autenticar'

import * as auth from '../controllers/authController'
import * as membros from '../controllers/membrosController'
import * as cargos from '../controllers/cargosController'
import * as eventos from '../controllers/eventosController'
import * as manutencao from '../controllers/manutencaoController'
import * as campanha from '../controllers/campanhaController'
import * as maoAmiga from '../controllers/maoAmigaController'
import * as dashboard from '../controllers/dashboardController'
import * as publico from '../controllers/publicoController'

const router = Router()

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', auth.login)
router.get('/auth/perfil', autenticar, auth.perfil)

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', autenticar, dashboard.resumo)

// ─── Membros ──────────────────────────────────────────────────────────────────
router.get('/membros', autenticar, membros.listar)
router.get('/membros/aniversariantes', autenticar, membros.aniversariantes)
router.get('/membros/categorias', autenticar, membros.listarCategorias)
router.get('/membros/conjuntos', autenticar, membros.listarConjuntos)
router.get('/membros/:id', autenticar, membros.obter)
router.post('/membros', autenticar, membros.criar)
router.put('/membros/:id', autenticar, membros.atualizar)
router.delete('/membros/:id', autenticar, membros.remover)

// ─── Cargos ───────────────────────────────────────────────────────────────────
router.get('/cargos', autenticar, cargos.listar)
router.post('/cargos', autenticar, cargos.criar)
router.put('/cargos/:id', autenticar, cargos.atualizar)
router.delete('/cargos/:id', autenticar, cargos.remover)

// ─── Eventos ──────────────────────────────────────────────────────────────────
router.get('/eventos', autenticar, eventos.listar)
router.get('/eventos/proximos', autenticar, eventos.proximosSete)
router.get('/eventos/:id', autenticar, eventos.obter)
router.post('/eventos', autenticar, eventos.criar)
router.put('/eventos/:id', autenticar, eventos.atualizar)
router.delete('/eventos/:id', autenticar, eventos.remover)

// ─── Manutenção ───────────────────────────────────────────────────────────────
router.get('/ativos', autenticar, manutencao.listarAtivos)
router.get('/ativos/alertas', autenticar, manutencao.alertas)
router.get('/ativos/:id', autenticar, manutencao.obterAtivo)
router.post('/ativos', autenticar, manutencao.criarAtivo)
router.put('/ativos/:id', autenticar, manutencao.atualizarAtivo)
router.delete('/ativos/:id', autenticar, manutencao.removerAtivo)
router.post('/ativos/:id/manutencoes', autenticar, manutencao.registrarManutencao)

// ─── Campanha Jardim Cidade Universitária ─────────────────────────────────────
// Admin
router.get('/campanha/itens', autenticar, campanha.listarItens)
router.get('/campanha/itens/:id', autenticar, campanha.obterItem)
router.post('/campanha/itens', autenticar, campanha.criarItem)
router.put('/campanha/itens/:id', autenticar, campanha.atualizarItem)
router.delete('/campanha/itens/:id', autenticar, campanha.removerItem)
router.get('/campanha/contribuicoes/pendentes', autenticar, campanha.listarPendentes)
router.patch('/campanha/contribuicoes/:id/confirmar', autenticar, campanha.confirmarContribuicao)
router.patch('/campanha/contribuicoes/:id/recusar', autenticar, campanha.recusarContribuicao)
// Público
router.get('/publico/campanha', campanha.listarItens)
router.get('/publico/campanha/eventos', campanha.eventosCampanha) // SSE — total ao vivo
router.post('/publico/campanha/:itemId/contribuir', campanha.criarContribuicao)

// ─── Projeto Mão Amiga ────────────────────────────────────────────────────────
// Admin
router.get('/mao-amiga/doacoes', autenticar, maoAmiga.listar)
router.get('/mao-amiga/doacoes/pendentes', autenticar, maoAmiga.listarPendentes)
router.post('/mao-amiga/doacoes', autenticar, maoAmiga.registrar)
router.patch('/mao-amiga/doacoes/:id/confirmar', autenticar, maoAmiga.confirmar)
router.patch('/mao-amiga/doacoes/:id/recusar', autenticar, maoAmiga.recusar)
router.get('/mao-amiga/metas', autenticar, maoAmiga.listarMetas)
router.post('/mao-amiga/metas', autenticar, maoAmiga.criarMeta)
router.put('/mao-amiga/metas/:id', autenticar, maoAmiga.atualizarMeta)
router.delete('/mao-amiga/metas/:id', autenticar, maoAmiga.removerMeta)
// Público
router.post('/publico/mao-amiga/pix', maoAmiga.registrarPixPublico)
router.get('/publico/mao-amiga/metas', publico.metasMaoAmigaPublicas)

// ─── Área Pública (Landing Page) ───────────────────────────────────────────────
router.get('/publico/config', publico.configuracao)
router.put('/publico/config', autenticar, publico.atualizarConfiguracao)
router.get('/publico/eventos', publico.eventosPublicos)

export default router
