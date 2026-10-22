// Identidade do visitante para o carrinho sem login (cabeçalho X-Guest-Id).
// Fica no localStorage para o carrinho sobreviver ao refresh.

const STORAGE_KEY = 'kurio.guestId'
let memory: string | null = null

export function getGuestId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && /^[\w-]{8,64}$/.test(stored)) return stored
    const created = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, created)
    return created
  } catch {
    // Sem armazenamento: vale enquanto a aba estiver aberta.
    memory ??= crypto.randomUUID()
    return memory
  }
}
