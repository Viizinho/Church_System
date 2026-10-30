import { useEffect } from 'react'

/** Título da aba: "Membros · Gestão Igreja". Ajuda a navegar entre abas e leitores de tela. */
export function usePageTitle(titulo: string) {
  useEffect(() => {
    document.title = `${titulo} · Gestão Igreja`
  }, [titulo])
}
