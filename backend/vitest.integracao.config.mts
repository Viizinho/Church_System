import { defineConfig } from 'vitest/config'

/**
 * Testes de integração: API real + PostgreSQL real (banco separado, apagado a cada teste).
 * Precisa de DATABASE_URL apontando para um banco DE TESTE já migrado:
 *
 *   DATABASE_URL=postgresql://postgres:SENHA@localhost:5432/igreja_teste npx prisma migrate deploy
 *   DATABASE_URL=postgresql://postgres:SENHA@localhost:5432/igreja_teste npm run test:integracao
 */
export default defineConfig({
  test: {
    name: 'integracao',
    include: ['tests/integracao/**/*.test.ts'],
    setupFiles: ['tests/helpers/ambiente.ts'],
    environment: 'node',
    // Um arquivo por vez: todos usam o mesmo banco
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
      reporter: ['text-summary', 'text', 'html', 'json-summary'],
      reportsDirectory: 'coverage-integracao',
    },
  },
})
