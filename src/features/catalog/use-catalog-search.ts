import { useNavigate, useSearch } from '@tanstack/react-router'
import { validateCatalogSearch, withFilter, type CatalogSearch } from './search'

/** Lê e atualiza o estado do catálogo na URL da Início. */
export function useCatalogSearch() {
  // strict: false porque a Início também aparece atrás do modal de login.
  const search = validateCatalogSearch(useSearch({ strict: false }))
  const navigate = useNavigate()

  const go = (next: CatalogSearch, replace = false) =>
    navigate({ to: '/', search: next, hash: 'produtos', resetScroll: false, replace })

  return {
    search,
    setFilter: (patch: Partial<CatalogSearch>) => go(withFilter(search, patch)),
    setPage: (page: number) => go(validateCatalogSearch({ ...search, page })),
    reset: () => go({}),
  }
}
