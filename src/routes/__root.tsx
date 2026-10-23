import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/sonner'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { NotFound } from '@/components/layout/not-found'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <>
      <div className="mx-auto flex min-h-dvh w-full max-w-[1248px] flex-col gap-4 px-6 pt-10 pb-[134px] md:gap-8 md:pt-6 md:pb-6">
        <SiteHeader />
        {/* min-h-dvh: o footer começa abaixo da dobra e não é empurrado quando o conteúdo carrega (CLS). */}
        <main className="min-h-dvh flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <MobileTabBar />
      <Toaster theme="dark" position="top-center" />
      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools buttonPosition="bottom-right" />
        </>
      )}
    </>
  )
}
