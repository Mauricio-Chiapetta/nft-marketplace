import { setupWorker } from 'msw/browser'
import { mockControl, resetMock } from './control'
import { handlers } from './handlers'
import { initScenarioFromUrl } from './scenario'
import { armPendingOrders } from './services/orders'

export const worker = setupWorker(...handlers)

/**
 * Prepara o "servidor" simulado antes do primeiro request:
 * - `?scenario=<nome>[&target=...]` seleciona o cenário da aba;
 * - `?mockReset` restaura o seed e é removido da URL (refresh não reseta de novo).
 */
export function bootMockServer() {
  const url = new URL(window.location.href)
  if (url.searchParams.has('mockReset')) {
    resetMock()
    url.searchParams.delete('mockReset')
    window.history.replaceState(window.history.state, '', url)
  }
  initScenarioFromUrl(url.search)
  armPendingOrders()
  window.__mock = mockControl
}
