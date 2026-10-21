import { createFileRoute } from '@tanstack/react-router'
import { validateCatalogSearch } from '@/features/catalog/search'
import { HomePage } from '@/features/home/home-page'

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  component: HomePage,
})
