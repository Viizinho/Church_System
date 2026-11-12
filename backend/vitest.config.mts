import { defineConfig } from 'vitest/config'

/**
 * Testes automatizados do backend.
 *  - unidade: regras de negócio puras (recorrência, aniversário, manutenção, validação)
 *  - api:     Express real + banco em memória (rotas, autenticação, validação, segurança)
 * Os testes de integração com PostgreSQL ficam em vitest.integracao.config.ts.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unidade',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['tests/helpers/ambiente.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'api',
          include: ['tests/api/**/*.test.ts'],
          setupFiles: ['tests/helpers/ambiente.ts', 'tests/helpers/mockPrisma.ts'],
          environment: 'node',
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
      reporter: ['text-summary', 'text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})
