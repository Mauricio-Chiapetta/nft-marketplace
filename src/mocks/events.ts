// Barramento de eventos de domínio do mock. Mutações do DB publicam aqui;
// o servidor Socket.IO simulado (fase 4) assina e repassa aos clientes.
import type { RealtimeEvent } from '@/types/api'

type Listener = (event: RealtimeEvent) => void

const HISTORY_LIMIT = 100
const listeners = new Set<Listener>()
const history: RealtimeEvent[] = []

export function publish(event: RealtimeEvent) {
  history.push(event)
  if (history.length > HISTORY_LIMIT) history.shift()
  for (const listener of listeners) listener(event)
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Eventos recentes, para reenvio de duplicatas/antigos nos testes. */
export function recentEvents(): readonly RealtimeEvent[] {
  return history
}

export function clearEventHistory() {
  history.length = 0
}
