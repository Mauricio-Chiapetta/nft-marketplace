import { useId, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/lib/api-error'
import { formatEth } from '@/lib/eth'
import type { Cart, Quote } from '@/types/api'
import { useApplyCoupon, useRemoveCoupon } from '../api'

interface CartSummaryProps {
  cart: Cart
  quote: Quote | undefined
  quoteLoading: boolean
  quoteError: boolean
  onRetryQuote: () => void
  onCheckout: () => void
}

export function CouponForm({ cart, variant }: { cart: Cart; variant: 'desktop' | 'mobile' }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const errorId = `${inputId}-error`

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const value = code.trim()
    if (!value) {
      setError('Informe o código do cupom.')
      return
    }
    setError(null)
    apply.mutate(value.toUpperCase(), {
      onSuccess: () => setCode(''),
      onError: (err) => {
        const apiError = toApiError(err)
        setError(apiError.fields?.code ?? apiError.message)
      },
    })
  }

  if (cart.couponCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[3px] border border-primary px-3 py-2 text-sm">
        <span className="text-foreground">
          Cupom <strong className="text-text-accent">{cart.couponCode}</strong> aplicado
        </span>
        <button
          type="button"
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          aria-label={`Remover cupom ${cart.couponCode}`}
          className="grid size-6 place-items-center text-text-secondary hover:text-foreground disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  const mobile = variant === 'mobile'
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-1">
      <label htmlFor={inputId} className={cn('text-sm/4 font-bold text-foreground', mobile ? 'sr-only' : 'mb-1')}>
        Código promocional
      </label>
      <div
        className={cn(
          'flex items-center overflow-hidden border',
          mobile
            ? 'h-[50px] rounded-[40px] border-border bg-surface-card pl-4 drop-shadow-[0_6px_10px_rgba(10,6,4,0.45)]'
            : 'h-10 rounded-[3px] border-primary pl-2',
          error && 'border-destructive',
        )}
      >
        <input
          id={inputId}
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setError(null)
          }}
          placeholder="Digite o código promocional..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          className={cn('min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-secondary', mobile ? 'text-[13px]' : 'text-xs')}
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className={cn(
            'h-full shrink-0 font-bold disabled:opacity-70',
            mobile
              ? 'w-[97px] rounded-[40px] bg-[linear-gradient(96deg,rgba(210,138,76,0.54)_1%,#d28a4c_105%)] text-[15px]/4 text-foreground'
              : 'w-[102px] bg-primary text-[15px]/4 text-ink',
          )}
        >
          {apply.isPending ? '…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}

/** Valores sempre da cotação da API; o cliente só apresenta. */
export function SummaryValues({ quote, loading, error, onRetry }: { quote?: Quote; loading: boolean; error: boolean; onRetry: () => void }) {
  if (error && !quote) {
    return (
      <div role="alert" className="flex flex-col gap-2 text-sm text-text-secondary">
        Não foi possível calcular o resumo.
        <button type="button" onClick={onRetry} className="self-start text-text-accent underline-offset-4 hover:underline">
          Tentar novamente
        </button>
      </div>
    )
  }
  if (!quote) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Calculando resumo">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-28 bg-surface-dark" />
            <Skeleton className="h-4 w-20 bg-surface-dark" />
          </div>
        ))}
        <div className="flex justify-between pt-3">
          <Skeleton className="h-4 w-16 bg-surface-dark" />
          <Skeleton className="h-4 w-24 bg-surface-dark" />
        </div>
      </div>
    )
  }
  return (
    <dl className={cn('flex flex-col gap-3 transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
      <div className="flex items-start justify-between text-foreground">
        <dt className="text-[15px]">Subtotal</dt>
        <dd className="text-base/4 md:text-lg/4">{formatEth(quote.subtotalEth)}</dd>
      </div>
      <div className="flex items-start justify-between text-[15px] text-foreground">
        <dt>{quote.coupon ? `Cupom ${quote.coupon.code} (${quote.coupon.percentOff}%)` : 'Desconto do lançamento'}</dt>
        <dd>(-) {formatEth(quote.discountEth)}</dd>
      </div>
      <div className="flex flex-col items-end">
        <div className="flex w-full items-center justify-between text-foreground">
          <dt className="text-[15px]">Taxa de rede</dt>
          <dd className="text-base/4 md:text-lg/4">{formatEth(quote.networkFeeEth)}</dd>
        </div>
        <p className="text-xs/4 text-text-accent">Taxa estimada (Ethereum)</p>
      </div>
      <div className="flex items-start justify-between pt-1 font-bold">
        <dt className="text-base/4 text-foreground">Total</dt>
        <dd className="text-lg/4 text-text-accent">{formatEth(quote.totalEth)}</dd>
      </div>
    </dl>
  )
}

export function CartSummary({ cart, quote, quoteLoading, quoteError, onRetryQuote, onCheckout }: CartSummaryProps) {
  const blocked = quote ? !quote.purchasable : true
  return (
    <aside aria-labelledby="summary-title" className="flex w-full flex-col gap-6 lg:w-[332px] lg:shrink-0">
      <h2 id="summary-title" className="border-b-[0.3px] border-primary pb-3 text-lg/4 font-bold text-foreground">
        Resumo da carteira
      </h2>
      <CouponForm cart={cart} variant="desktop" />
      <SummaryValues quote={quote} loading={quoteLoading} error={quoteError} onRetry={onRetryQuote} />
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onCheckout}
          disabled={blocked || quoteLoading}
          className="h-10 w-full rounded-[3px] bg-primary text-[15px]/4 font-bold text-ink transition-colors hover:bg-text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Conectar e finalizar
        </button>
        {quote && !quote.purchasable && (
          <p className="text-center text-xs text-destructive">Ajuste os itens sem estoque para continuar.</p>
        )}
        <Link to="/" hash="produtos" className="text-[15px] text-text-accent hover:underline">
          Continuar explorando
        </Link>
      </div>
    </aside>
  )
}
