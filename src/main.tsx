// Primeiro: tira os parâmetros do mock da URL antes de o router lê-la.
import { mockResetRequested } from '@/mocks/url-flags'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { markBackendReady } from '@/lib/backend'
import { queryClient } from '@/lib/query-client'
import { router } from '@/lib/router'
import { revalidateSession } from '@/features/auth/api'
import { installSessionEffects } from '@/features/auth/session-effects'
import './index.css'

// O mock (MSW) é o backend da aplicação, inclusive em produção. A interface
// renderiza em paralelo; as requisições do Axios esperam o service worker.
async function enableMocking() {
  const { worker, bootMockServer } = await import('@/mocks/browser')
  bootMockServer(mockResetRequested)
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    onUnhandledRequest: 'bypass',
    // O log do MSW imprime corpos de request (inclusive senhas); só com ?mockLog em dev.
    quiet: import.meta.env.PROD || !new URLSearchParams(window.location.search).has('mockLog'),
  })
}

installSessionEffects(router)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

enableMocking().then(async () => {
  markBackendReady()
  // Import dinâmico: o engine.io-client guarda a referência a WebSocket ao carregar,
  // então o socket.io-client só pode ser avaliado depois que o MSW a interceptou.
  const { installRealtime } = await import('@/features/realtime/realtime')
  installRealtime(queryClient)
  void revalidateSession()
})
