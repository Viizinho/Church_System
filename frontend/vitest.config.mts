import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

/** Testes do frontend: funções utilitárias, componentes e páginas (React Testing Library + jsdom). */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['src/test/setup.ts'],
      // Datas dos testes no fuso de João Pessoa, igual ao uso real
      env: { TZ: 'America/Fortaleza' },
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/types/**', 'src/vite-env.d.ts'],
        reporter: ['text-summary', 'text', 'html', 'json-summary'],
        reportsDirectory: 'coverage',
      },
    },
  })
)
