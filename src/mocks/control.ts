// Controles do mock para demonstração e testes E2E, expostos em `window.__mock`.
// Pertencem ao "servidor" simulado: o código da aplicação nunca os importa.
import type { RealtimeEvent } from '@/types/api'
import { getDb, mutate, resetDb } from './db'
import { clearEventHistory, publish, recentEvents } from './events'
import { getScenario, setScenario, type ScenarioName } from './scenario'
import { updateNftEditions, type EditionPatch } from './services/catalog'
import { armPendingOrders, clearSettlementTimers, settleOrder } from './services/orders'

export function resetMock() {
  clearSettlementTimers()
  resetDb()
  clearEventHistory()
  setScenario('default')
  armPendingOrders()
}

export const mockControl = {
  /** Restaura o seed, limpa cenário, timers e histórico de eventos. */
  reset: resetMock,
  getScenario,
  setScenario: (name: ScenarioName, target?: string | null) => setScenario(name, target ?? null),
  /** Altera preço/disponibilidade pelo mesmo caminho do servidor (emite nft.updated). */
  updateNft: (nftId: string, patches: EditionPatch[]) => structuredClone(updateNftEditions(nftId, patches)),
  /** Expira todas as sessões ativas. */
  expireSessions: () =>
    mutate((db) => {
      const past = new Date(Date.now() - 1000).toISOString()
      for (const session of db.sessions) session.expiresAt = past
    }),
  settleOrder: (orderId: string, outcome?: 'confirmed' | 'declined') => structuredClone(settleOrder(orderId, outcome)),
  /** Eventos já publicados (para reenviar duplicatas ou versões antigas). */
  recentEvents: () => structuredClone(recentEvents()),
  /** Republica um evento existente, como faria um servidor com entrega duplicada. */
  replayEvent: (event: RealtimeEvent) => publish(structuredClone(event)),
  snapshot: () => structuredClone(getDb()),
}

export type MockControl = typeof mockControl

declare global {
  interface Window {
    __mock?: MockControl
  }
}
