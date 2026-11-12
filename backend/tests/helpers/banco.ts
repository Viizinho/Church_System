import { criarBancoEmMemoria } from './bancoEmMemoria'

/** Instância única do banco em memória, compartilhada pelo mock do Prisma e pelo arquivo de teste. */
export const banco = criarBancoEmMemoria()
