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
│   │   ├── seed.ts         # Dados iniciais
│   │   └── seed-demo.ts    # Dados de exemplo p/ apresentação (npm run db:seed:demo, ver DEMO.md)
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

## Instalação (desenvolvimento)

```bash
npm install                      # na raiz — instala backend e frontend (npm workspaces)
cd backend
cp .env.example .env             # configure DATABASE_URL e JWT_SECRET
npx prisma generate
npm run db:migrate
npm run db:seed                  # admin de teste + dados básicos (só desenvolvimento)
npm run dev                      # API em :3333

cd ../frontend && cp .env.example .env && npm run dev   # outro terminal — http://localhost:5173
```

Login de desenvolvimento: `admin@igreja.com` / `admin123`. Para uma apresentação com dados de exemplo completos: `npm run db:seed:demo` (ver [DEMO.md](./DEMO.md)).

## Qualidade

```bash
npm run typecheck     # TypeScript (backend + frontend)
npm test              # testes da API, recorrência de eventos, aniversários e modo produção (sem precisar de banco)
npm run audit:prod    # vulnerabilidades conhecidas nas dependências de produção
```

O relatório da última revisão (segurança, desempenho, código morto) está em [docs/DIAGNOSTICO.md](./docs/DIAGNOSTICO.md).

## Publicar na internet

A API serve o frontend compilado, então é **um serviço só** (sem CORS) + um PostgreSQL.

1. **Variáveis** (veja `backend/.env.example`): `DATABASE_URL`, `JWT_SECRET` (`openssl rand -hex 48`), `NODE_ENV=production`, `TRUST_PROXY=1` (Render/Railway/Nginx). O servidor **se recusa a subir** com segredo fraco.
2. **Build e migração:** `npm ci && npm run build --workspace=frontend && npm run build --workspace=backend` e, no deploy, `npm run db:deploy --workspace=backend` (aplica migrações sem apagar dados).
3. **Administrador (produção):** `ADMIN_EMAIL=... ADMIN_PASSWORD='...' npm run db:seed:admin --workspace=backend`. Os seeds de exemplo (`db:seed`, `db:seed:demo`) **recusam rodar** com `NODE_ENV=production`.
4. **Iniciar:** `npm start` (ou use o `Dockerfile` / `docker-compose.yml` da raiz). Health checks: `/health` e `/ready` (confere o banco).
5. **HTTPS** é responsabilidade do provedor/proxy. Após publicar, entre e troque a senha em *Alterar senha*.
6. **Backup:** habilite backup automático do PostgreSQL no provedor (os dados de membros são pessoais — LGPD).

## Licença

Projeto acadêmico. Todos os direitos reservados ao autor.
