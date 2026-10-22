import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Loader2 } from 'lucide-react'
import closeIcon from '@/assets/icons/close-accent.svg'
import thankYou from '@/assets/icons/thank-you.svg'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import type { Order } from '@/types/api'
import { providerLabel, type WalletProvider } from '@/features/checkout/storage'
import { NETWORK_LABELS, shortAddress } from '@/features/wallets/api'
import { useOrder } from '../api'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function walletProvider(orderId: string) {
  try {
    return providerLabel((sessionStorage.getItem(`kurio.order.provider:${orderId}`) ?? '') as WalletProvider)
  } catch {
    return 'Carteira'
  }
}

/** Itens e valores do snapshot do pedido: não mudam com o catálogo. */
function ReceiptLines({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b-[0.3px] border-primary pb-3 text-base/4 text-foreground" aria-hidden>
        <span className="font-bold">NFTs</span>
        <span className="flex gap-12">
          <span className="font-bold">Edições</span>
          <span className="font-medium">Subtotal</span>
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {order.lines.map((line) => (
          <li key={line.itemId} className="flex min-h-[70px] items-center justify-between gap-3 bg-surface-card">
            <div className="flex min-w-0 items-center gap-3">
              <img src={line.image.thumb} alt={line.image.alt} width={70} height={70} className="size-[70px] shrink-0 rounded-lg object-cover" />
              <div className="flex min-w-0 flex-col gap-1.5 leading-4">
                <p className="truncate text-base font-bold text-foreground">{line.nftName}</p>
                <p className="text-sm text-secondary">Edição: {line.editionName}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-6 text-right leading-4 sm:gap-12">
              <span className="text-sm text-text-secondary">(x {line.quantity})</span>
              <span className="text-lg font-bold text-text-accent">{formatEth(line.lineTotalEth)}</span>
            </div>
          </li>
        ))}
      </ul>
      <dl className="ml-auto flex w-full max-w-[321px] flex-col gap-3">
        {order.coupon && (
          <div className="flex justify-between text-[15px] text-foreground">
            <dt>Cupom {order.coupon.code}</dt>
            <dd>(-) {formatEth(order.discountEth)}</dd>
          </div>
        )}
        <div className="flex justify-between text-foreground">
          <dt className="text-[15px]">Taxa de rede</dt>
          <dd className="text-lg/4">{formatEth(order.networkFeeEth)}</dd>
        </div>
        <div className="flex justify-between font-bold">
          <dt className="text-base/4 text-foreground">Total</dt>
          <dd className="text-lg/4 text-text-accent">{formatEth(order.totalEth)}</dd>
        </div>
      </dl>
    </div>
  )
}

function ConfirmationDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const network = NETWORK_LABELS[order.network]
  return (
    <DialogPrimitive.Root defaultOpen onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/80 data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-surface-card outline-none md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[calc(100dvh-2rem)] md:w-[578px] md:-translate-x-1/2 md:-translate-y-1/2">
          <DialogPrimitive.Close aria-label="Fechar" className="absolute top-4 right-4 grid size-8 place-items-center">
            <img src={closeIcon} alt="" width={18} height={17.35} />
          </DialogPrimitive.Close>
          <header className="flex min-h-[156px] flex-col items-center justify-center gap-4 px-6 py-6">
            <img src={thankYou} alt="" width={65.16} height={80} />
            <DialogPrimitive.Title className="text-center text-base/4 font-bold text-text-secondary">
              Seus NFTs agora estão na sua carteira
            </DialogPrimitive.Title>
          </header>
          <dl className="grid grid-cols-2 gap-y-3 border-y border-primary px-6 py-3 text-text-secondary sm:flex sm:items-center sm:justify-between sm:px-9">
            <div className="sm:border-r sm:border-primary sm:pr-4">
              <dt className="text-sm/4 font-bold">ID da transação</dt>
              <dd className="text-[15px]">{order.txHash ? shortAddress(order.txHash) : '—'}</dd>
            </div>
            <div className="sm:border-r sm:border-primary sm:pr-4">
              <dt className="text-sm/4">Data</dt>
              <dd className="text-[15px]">{dateFormat.format(new Date(order.settledAt ?? order.createdAt))}</dd>
            </div>
            <div className="sm:border-r sm:border-primary sm:pr-4">
              <dt className="text-sm/4">Total</dt>
              <dd className="text-[15px]">{formatEth(order.totalEth)}</dd>
            </div>
            <div>
              <dt className="text-sm/4 font-bold">Carteira</dt>
              <dd className="text-[15px]">{walletProvider(order.id)}</dd>
            </div>
          </dl>
          <div className="flex flex-1 flex-col gap-3 px-6 pt-5 pb-12 sm:px-11">
            <h2 className="text-[15px]/4 font-bold text-foreground">Detalhes da transação</h2>
            <ReceiptLines order={order} />
            <DialogPrimitive.Description className="mt-3 border-t-[0.3px] border-primary pt-3 text-center text-sm/[22px] text-text-secondary">
              Transação confirmada na {network}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
            </DialogPrimitive.Description>
            {order.explorerUrl && (
              <a
                href={order.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 self-center rounded-[5px] bg-primary p-4 text-base/4 font-bold text-ink hover:bg-text-accent"
              >
                Ver no explorador ({network})
                <span className="sr-only"> (simulado, abre em nova aba)</span>
              </a>
            )}
          </div>
          <span className="h-2.5 shrink-0 bg-primary" aria-hidden />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function OrderPage({ orderId }: { orderId: string }) {
  const order = useOrder(orderId)
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  if (order.isPending) {
    return (
      <div className="flex flex-col gap-4 py-8" aria-busy="true" aria-label="Carregando pedido">
        <Skeleton className="h-8 w-64 bg-surface-card" />
        <Skeleton className="h-[70px] bg-surface-card" />
        <Skeleton className="h-[70px] bg-surface-card" />
      </div>
    )
  }
  if (order.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 py-16">
        <h1 className="text-[28px] font-bold text-foreground">Pedido não encontrado</h1>
        <Link to="/" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-ink">
          Voltar ao início
        </Link>
      </div>
    )
  }

  const data = order.data
  return (
    <div className="flex flex-col gap-6 pb-16 md:pb-24">
      <nav aria-label="Trilha" className="text-[15px]/4 font-bold text-foreground">
        <Link to="/" className="hover:text-text-accent">
          Início
        </Link>
        {' / Pedido '}
        <span aria-current="page">{data.id}</span>
      </nav>

      <section aria-live="polite" className="flex flex-col gap-2 rounded-md bg-surface-card p-5">
        {data.status === 'pending' && (
          <>
            <h1 className="flex items-center gap-3 text-xl font-bold text-foreground">
              <Loader2 className="size-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
              Aguardando confirmação na rede
            </h1>
            <p className="text-sm text-text-secondary">
              Seu pedido foi criado e está sendo processado. Você pode recarregar a página: o status será recuperado sem criar outra compra.
            </p>
          </>
        )}
        {data.status === 'confirmed' && (
          <>
            <h1 className="text-xl font-bold text-foreground">Pedido confirmado</h1>
            <p className="text-sm text-text-secondary">Transação {data.txHash && shortAddress(data.txHash)} registrada na {NETWORK_LABELS[data.network]}.</p>
          </>
        )}
        {data.status === 'declined' && (
          <>
            <h1 className="text-xl font-bold text-destructive">Pagamento recusado</h1>
            <p className="text-sm text-text-secondary">
              {data.failureReason ?? 'A carteira recusou o pagamento.'} Seus itens continuam no carrinho.
            </p>
            <Link to="/carrinho" className="mt-2 self-start rounded-md bg-primary px-4 py-2 text-sm font-bold text-ink">
              Voltar ao carrinho
            </Link>
          </>
        )}
      </section>

      <section aria-labelledby="receipt-title" className="flex flex-col gap-3">
        <h2 id="receipt-title" className="text-[17px]/4 font-bold text-foreground">
          Itens do pedido
        </h2>
        <ReceiptLines order={data} />
      </section>

      {/* A confirmação só aparece para pedido efetivamente confirmado pela simulação. */}
      {data.status === 'confirmed' && !dismissed && (
        <ConfirmationDialog
          order={data}
          onClose={() => {
            setDismissed(true)
            navigate({ to: '/' })
          }}
        />
      )}
    </div>
  )
}
