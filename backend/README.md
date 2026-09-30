# Backend — Igreja Gestão

API REST do sistema de gestão da Assembleia de Deus Jardim Cidade Universitária.

**Stack:** Node.js · TypeScript · Express · Prisma ORM · PostgreSQL

## Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev        # http://localhost:3333
```

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor em modo desenvolvimento (hot reload) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run start` | Roda o build de produção |
| `npm run db:migrate` | Executa as migrations do Prisma |
| `npm run db:seed` | Popula o banco com dados iniciais |
| `npm run db:studio` | Abre o Prisma Studio (visualizador do banco) |

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL de conexão PostgreSQL |
| `JWT_SECRET` | Chave secreta para tokens JWT |
| `JWT_EXPIRES_IN` | Expiração do token (padrão: `7d`) |
| `PORT` | Porta do servidor (padrão: `3333`) |

## Rotas

### Autenticação
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/login` | ❌ | Login |
| GET | `/api/auth/perfil` | ✅ | Perfil do usuário |

### Dashboard
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard` | Resumo consolidado |

### Membros
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/membros` | Listar (`busca`, `status`) |
| GET | `/api/membros/aniversariantes` | Aniversariantes (`periodo=semana\|mes`) |
| GET | `/api/membros/:id` | Detalhes |
| POST | `/api/membros` | Criar |
| PUT | `/api/membros/:id` | Atualizar |
| DELETE | `/api/membros/:id` | Remover |

### Cargos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/cargos` | Listar |
| POST | `/api/cargos` | Criar |
| PUT | `/api/cargos/:id` | Atualizar |
| DELETE | `/api/cargos/:id` | Remover |

### Eventos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/eventos` | Listar por mês (`mes`, `ano`) |
| GET | `/api/eventos/proximos` | Próximos 7 dias |
| POST | `/api/eventos` | Criar |
| PUT | `/api/eventos/:id` | Atualizar |
| DELETE | `/api/eventos/:id` | Remover |

### Manutenção
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/ativos` | Listar com status calculado |
| GET | `/api/ativos/alertas` | Apenas alertas |
| GET | `/api/ativos/:id` | Detalhes + histórico |
| POST | `/api/ativos` | Criar ativo |
| PUT | `/api/ativos/:id` | Atualizar |
| DELETE | `/api/ativos/:id` | Remover |
| POST | `/api/ativos/:id/manutencoes` | Registrar ocorrência |

### Campanha Jardim Cidade Universitária
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/campanha/itens` | ✅ | Listar itens |
| POST | `/api/campanha/itens` | ✅ | Criar item |
| PUT | `/api/campanha/itens/:id` | ✅ | Atualizar |
| DELETE | `/api/campanha/itens/:id` | ✅ | Remover |
| GET | `/api/campanha/contribuicoes/pendentes` | ✅ | Pendentes |
| PATCH | `/api/campanha/contribuicoes/:id/confirmar` | ✅ | Confirmar |
| PATCH | `/api/campanha/contribuicoes/:id/recusar` | ✅ | Recusar |
| POST | `/api/publico/campanha/:itemId/contribuir` | ❌ | Contribuir (público) |

### Projeto Mão Amiga
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/mao-amiga/doacoes` | ✅ | Listar doações |
| GET | `/api/mao-amiga/doacoes/pendentes` | ✅ | Pendentes |
| POST | `/api/mao-amiga/doacoes` | ✅ | Registrar (admin) |
| PATCH | `/api/mao-amiga/doacoes/:id/confirmar` | ✅ | Confirmar Pix |
| PATCH | `/api/mao-amiga/doacoes/:id/recusar` | ✅ | Recusar Pix |
| POST | `/api/publico/mao-amiga/pix` | ❌ | Registrar Pix (público) |

## Credenciais do seed

```
E-mail: admin@igreja.com
Senha:  admin123
```
