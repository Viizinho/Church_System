# Relatório de revisão — segurança, desempenho e qualidade

Revisão completa do código (backend, frontend, banco e dependências) feita com o objetivo de **publicar o sistema na internet**. Cada item abaixo foi corrigido, salvo os listados em *Pendências e recomendações*.

## Como foi feito

| Verificação | Ferramenta / método | Resultado |
|---|---|---|
| Vulnerabilidades em dependências | `npm audit` | 10 (1 crítica, 4 altas) → **0** |
| Dependências sem uso | `depcheck` | removidas: `react-hook-form`, `zod` (frontend), `@hookform/resolvers`, ESLint e plugins (sem configuração) |
| Código morto | grafo de imports a partir de `main.tsx` / `server.ts` | **33 arquivos** órfãos removidos (cópias antigas do frontend dentro de `backend/src` e páginas `admin/*`, `publico/*` substituídas) |
| Injeção SQL | busca por `$queryRaw`/`$executeRaw` | nenhum uso com entrada do usuário (Prisma parametriza; único `$queryRaw` é `SELECT 1` no `/ready`) |
| XSS | busca por `dangerouslySetInnerHTML`/`innerHTML`/`eval` + revisão de `href`/`src` vindos de dados | sem sinks perigosos; links vindos do usuário agora só aceitam `http(s)` |
| Tipos | `tsc --noEmit` (backend e frontend) | sem erros no frontend; backend exige `prisma generate` |
| Testes | `npm test` (82 verificações) | API de ponta a ponta com Express real, recorrência, aniversários e modo produção |
| Build | `vite build` | bundle inicial **366 kB → 195 kB** (rotas carregadas sob demanda) |

## Segurança — achados e correções

| # | Severidade | Achado | Correção |
|---|---|---|---|
| 1 | Alta | Sem limite de tentativas no login (força bruta) | `express-rate-limit`: 10 falhas/15 min por IP no login e na troca de senha |
| 2 | Alta | Rotas públicas de envio sem limite (spam de pendências) | 15 envios/10 min por IP; leitura pública 120/min; API 600/min |
| 3 | Alta | `comprovanteUrl`, `fotoUrl` e links da landing aceitavam `javascript:`/`data:` (XSS armazenado ao virar `<a href>`) | validador `urlHttp` (só `http://` e `https://`, máx. 2048) — coberto por teste |
| 4 | Alta | Dependências com CVEs (body-parser, proxy-addr crítico, qs, nodemailer, zod, vite/esbuild, react-router) | atualizadas (`npm audit` = 0); `qs` fixado por `overrides` |
| 5 | Média | Sem `helmet`/CSP, `X-Powered-By` exposto | `helmet` com CSP restritiva (`script-src 'self'`), `frame-ancestors 'none'`, `nosniff`, HSTS |
| 6 | Média | CORS aberto a qualquer origem | em produção só `CORS_ORIGINS` (ou mesma origem) |
| 7 | Média | JWT: algoritmo não fixado; segredo sem validação; validade de 7 dias | `HS256` fixado na emissão e na verificação (rejeita `alg:none`); servidor **não sobe** em produção com segredo < 32 caracteres ou de exemplo; validade padrão 12 h |
| 8 | Média | Login revelava e-mails cadastrados pelo tempo de resposta | `bcrypt.compare` sempre executado (hash falso); e-mail normalizado |
| 9 | Média | Aprovar/recusar duas vezes ao mesmo tempo (dois admins) | `UPDATE … WHERE status = 'PENDENTE'` atômico → o segundo recebe 409 |
| 10 | Média | Dois visitantes doando o último item ao mesmo tempo estouravam a meta | transação `Serializable` + verificação dentro dela |
| 11 | Média | Seed criava `admin@igreja.com / admin123` sem aviso | seeds de exemplo recusam `NODE_ENV=production`; novo `db:seed:admin` exige e-mail/senha forte por variável |
| 12 | Média | Sem como trocar a senha | `PUT /api/auth/senha` + tela *Alterar senha* (10+ caracteres, letras e números) |
| 12b | Média | Sem recuperação de senha segura | "Esqueci minha senha" por e-mail: token de 256 bits (só o SHA-256 vai ao banco), validade de 30 min, uso único e atômico, pedido novo invalida os anteriores, resposta idêntica exista ou não o e-mail (sem enumeração, e sem diferença de tempo, pois o envio é assíncrono), 5 pedidos/h por IP e 1 e-mail/2 min por conta, link com o token no fragmento `#` (não vai a logs nem ao Referer), e-mail de aviso após a troca, sessões antigas encerradas (`senhaAlteradaEm` conferido em cada requisição) e o link nunca é escrito nos logs em produção |
| 13 | Baixa | Campos sem tamanho máximo, status/tipo de query sem validação (500 em valor inválido) | limites em todos os schemas; `enumQuery` valida filtros (400) |
| 14 | Baixa | JSON malformado e corpo grande davam 500 | 400 / 413 com mensagem; corpo limitado a 100 kB |
| 15 | Baixa | Erros do Prisma (duplicado, FK) viravam 500 | 409 / 404 com mensagem amigável |
| 16 | Baixa | SSE sem limite de conexões nem heartbeat (proxies derrubam ociosas) | máx. 500 conexões, `ping` a cada 25 s, `X-Accel-Buffering: no` |
| 17 | Baixa | Erro no cron derrubaria o processo (`unhandledRejection`) | `try/catch` + handler global |
| 18 | Baixa | Resposta 401 do login recarregava a página e escondia a mensagem | redireciona só quando havia token |

