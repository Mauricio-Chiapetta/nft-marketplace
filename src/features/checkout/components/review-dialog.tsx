import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from 'cn'
import { ethCompare, formatEth } from '@/lib/eth'
import type { Quote, Wallet } from '@/types/api'
import { NETWORK_LABELS, shortAddress } from '@/features/wallets/api'
import type { CheckoutDraft } from '../storage'

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote
  /** Cotação anterior, quando a revalidação trouxe valores diferentes. */
  previous: Quote | null
  acknowledged: boolean
  onAcknowledge: () => void
  draft: CheckoutDraft
  wallet: Wallet
  providerLabel: string
  submitting: boolean
  uncertain: boolean
  error: string | null
  onConfirm: () => void
}

export function ReviewDialog(props: ReviewDialogProps) {
  const { quote, previous, acknowledged, draft, wallet, submitting, uncertain, error } = props
  const changed = previous !== null
  const blocked = !quote.purchasable || (changed && !acknowledged) || submitting

  return (
    <DialogPrimitive.Root open={props.open} onOpenChange={(open) => !submitting && props.onOpenChange(open)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/80 data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-y-auto rounded-t-[24px] bg-surface-card p-6 outline-none md:inset-auto md:top-1/2 md:left-1/2 md:w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:p-8">
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="text-lg/6 font-bold text-foreground">Revisar pedido</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Fechar revisão" disabled={submitting} className="grid size-8 place-items-center text-text-secondary">
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="mt-1 text-sm text-text-secondary">
            Confira os valores validados agora pela API antes de confirmar.
          </DialogPrimitive.Description>

          {changed && (
            <div role="alert" className="mt-4 flex flex-col gap-2 rounded-md border border-[#f0805f]/60 bg-[#f0805f]/10 p-3 text-sm text-foreground">
              <p className="font-bold">Preço, disponibilidade ou taxas mudaram desde a última cotação.</p>
              <p>
                Total anterior {formatEth(previous.totalEth)} → novo total <strong>{formatEth(quote.totalEth)}</strong>.
              </p>
              {!acknowledged && (
                <button
                  type="button"
                  onClick={props.onAcknowledge}
                  className="self-start rounded-md border border-primary px-3 py-1.5 text-sm font-bold text-text-accent"
                >
                  Aceitar novos valores
                </button>
              )}
            </div>
          )}

          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-secondary">Comprador</dt>
            <dd className="text-right text-foreground">
              {draft.fullName} · {draft.email}
            </dd>
            <dt className="text-text-secondary">Carteira</dt>
            <dd className="text-right text-foreground">
              {wallet.label} ({shortAddress(wallet.address)}) · {props.providerLabel}
            </dd>
            <dt className="text-text-secondary">Rede</dt>
            <dd className="text-right text-foreground">{NETWORK_LABELS[quote.network]}</dd>
          </dl>

          <ul className="mt-5 flex flex-col gap-2 border-t-[0.3px] border-primary pt-4">
            {quote.lines.map((line) => {
              const before = previous?.lines.find((l) => l.itemId === line.itemId)
              const priceChanged = before && ethCompare(before.unitPriceEth, line.unitPriceEth) !== 0
              const issue = quote.issues.find((i) => i.itemId === line.itemId)
              return (
                <li key={line.itemId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-foreground">
                    {line.nftName} · {line.editionName} (x {line.quantity})
                  </span>
                  <span className={cn('shrink-0 font-bold', priceChanged ? 'text-[#f0805f]' : 'text-text-accent')}>
                    {formatEth(line.lineTotalEth)}
                    {priceChanged && <span className="sr-only"> (preço alterado)</span>}
                  </span>
                  {issue && <span className="sr-only">{issue.message}</span>}
                </li>
              )
            })}
          </ul>
          {quote.issues.map((issue) => (
            <p key={issue.itemId} className="mt-2 text-xs text-destructive">
              {issue.message}
            </p>
          ))}

          <dl className="mt-4 flex flex-col gap-2 text-[15px] text-foreground">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatEth(quote.subtotalEth)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{quote.coupon ? `Cupom ${quote.coupon.code}` : 'Desconto'}</dt>
              <dd>(-) {formatEth(quote.discountEth)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd>{formatEth(quote.networkFeeEth)}</dd>
            </div>
            <div className="flex justify-between border-t-[0.3px] border-primary pt-3 font-bold">
              <dt>Total</dt>
              <dd className="text-lg/4 text-text-accent">{formatEth(quote.totalEth)}</dd>
            </div>
          </dl>

          {error && (
            <p role="alert" className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={props.onConfirm}
            disabled={blocked}
            aria-busy={submitting}
            className="mt-6 h-[45px] rounded-lg bg-primary text-[15px]/4 font-bold text-ink transition-colors hover:bg-text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Enviando pedido…' : uncertain ? 'Verificar pedido (mesma tentativa)' : 'Confirmar compra'}
          </button>
          {!quote.purchasable && (
            <p className="mt-2 text-center text-xs text-destructive">Há itens sem estoque. Ajuste o carrinho para continuar.</p>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
