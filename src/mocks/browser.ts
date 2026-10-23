import { setupWorker } from 'msw/browser'
import { mockControl, resetMock } from './control'
import { handlers } from './handlers'
import { initScenarioFromUrl } from './scenario'
import { armPendingOrders } from './services/orders'

export const worker = setupWorker(...handlers)

/**
 * Prepara o "servidor" simulado antes do primeiro request:
 * - `?scenario=<nome>[&target=...]` seleciona o cenário da aba;
 * - `?mockReset` (já retirado da URL por ./url-flags) restaura o seed.
 */
export function bootMockServer(reset: boolean) {
  if (reset) resetMock()
  initScenarioFromUrl(window.location.search)
  armPendingOrders()
  window.__mock = mockControl
}
