import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import deleteIcon from '@/assets/icons/delete.svg'
import deleteIconMobile from '@/assets/icons/mobile/delete.svg'
import minusIcon from '@/assets/icons/minus-sm.svg'
import plusIcon from '@/assets/icons/mobile/plus-sm.svg'
import minusRound from '@/assets/icons/mobile/minus-round.svg'
import minusRoundDisabled from '@/assets/icons/mobile/minus-round-disabled.svg'
import { ethCompare, ethMul, formatEth } from '@/lib/eth'
import type { CartItem, QuoteIssue } from '@/types/api'
import { useRemoveCartItem, useUpdateCartItem } from '../api'

function limits(item: CartItem) {
  return Math.min(item.maxPerOrder, Math.max(item.available, 0))
}

/** Avisos de preço/estoque que mudaram desde a inclusão (REST ou tempo real). */
function ItemNotice({ item, issue }: { item: CartItem; issue?: QuoteIssue }) {
  const priceChanged = ethCompare(item.unitPriceEth, item.addedPriceEth) !== 0
  if (!issue && !priceChanged) return null
  return (
    <p className="text-xs/4 text-destructive" role="status">
      {issue
        ? issue.message
        : `Preço atualizado: era ${formatEth(item.addedPriceEth)}, agora ${formatEth(item.unitPriceEth)}.`}
    </p>
  )
}

function useItemActions(item: CartItem) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const max = limits(item)
  const busy = update.isPending || remove.isPending
  return {
    busy,
    canDecrease: !busy && item.quantity > 1,
    // Acima do estoque atual só deixa diminuir.
    canIncrease: !busy && item.quantity < max,
    setQuantity: (quantity: number) => update.mutate({ itemId: item.id, quantity }),
    remove: () => remove.mutate(item.id),
  }
}

function DesktopRow({ item, issue }: { item: CartItem; issue?: QuoteIssue }) {
  const actions = useItemActions(item)
  return (
    <li className={cn('flex min-h-[70px] items-center justify-between bg-surface-card pr-6', actions.busy && 'opacity-70')}>
      <div className="flex w-[250px] items-center gap-4">
        <img src={item.image.thumb} alt={item.image.alt} width={70} height={70} className="size-[70px] shrink-0 rounded-md object-cover" />
        <div className="flex min-w-0 flex-col gap-1.5 leading-4">
          <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="truncate text-base font-bold text-foreground hover:text-text-accent">
            {item.nftName}
          </Link>
          <p className="text-sm text-secondary">Edição: {item.editionName}</p>
          <ItemNotice item={item} issue={issue} />
        </div>
      </div>
      <p className="w-[77px] text-base/4 font-bold text-text-secondary">{formatEth(item.unitPriceEth)}</p>
      <div className="flex w-[75px] items-center justify-between" role="group" aria-label={`Quantidade de ${item.nftName}`}>
        <button
          type="button"
          aria-label="Diminuir quantidade"
          disabled={!actions.canDecrease}
          onClick={() => actions.setQuantity(item.quantity - 1)}
          className="grid h-[30px] w-5 place-items-center rounded-[20px] border border-ink bg-primary drop-shadow-[0_4px_6px_rgba(20,13,10,0.15)] disabled:opacity-40"
        >
          <img src={minusIcon} alt="" width={16} height={16} />
        </button>
        <output aria-live="polite" className="text-[17px]/6 text-foreground">
          {item.quantity}
        </output>
        <button
          type="button"
          aria-label="Aumentar quantidade"
          disabled={!actions.canIncrease}
          onClick={() => actions.setQuantity(item.quantity + 1)}
          className="grid h-[30px] w-5 place-items-center rounded-[20px] border border-ink bg-primary drop-shadow-[0_4px_6px_rgba(20,13,10,0.15)] disabled:opacity-40"
        >
          <img src={plusIcon} alt="" width={16} height={16} />
        </button>
      </div>
      <p className="w-[87px] text-base/4 font-bold text-text-accent">{formatEth(ethMul(item.unitPriceEth, item.quantity))}</p>
      <button
        type="button"
        aria-label={`Remover ${item.nftName} (${item.editionName})`}
        disabled={actions.busy}
        onClick={actions.remove}
        className="grid size-6 place-items-center disabled:opacity-50"
      >
        <img src={deleteIcon} alt="" width={17.65} height={19.98} />
      </button>
    </li>
  )
}

function MobileCard({ item, issue }: { item: CartItem; issue?: QuoteIssue }) {
  const actions = useItemActions(item)
  return (
    <li
      className={cn(
        'relative flex min-h-[100px] rounded-[14px] bg-surface-card shadow-[0_6px_20px_rgba(10,6,4,0.45)]',
        actions.busy && 'opacity-70',
      )}
    >
      <img src={item.image.thumb} alt={item.image.alt} width={100} height={100} className="size-[100px] shrink-0 rounded-l-[14px] object-cover" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-2 pl-[9px]">
        <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="truncate pr-7 text-[15px]/4 font-bold text-foreground">
          {item.nftName}
        </Link>
        <p className="text-sm/4 text-text-secondary">Edição: {item.editionName}</p>
        <ItemNotice item={item} issue={issue} />
        <div className="mt-auto flex items-center justify-between gap-2">
          <p className="text-lg/4 font-bold text-text-accent">{formatEth(item.unitPriceEth)}</p>
          <div className="flex items-center gap-3" role="group" aria-label={`Quantidade de ${item.nftName}`}>
            <button type="button" aria-label="Diminuir quantidade" disabled={!actions.canDecrease} onClick={() => actions.setQuantity(item.quantity - 1)}>
              <img src={actions.canDecrease ? minusRound : minusRoundDisabled} alt="" width={24} height={24} />
            </button>
            <output aria-live="polite" className="text-base/[22px] text-foreground">
              {item.quantity}
            </output>
            <button
              type="button"
              aria-label="Aumentar quantidade"
              disabled={!actions.canIncrease}
              onClick={() => actions.setQuantity(item.quantity + 1)}
              className="grid size-6 place-items-center rounded-full border border-border bg-[#2f1d15] text-[21px]/4 text-foreground disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        aria-label={`Remover ${item.nftName} (${item.editionName})`}
        disabled={actions.busy}
        onClick={actions.remove}
        className="absolute top-2.5 right-2.5 grid size-7 place-items-center disabled:opacity-50"
      >
        <img src={deleteIconMobile} alt="" width={17.65} height={19.98} />
      </button>
    </li>
  )
}

export function CartItems({ items, issues }: { items: CartItem[]; issues: QuoteIssue[] }) {
  const issueFor = (id: string) => issues.find((i) => i.itemId === id)
  return (
    <>
      <ul className="flex flex-col gap-5 md:hidden" aria-label="Itens do carrinho">
        {items.map((item) => (
          <MobileCard key={item.id} item={item} issue={issueFor(item.id)} />
        ))}
      </ul>
      <div className="hidden flex-col gap-3 md:flex">
        <div className="flex items-center justify-between border-b-[0.3px] border-primary pr-6 pb-3 text-base/4 text-foreground" aria-hidden>
          <span className="w-[250px] font-bold">NFTs</span>
          <span className="w-[77px] font-medium">Preço</span>
          <span className="w-[75px] font-bold">Edições</span>
          <span className="w-[87px] font-medium">Total</span>
          <span className="w-6" />
        </div>
        <ul className="flex flex-col gap-3" aria-label="Itens do carrinho">
          {items.map((item) => (
            <DesktopRow key={item.id} item={item} issue={issueFor(item.id)} />
          ))}
        </ul>
      </div>
    </>
  )
}
