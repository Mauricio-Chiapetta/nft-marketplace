import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string }>('/health').then((r) => r.data),
  })

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-3xl font-semibold">NFT Marketplace</h1>
      <p data-testid="api-status" className="text-muted-foreground">
        API mock: {health.isPending ? 'carregando…' : (health.data?.status ?? 'erro')}
      </p>
      <Button>Setup ok</Button>
    </main>
  )
}
