// Variáveis mínimas para o servidor subir nos testes (carregado antes de cada arquivo via `setupFiles`).
process.env.NODE_ENV ??= 'test'
process.env.DATABASE_URL ??= 'postgresql://teste:teste@localhost:5432/teste'
process.env.JWT_SECRET ??= 'segredo-de-teste-com-mais-de-32-caracteres!!'
process.env.ENABLE_CRON = 'false'
