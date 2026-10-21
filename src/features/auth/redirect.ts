// Rotas que exigem sessão. A guarda fica no layout `_authed`; esta lista serve
// para decidir para onde voltar quando a sessão acaba ou o modal é fechado.
const PROTECTED_PREFIXES = ['/perfil', '/carteiras', '/pedidos', '/checkout']

export function isProtectedPath(path: string) {
  const pathname = path.split(/[?#]/)[0]
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** Aceita só caminhos internos, evitando open redirect (`//evil.com`, `https://...`). */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return undefined
  if (value.startsWith('/entrar') || value.startsWith('/criar-conta')) return undefined
  return value
}

export const authSearch = (search: Record<string, unknown>): { redirect?: string } => {
  const redirect = safeRedirect(search.redirect)
  return redirect ? { redirect } : {}
}
