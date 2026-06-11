# Igreja Backend — Assembleia de Deus Jardim Cidade Universitária

Backend do sistema de gestão da igreja, desenvolvido como artefato do TCC (UFPB).

**Stack:** Node.js · TypeScript · Express · Prisma ORM · PostgreSQL

---

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+

---

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do PostgreSQL e um JWT_SECRET seguro

# 3. Gerar o Prisma Client
npm run db:generate

# 4. Rodar as migrations (cria as tabelas no banco)
npm run db:migrate

# 5. Popular o banco com dados iniciais
npm run db:seed

# 6. Iniciar em modo desenvolvimento
npm run dev
```

O servidor estará disponível em `http://localhost:3333`.

---

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | URL de conexão PostgreSQL | `postgresql://user:pass@localhost:5432/igreja_db` |
| `JWT_SECRET` | Chave secreta para assinar tokens JWT | string longa e aleatória |
| `JWT_EXPIRES_IN` | Tempo de expiração do token | `7d` |
| `PORT` | Porta do servidor | `3333` |

---

## Rotas principais

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login com e-mail e senha |
| GET | `/api/auth/perfil` | Perfil do usuário autenticado |

### Dashboard
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/dashboard` | Resumo consolidado |

### Membros
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/membros` | Listar (filtros: `busca`, `status`) |
| GET | `/api/membros/aniversariantes` | Aniversariantes (`periodo=semana\|mes`) |
| GET | `/api/membros/:id` | Detalhes do membro |
| POST | `/api/membros` | Criar membro |
| PUT | `/api/membros/:id` | Atualizar membro |
| DELETE | `/api/membros/:id` | Remover membro |

### Cargos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/cargos` | Listar todos os cargos |
| POST | `/api/cargos` | Criar cargo |
| PUT | `/api/cargos/:id` | Atualizar cargo |
| DELETE | `/api/cargos/:id` | Remover cargo |

### Eventos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/eventos` | Listar por mês (`mes`, `ano`) |
| GET | `/api/eventos/proximos` | Próximos 7 dias |
| POST | `/api/eventos` | Criar evento |
| PUT | `/api/eventos/:id` | Atualizar evento |
| DELETE | `/api/eventos/:id` | Remover evento |

### Manutenção
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/ativos` | Listar ativos com status calculado |
| GET | `/api/ativos/alertas` | Apenas vencidos e próximos |
| POST | `/api/ativos` | Cadastrar ativo |
| PUT | `/api/ativos/:id` | Atualizar ativo |
| DELETE | `/api/ativos/:id` | Remover ativo |
| POST | `/api/ativos/:id/manutencoes` | Registrar ocorrência |

### Campanha Jardim Cidade Universitária
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/campanha/itens` | ✅ | Listar itens com valor arrecadado |
| POST | `/api/campanha/itens` | ✅ | Criar item |
| PUT | `/api/campanha/itens/:id` | ✅ | Atualizar item |
| DELETE | `/api/campanha/itens/:id` | ✅ | Remover item |
| GET | `/api/campanha/contribuicoes/pendentes` | ✅ | Pendentes de confirmação |
| PATCH | `/api/campanha/contribuicoes/:id/confirmar` | ✅ | Confirmar |
| PATCH | `/api/campanha/contribuicoes/:id/recusar` | ✅ | Recusar |
| POST | `/api/publico/campanha/:itemId/contribuir` | ❌ | Registrar contribuição (público) |

### Projeto Mão Amiga
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/mao-amiga/doacoes` | ✅ | Listar doações |
| GET | `/api/mao-amiga/doacoes/pendentes` | ✅ | Pendentes de confirmação |
| POST | `/api/mao-amiga/doacoes` | ✅ | Registrar doação física (admin) |
| PATCH | `/api/mao-amiga/doacoes/:id/confirmar` | ✅ | Confirmar Pix |
| PATCH | `/api/mao-amiga/doacoes/:id/recusar` | ✅ | Recusar Pix |
| POST | `/api/publico/mao-amiga/pix` | ❌ | Registrar Pix (público) |

---

## Credenciais do seed

```
E-mail: admin@igreja.com
Senha:  admin123
```

---

## Estrutura do projeto

```
src/
├── controllers/     # Lógica de cada módulo
├── middlewares/     # Autenticação e error handler
├── routes/          # Definição de todas as rotas
├── utils/           # Prisma client, AppError, helpers
├── app.ts           # Configuração do Express
└── server.ts        # Entrada do servidor
prisma/
├── schema.prisma    # Modelo do banco de dados
└── seed.ts          # Dados iniciais
```
