import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import arrowLeft from '@/assets/icons/mobile/arrow-left.svg'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart, useCartQuote } from '@/features/cart/api'
import { CartItems } from '@/features/cart/components/cart-items'
import { CartSummary, CouponForm, SummaryValues } from '@/features/cart/components/cart-summary'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

function CartPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const cart = useCart()
  const quote = useCartQuote(cart.data)
  const items = cart.data?.items ?? []
  // Checkout exige login: a guarda manda para o login e o carrinho do visitante é incorporado.
  const checkout = () => navigate({ to: '/checkout' })

  return (
    <div className="flex flex-col gap-3 pb-16 md:pb-24">
      <header className="relative flex h-11 items-center justify-center md:hidden">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => (window.history.length > 1 ? router.history.back() : navigate({ to: '/' }))}
          className="absolute left-0 grid size-[35px] place-items-center rounded-full border border-border bg-[#2f1d15]"
        >
          <img src={arrowLeft} alt="" width={13.17} height={7.33} className="rotate-90" />
        </button>
        <h1 className="text-xl/4 font-bold text-foreground">Carrinho de NFTs</h1>
      </header>

      <nav aria-label="Trilha" className="hidden text-[15px]/4 font-bold text-foreground md:block">
        <Link to="/" className="hover:text-text-accent">
          Início
        </Link>
        {' / '}
        <Link to="/" hash="produtos" className="hover:text-text-accent">
          Mercado
        </Link>
        {' / '}
        <span aria-current="page">Carrinho</span>
      </nav>
      <h1 className="sr-only max-md:hidden">Carrinho de NFTs</h1>

      {cart.isPending ? (
        <CartSkeleton />
      ) : cart.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 bg-surface-card p-6">
          <p className="text-foreground">Não foi possível carregar o carrinho.</p>
          <button type="button" onClick={() => cart.refetch()} className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-ink">
            Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-4 bg-surface-card p-8">
          <p className="text-lg font-bold text-foreground">Seu carrinho está vazio.</p>
          <p className="text-sm text-text-secondary">Explore o mercado e adicione NFTs para continuar.</p>
          <Link to="/" hash="produtos" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-ink">
            Explorar NFTs
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 lg:w-[782px]">
            <CartItems items={items} issues={quote.data?.issues ?? []} />
          </div>
          <div className="hidden md:block">
            <CartSummary
              cart={cart.data}
              quote={quote.data}
              quoteLoading={quote.isFetching}
              quoteError={quote.isError}
              onRetryQuote={() => quote.refetch()}
              onCheckout={checkout}
            />
          </div>

          {/* Mobile: resumo fixo no rodapé, como no frame Mobile / Carrinho */}
          <section
            aria-label="Resumo do pagamento"
            className="-mx-6 mt-2 flex flex-col gap-3 rounded-t-[40px] bg-surface-card px-6 pt-6 pb-9 md:hidden"
          >
            <CouponForm cart={cart.data} variant="mobile" />
            <SummaryValues quote={quote.data} loading={quote.isFetching} error={quote.isError} onRetry={() => quote.refetch()} />
            <button
              type="button"
              onClick={checkout}
              disabled={!quote.data?.purchasable || quote.isFetching}
              className="mt-4 h-[60px] rounded-[40px] bg-[linear-gradient(109deg,#d28a4c_4%,rgba(210,138,76,0.8)_122%)] text-base/4 font-bold text-ink disabled:opacity-50"
            >
              Conectar e finalizar
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:justify-between" aria-busy="true" aria-label="Carregando carrinho">
      <div className="flex flex-col gap-3 lg:w-[782px]">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[100px] rounded-[14px] bg-surface-card md:h-[70px] md:rounded-none" />
        ))}
      </div>
      <div className="flex flex-col gap-4 lg:w-[332px]">
        <Skeleton className="h-5 w-40 bg-surface-card" />
        <Skeleton className="h-10 bg-surface-card" />
        <Skeleton className="h-28 bg-surface-card" />
        <Skeleton className="h-10 bg-surface-card" />
      </div>
    </div>
  )
}
