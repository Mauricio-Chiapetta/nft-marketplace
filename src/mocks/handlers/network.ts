// Primeiro handler da cadeia: aplica latência e falhas do cenário ativo a
// todas as rotas /api. Sem retorno, a requisição segue para o handler da rota.
import { HttpResponse, delay, http } from 'msw'
import { apiError } from '../http'
import { getScenario, targetMatches } from '../scenario'

const DEFAULT_LATENCY_MS = 120
const SLOW_LATENCY_MS = 2500

/** Latência determinística: buscas mais curtas demoram mais, então chegam fora de ordem. */
function variableLatency(request: Request): number {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')
  if (q !== null) return 1800 - Math.min(q.length, 4) * 400
  let hash = 0
  for (const ch of url.pathname + url.search) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return 200 + (hash % 1200)
}

export const networkHandlers = [
  http.all('/api/*', async ({ request }) => {
    const { name } = getScenario()
    if (!targetMatches(request)) {
      await delay(DEFAULT_LATENCY_MS)
      return
    }

    switch (name) {
      case 'slow':
        await delay(SLOW_LATENCY_MS)
        return
      case 'variable':
        await delay(variableLatency(request))
        return
      case 'error':
        await delay(DEFAULT_LATENCY_MS)
        return apiError(500, 'INTERNAL_ERROR', 'Erro inesperado no servidor. Tente novamente.')
      case 'unavailable':
        await delay(DEFAULT_LATENCY_MS)
        return apiError(503, 'SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível.')
      case 'offline':
        return HttpResponse.error()
      case 'timeout':
        await delay('infinite')
        return
      default:
        await delay(DEFAULT_LATENCY_MS)
    }
  }),
]
