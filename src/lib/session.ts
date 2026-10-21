import { useSyncExternalStore } from 'react'
import type { Session } from '@/types/api'

// Sessão do usuário: só token, validade e dados públicos (a senha nunca é guardada).
// Persistida no localStorage para sobreviver ao refresh; a API continua sendo a
// fonte da verdade e pode invalidá-la a qualquer momento.

const STORAGE_KEY = 'kurio.session'

export type SessionEndReason = 'logout' | 'expired'
type Listener = () => void
type EndListener = (reason: SessionEndReason) => void

function read(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function write(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Armazenamento indisponível: a sessão vale só para esta aba.
  }
}

let current = read()
let expiryTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<Listener>()
const endListeners = new Set<EndListener>()

export function isExpired(session: Session, now = Date.now()) {
  return Date.parse(session.expiresAt) <= now
}

function emit() {
  for (const listener of listeners) listener()
}

function scheduleExpiry() {
  clearTimeout(expiryTimer)
  if (!current) return
  // setTimeout aceita no máximo ~24,8 dias; sessões do mock duram minutos.
  const ms = Math.max(0, Date.parse(current.expiresAt) - Date.now())
  expiryTimer = setTimeout(() => sessionStore.end('expired'), Math.min(ms, 2 ** 31 - 1))
}

export const sessionStore = {
  get: () => current,

  /** Sessão válida no momento, ou null (encerrando-a se já expirou). */
  getValid(): Session | null {
    if (current && isExpired(current)) sessionStore.end('expired')
    return current
  },

  set(session: Session) {
    current = session
    write(session)
    scheduleExpiry()
    emit()
  },

  updateUser(user: Session['user']) {
    if (!current) return
    sessionStore.set({ ...current, user })
  },

  /** `persist: false` quando o fim veio de outra aba (o storage já mudou). */
  end(reason: SessionEndReason, { persist = true } = {}) {
    if (!current) return
    current = null
    if (persist) write(null)
    clearTimeout(expiryTimer)
    emit()
    for (const listener of endListeners) listener(reason)
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  onEnd(listener: EndListener) {
    endListeners.add(listener)
    return () => endListeners.delete(listener)
  },
}

scheduleExpiry()

// Login/logout em outra aba refletem nesta.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    const next = read()
    // Troca de usuário em outra aba também descarta o estado privado do anterior.
    if (current && (!next || next.user.id !== current.user.id)) {
      sessionStore.end('logout', { persist: false })
    }
    if (next) {
      current = next
      scheduleExpiry()
      emit()
    }
  })
}

export function useSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
}
