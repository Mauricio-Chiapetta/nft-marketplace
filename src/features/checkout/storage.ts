import type { Network, OrderInput } from '@/types/api'

// Contexto do checkout em sessionStorage, por usuário:
// - draft: o formulário, para retomar após expiração de sessão ou refresh;
// - attempt: a tentativa de pedido em andamento (chave de idempotência + corpo).
//   Reenviar a mesma tentativa recupera o mesmo pedido em vez de criar outro.

export type WalletProvider = 'walletconnect' | 'metamask' | 'coinbase'

export const PROVIDERS: { value: WalletProvider; label: string }[] = [
  { value: 'walletconnect', label: 'WalletConnect' },
  { value: 'metamask', label: 'MetaMask' },
  { value: 'coinbase', label: 'Coinbase Wallet' },
]

export const providerLabel = (value: WalletProvider | '') => PROVIDERS.find((p) => p.value === value)?.label ?? 'Carteira'

export interface CheckoutDraft {
  fullName: string
  username: string
  email: string
  network: Network | ''
  walletId: string
  provider: WalletProvider | ''
  secondary: string
  note: string
}

export interface OrderAttempt {
  key: string
  body: OrderInput
  provider: WalletProvider | ''
}

const draftKey = (userId: string) => `kurio.checkout.draft:${userId}`
const attemptKey = (userId: string) => `kurio.checkout.attempt:${userId}`

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sem armazenamento: o checkout funciona, só não sobrevive ao refresh.
  }
}

export const checkoutStorage = {
  readDraft: (userId: string) => read<CheckoutDraft>(draftKey(userId)),
  saveDraft: (userId: string, draft: CheckoutDraft) => write(draftKey(userId), draft),
  clearDraft: (userId: string) => write(draftKey(userId), null),
  readAttempt: (userId: string) => read<OrderAttempt>(attemptKey(userId)),
  saveAttempt: (userId: string, attempt: OrderAttempt) => write(attemptKey(userId), attempt),
  clearAttempt: (userId: string) => write(attemptKey(userId), null),
}

/** Mesmo conteúdo = mesma tentativa (mesma chave); conteúdo diferente = chave nova. */
export function sameOrderInput(a: OrderInput, b: OrderInput) {
  return (
    a.quoteId === b.quoteId &&
    a.walletId === b.walletId &&
    a.network === b.network &&
    a.buyer.fullName === b.buyer.fullName &&
    a.buyer.email === b.buyer.email
  )
}