## Desempenho

| Achado | Correção |
|---|---|
| Sem índices além das chaves únicas | migração `20261030120000_indices_desempenho`: status/nome de membros, vínculos de cargo/categoria/conjunto, eventos por data, manutenções por ativo, contribuições e doações por item/meta/status |
| N+1: 1–2 consultas por item (campanha) ou meta (Mão Amiga) | `groupBy` — 1 consulta para todos |
| Listagens sem teto | `take` (500 para pendências/histórico, 2000 para membros) |
| Aniversários faziam 2 chamadas (cada uma varrendo os membros) | 1 chamada; a semana é filtrada no cliente |
| Respostas sem compressão | `compression` (exceto no stream SSE) |
| Bundle único de 366 kB | rotas com `React.lazy`: bundle inicial 195 kB; a landing page não baixa o painel |
| Assets sem cache | build com hash servido com `Cache-Control: immutable, 1y` |
| Alertas: só o 1º destinatário era notificado | alerta enviado a todos, uma vez por ciclo |

## Qualidade, acessibilidade e design

- Ícones do menu e dos cards trocados de emoji por `lucide-react` (aparência igual em qualquer dispositivo).
- Componentes base: foco visível, `label` ligado ao campo, `type="button"` por padrão, modal com `role="dialog"`, foco preso, `Esc`, rolagem travada e foco devolvido; `Spinner` com texto para leitores de tela; link "Ir para o conteúdo"; respeita `prefers-reduced-motion`.
- `PageHeader` único (título, subtítulo, ações) e título da aba por página; largura/margens padronizadas.
- Dashboard: cartões clicáveis, tratamento de erro (antes ficava em "carregando" para sempre), badge de tipo do evento (antes mostrava "Mensal" para repetições personalizadas).
- Valores em reais no padrão brasileiro (`R$ 1.650,00`, antes `R$ 1650.00`); tabelas com rolagem horizontal no celular.
- `ErrorBoundary` evita tela branca; favicon, `robots.txt` (painel fora dos buscadores) e meta tags.

## Pendências e recomendações

1. **Não foi possível rodar contra PostgreSQL real neste ambiente** (o download do motor do Prisma é bloqueado). A lógica foi validada com um banco em memória; rode `npx prisma generate`, `npm run db:deploy` e `npm test` no seu computador antes de publicar.
2. **Docker:** `Dockerfile`/`docker-compose.yml` escritos mas **não testados** (sem daemon disponível aqui).
3. **Token no `localStorage`:** a CSP restritiva reduz o risco de roubo por XSS; a evolução natural é cookie `HttpOnly` + proteção CSRF. Trocar ou redefinir a senha agora encerra todas as sessões; o botão Sair só apaga o token no navegador (validade de 12 h).
4. **Um único perfil de usuário:** todo login é administrador. Se vier mais de uma pessoa, criar papéis (ex.: tesoureiro só vê Campanha/Mão Amiga).
5. **Comprovantes:** a página pública pede *link* do comprovante (não há upload). Se for adotar upload de imagem, validar tipo/tamanho e guardar fora do servidor da aplicação.
6. **LGPD:** a lista de membros contém dados pessoais (telefone, endereço, data de nascimento, preferência de imagem). Publicar com HTTPS, backup criptografado do banco e texto de privacidade na landing page.
7. **Auditoria:** registrar quem aprovou/recusou já existe (`confirmadoPor`); falta log de alterações em membros.
8. **Monitoramento:** conectar `/ready` ao health check do provedor e um alerta de erros (ex.: Sentry).
9. **Cron:** com mais de uma réplica, deixe `ENABLE_CRON=true` em apenas uma.
