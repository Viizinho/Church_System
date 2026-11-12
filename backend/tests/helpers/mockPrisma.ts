import { vi } from 'vitest'

// Nos testes de API, o `prisma` da aplicação passa a ser o banco em memória.
vi.mock('../../src/utils/prisma', async () => ({ default: (await import('./banco')).banco.prisma }))
