import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { router } from '@/lib/router'
import { revalidateSession } from '@/features/auth/api'
import { installSessionEffects } from '@/features/auth/session-effects'
import './index.css'

// O mock (MSW) é o backend da aplicação, inclusive em produção.
// Nada renderiza antes do service worker estar pronto para interceptar.
async function enableMocking() {
  const { worker, bootMockServer } = await import('@/mocks/browser')
  bootMockServer()
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
  })
}

enableMocking().then(() => {
  installSessionEffects(router)
  void revalidateSession()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
})
