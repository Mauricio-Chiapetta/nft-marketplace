import { useEffect, useRef, useState } from 'react'
import searchIcon from '@/assets/icons/mobile/search.svg'
import { useCatalogSearch } from '../use-catalog-search'

const DEBOUNCE_MS = 300

/** Campo de busca do topo mobile (Figma: "Explorar coleções"). */
export function CatalogSearchInput() {
  const { search, setFilter } = useCatalogSearch()
  const [text, setText] = useState(search.q ?? '')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Acompanha mudanças externas da URL (limpar busca, voltar no histórico).
  const [lastQ, setLastQ] = useState(search.q ?? '')
  if ((search.q ?? '') !== lastQ) {
    setLastQ(search.q ?? '')
    setText(search.q ?? '')
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        clearTimeout(timer.current)
        setFilter({ q: text.trim() || undefined })
      }}
      className="flex h-[45px] min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-surface-card px-3"
    >
      <img src={searchIcon} alt="" width={22} height={22} />
      <label htmlFor="mobile-search" className="sr-only">
        Explorar coleções
      </label>
      <input
        id="mobile-search"
        type="search"
        value={text}
        maxLength={80}
        placeholder="Explorar coleções"
        onChange={(e) => {
          const value = e.target.value
          setText(value)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => setFilter({ q: value.trim() || undefined }), DEBOUNCE_MS)
        }}
        className="min-w-0 flex-1 bg-transparent text-sm font-bold leading-4 text-foreground outline-none placeholder:text-secondary [&::-webkit-search-cancel-button]:hidden"
      />
    </form>
  )
}
