# Igreja Gestão

Sistema de gestão para a Assembleia de Deus Jardim Cidade Universitária, desenvolvido como artefato do Trabalho de Conclusão de Curso em Bacharelado em Ciência da Computação na Universidade Federal da Paraíba (UFPB).

**Autor:** João Vitor Cardoso Beltrão  
**Metodologia:** Design Science Research (DSR)

---

## Visão geral

O sistema é composto por duas áreas:

| Área | Acesso | Descrição |
|------|--------|-----------|
| Painel administrativo | Login obrigatório | Gestão de membros, eventos, manutenção e contribuições |
| Área pública | Sem login | Campanha de arrecadação e Projeto Mão Amiga |

## Módulos

- **Membros** — cadastro, cargos, busca e status (ativo/inativo)
- **Aniversários** — listagem semanal e mensal de membros ativos
- **Eventos** — agenda com suporte a eventos recorrentes
- **Manutenção** — controle de ativos com alertas automáticos (vencido / próximo dos 30 dias)
- **Campanha Jardim Cidade Universitária** — itens com barra de progresso e confirmação de Pix
- **Projeto Mão Amiga** — registro de doações físicas e Pix de alimentos

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js · TypeScript · Express · Prisma ORM |
| Banco de dados | PostgreSQL |
| Frontend | React · TypeScript · Tailwind CSS · Vite |
| Autenticação | JWT + bcrypt |

## Estrutura do repositório

```
igreja-gestao/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # Modelo do banco
│   │   └── seed.ts         # Dados iniciais
│   └── src/
│       ├── controllers/    # Lógica de cada módulo
│       ├── middlewares/    # Auth JWT + error handler
│       ├── routes/         # Definição de rotas
│       └── utils/          # Helpers e Prisma client
├── frontend/
│   └── src/
│       ├── components/     # UI reutilizável + layout
│       ├── hooks/          # useAuth
│       ├── pages/          # Uma página por módulo
│       ├── services/       # Axios configurado
│       └── types/          # Tipos TypeScript
└── .github/
    ├── workflows/          # CI (TypeScript check)
    └── ISSUE_TEMPLATE/
```

## Instalação

Consulte o [CONTRIBUTING.md](./CONTRIBUTING.md) para instruções detalhadas de setup do ambiente.

**Resumo rápido:**

```bash
# Backend
cd backend && npm install
cp .env.example .env        # configure DATABASE_URL e JWT_SECRET
npm run db:migrate && npm run db:seed
npm run dev

# Frontend (outro terminal)
cd frontend && npm install
cp .env.example .env
npm run dev
```

Acesse `http://localhost:5173` com `admin@igreja.com` / `admin123`.

## Rotas da API

Documentação completa no [backend/README.md](./backend/README.md).

As rotas públicas (sem autenticação) são:
- `POST /api/publico/campanha/:itemId/contribuir`
- `POST /api/publico/mao-amiga/pix`

Todas as demais exigem o header `Authorization: Bearer <token>`.

## Licença

Projeto acadêmico. Todos os direitos reservados ao autor.
