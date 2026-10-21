import { useEffect, useRef, useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { X } from 'lucide-react'
import searchIcon from '@/assets/icons/search.svg'
import { validateCatalogSearch, withFilter } from '@/features/catalog/search'

const DEBOUNCE_MS = 300

/** Busca do header: abre sobre a linha do header e atualiza `?q=` na Início. */
export function HeaderSearch() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const current = location.pathname === '/' ? validateCatalogSearch(location.search) : {}
  const [open, setOpen] = useState(Boolean(current.q))
  const [text, setText] = useState(current.q ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Sincroniza quando a URL muda por fora (voltar, limpar filtros).
  const urlQ = current.q ?? ''
  const [lastUrlQ, setLastUrlQ] = useState(urlQ)
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ)
    setText(urlQ)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  function search(q: string, replace: boolean) {
    clearTimeout(timer.current)
    navigate({
      to: '/',
      search: withFilter(current, { q: q.trim() || undefined }),
      hash: 'produtos',
      resetScroll: false,
      // Digitação substitui a entrada do histórico; Enter cria uma nova.
      replace,
    })
  }

  function onChange(value: string) {
    setText(value)
    clearTimeout(timer.current)
    // Fora da Início só busca no Enter, para não trocar de página a cada tecla.
    if (location.pathname === '/') timer.current = setTimeout(() => search(value, true), DEBOUNCE_MS)
  }

  function close() {
    setOpen(false)
    if (text) {
      setText('')
      if (current.q) search('', true)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Buscar"
        aria-expanded={false}
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        className="grid size-6 place-items-center"
      >
        <img src={searchIcon} alt="" width={20} height={20} />
      </button>
    )
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        search(text, false)
      }}
      className="absolute inset-x-0 top-0 z-10 flex h-[35px] items-center gap-3 rounded-md border border-primary bg-surface-card px-3"
    >
      <img src={searchIcon} alt="" width={16} height={16} />
      <label htmlFor="header-search" className="sr-only">
        Buscar NFTs, coleções ou criadores
      </label>
      <input
        ref={inputRef}
        id="header-search"
        type="search"
        autoFocus
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        placeholder="Buscar NFTs, coleções ou criadores"
        maxLength={80}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-secondary [&::-webkit-search-cancel-button]:hidden"
      />
      <button type="button" onClick={close} aria-label="Fechar busca" className="grid size-6 place-items-center text-text-secondary">
        <X className="size-4" />
      </button>
    </form>
  )
}
