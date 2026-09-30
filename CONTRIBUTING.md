# Contribuindo com o projeto

Este projeto é um Trabalho de Conclusão de Curso (TCC) do Bacharelado em Ciência da Computação da UFPB, desenvolvido por João Vitor Cardoso Beltrão.

## Estrutura do repositório

```
igreja-gestao/
├── backend/          # API REST — Node.js + TypeScript + Express + Prisma
├── frontend/         # SPA — React + TypeScript + Tailwind CSS
└── .github/          # CI, templates de issue e PR
```

## Configuração do ambiente

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Backend

```bash
cd backend
npm install
cp .env.example .env        # preencha DATABASE_URL e JWT_SECRET
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev                 # http://localhost:3333
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:3333/api
npm run dev                 # http://localhost:5173
```

## Fluxo de branches

| Branch | Uso |
|--------|-----|
| `main` | Código estável — apenas via PR |
| `dev` | Integração contínua |
| `feat/<nome>` | Nova funcionalidade |
| `fix/<nome>` | Correção de bug |

## Convenção de commits

Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adicionar módulo de membros
fix: corrigir cálculo de aniversariantes na virada do ano
refactor: extrair lógica de manutenção para serviço
chore: atualizar dependências
docs: documentar rotas da API
```

## Credenciais de desenvolvimento

```
E-mail: admin@igreja.com
Senha:  admin123
```
