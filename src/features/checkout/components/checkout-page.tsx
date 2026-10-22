import { useEffect, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import radioOff from '@/assets/icons/radio-off.svg'
import radioOn from '@/assets/icons/radio-on.svg'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/lib/api-error'
import { formatEth } from '@/lib/eth'
import type { Session } from '@/types/api'
import type { Network, Quote, Wallet } from '@/types/api'
import { useCart, useCartQuote } from '@/features/cart/api'
import { SummaryValues } from '@/features/cart/components/cart-summary'
import { NETWORK_LABELS, shortAddress, useConnectWallet, useDisconnectWallet, useWallets } from '@/features/wallets/api'
import { isUncertain, revalidateQuote, usePlaceOrder } from '../api'
import { PROVIDERS, checkoutStorage, providerLabel, sameOrderInput, type CheckoutDraft, type OrderAttempt } from '../storage'
import { Field, SelectBox, inputClass } from './field'
import { ReviewDialog } from './review-dialog'


const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type Errors = Partial<Record<keyof CheckoutDraft, string>>

function validate(draft: CheckoutDraft, walletId: string): Errors {
  const errors: Errors = {}
  if (draft.fullName.trim().length < 3) errors.fullName = 'Informe o nome completo.'
  if (draft.username.trim().length < 3) errors.username = 'Informe o nome de usuário.'
  if (!EMAIL_PATTERN.test(draft.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!draft.network) errors.network = 'Selecione uma rede.'
  if (!walletId) errors.walletId = 'Selecione uma carteira cadastrada.'
  if (!draft.provider) errors.provider = 'Escolha como conectar a carteira.'
  return errors
}

function initialDraft(session: Session): CheckoutDraft {
  return (
    checkoutStorage.readDraft(session.user.id) ?? {
      fullName: session.user.name,
      username: session.user.username,
      email: session.user.email,
      network: '',
      walletId: '',
      provider: '',
      secondary: '',
      note: '',
    }
  )
}

interface ReviewState {
  quote: Quote
  previous: Quote | null
}

export function CheckoutPage({ session }: { session: Session }) {
  const userId = session.user.id
  const cart = useCart()
  const wallets = useWallets()
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const placeOrder = usePlaceOrder()

  const [draft, setDraft] = useState(() => initialDraft(session))
  const [errors, setErrors] = useState<Errors>({})
  const [connectError, setConnectError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewState | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Preserva o contexto: expiração de sessão ou refresh retomam o mesmo formulário.
  useEffect(() => checkoutStorage.saveDraft(userId, draft), [userId, draft])

  // Tentativa interrompida (refresh/queda durante o envio): reenviar a mesma chave
  // recupera o pedido já criado em vez de criar outro.
  const recovered = useRef(false)
  useEffect(() => {
    if (recovered.current) return
    recovered.current = true
    const attempt = checkoutStorage.readAttempt(userId)
    if (attempt) placeOrder.mutate(attempt)
  }, [userId, placeOrder])


  const walletList = wallets.data ?? []
  const walletId = draft.walletId || walletList.find((w) => w.role === 'primary')?.id || ''
  const wallet = walletList.find((w) => w.id === walletId)
  const network = draft.network || 'ethereum'
  const quote = useCartQuote(cart.data, network)
  const connected = Boolean(wallet && draft.network && wallet.connection?.network === draft.network)

  const set = <K extends keyof CheckoutDraft>(key: K, value: CheckoutDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function onConnect() {
    setConnectError(null)
    const found = validate(draft, walletId)
    const missing = { network: found.network, walletId: found.walletId, provider: found.provider }
    if (missing.network || missing.walletId || missing.provider) {
      setErrors((e) => ({ ...e, ...missing }))
      return
    }
    connect.mutate(
      { walletId, network: draft.network as Network },
      { onError: (error) => setConnectError(toApiError(error).message) },
    )
  }

  async function onReview(e?: FormEvent) {
    e?.preventDefault()
    const found = validate(draft, walletId)
    // Renderiza os erros antes de procurar o primeiro campo inválido.
    flushSync(() => setErrors(found))
    if (Object.keys(found).length) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    if (!connected) {
      setConnectError('Conecte a carteira na rede selecionada antes de revisar.')
      return
    }
    if (!quote.data) return
    setReviewing(true)
    setSubmitError(null)
    try {
      const result = await revalidateQuote(quote.data.id)
      setReview({ quote: result.quote, previous: result.changed ? quote.data : null })
      setAcknowledged(false)
      setReviewOpen(true)
    } catch (error) {
      setSubmitError(toApiError(error).message)
    } finally {
      setReviewing(false)
    }
  }

  // Sem resposta: reenvia uma vez sozinho com a mesma chave (o servidor devolve o
  // pedido já criado); se continuar incerto, o usuário verifica pelo botão.
  const autoRetried = useRef(false)
  const pendingAttempt = placeOrder.isPending ? null : checkoutStorage.readAttempt(userId)

  function sendAttempt(attempt: OrderAttempt) {
    setSubmitError(null)
    placeOrder.mutate(attempt, {
      onError: (error) => {
        if (isUncertain(error)) {
          if (!autoRetried.current) {
            autoRetried.current = true
            sendAttempt(attempt)
            return
          }
          setSubmitError('Não recebemos a confirmação do servidor. O pedido pode ter sido criado: verifique sem criar outro.')
          return
        }
        const apiError = toApiError(error)
        const fresh = (apiError.details as { quote?: Quote } | undefined)?.quote
        if (fresh && review) {
          // Mudou entre a revisão e o envio: nova confirmação obrigatória.
          setReview({ quote: fresh, previous: review.quote })
          setAcknowledged(false)
        }
        if (apiError.fields) setErrors(mapApiFields(apiError.fields))
        setSubmitError(apiError.message)
      },
    })
  }

  function onConfirm() {
    if (!review || !wallet || placeOrder.isPending) return
    const body = {
      quoteId: review.quote.id,
      walletId: wallet.id,
      network: draft.network as Network,
      buyer: { fullName: draft.fullName.trim(), email: draft.email.trim().toLowerCase() },
    }
    const existing = checkoutStorage.readAttempt(userId)
    const key = existing && sameOrderInput(existing.body, body) ? existing.key : crypto.randomUUID()
    autoRetried.current = false
    sendAttempt({ key, body, provider: draft.provider })
  }

  const items = cart.data?.items ?? []
  if (cart.isPending) return <CheckoutSkeleton />
  if (pendingAttempt) {
    // O carrinho pode já ter mudado (pedido liquidado): o que importa é recuperar a tentativa.
    return (
      <div role="alert" className="flex flex-col items-start gap-4 rounded-md bg-surface-card p-8">
        <h1 className="text-lg font-bold text-foreground">Não recebemos a confirmação do seu pedido</h1>
        <p className="text-sm text-text-secondary">
          Ele pode ter sido criado. Verificar reenvia a mesma tentativa e recupera o pedido, sem cobrar de novo.
        </p>
        <button
          type="button"
          onClick={() => sendAttempt(pendingAttempt)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-ink"
        >
          Verificar pedido
        </button>
      </div>
    )
  }
  if (items.length === 0 && !placeOrder.isPending) {
    return (
      <div className="flex flex-col items-start gap-4 bg-surface-card p-8">
        <h1 className="text-lg font-bold text-foreground">Seu carrinho está vazio.</h1>
        <Link to="/" hash="produtos" className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-ink">
          Explorar NFTs
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-16 md:pb-24">
      <nav aria-label="Trilha" className="text-[15px]/4 font-bold text-foreground">
        <Link to="/" className="hover:text-text-accent">
          Início
        </Link>
        {' / '}
        <Link to="/carrinho" className="hover:text-text-accent">
          Mercado
        </Link>
        {' / '}
        <span aria-current="page">Pagamento</span>
      </nav>
      <h1 className="sr-only">Pagamento</h1>

      {placeOrder.isPending && !reviewOpen && (
        <p role="status" className="rounded-md border border-primary bg-primary/10 p-3 text-sm text-foreground">
          Recuperando seu pedido em andamento…
        </p>
      )}

      <form onSubmit={onReview} noValidate className="flex flex-col gap-8 lg:flex-row">
        <section aria-labelledby="buyer-title" className="flex min-w-0 flex-1 flex-col gap-3">
          <h2 id="buyer-title" className="text-[17px]/4 font-bold text-foreground">
            Perfil do colecionador
          </h2>
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            <Field label="Nome de exibição" required error={errors.fullName}>
              {(a) => <input {...a} value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="name" className={inputClass} />}
            </Field>
            <Field label="Nome de usuário" required error={errors.username}>
              {(a) => <input {...a} value={draft.username} onChange={(e) => set('username', e.target.value)} autoComplete="username" className={inputClass} />}
            </Field>
            <Field label="Rede" required error={errors.network}>
              {(a) => (
                <SelectBox {...a} value={draft.network} required onChange={(e) => set('network', e.target.value as Network | '')}>
                  <option value="" disabled>
                    Selecione uma rede
                  </option>
                  {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => (
                    <option key={n} value={n}>
                      {NETWORK_LABELS[n]}
                    </option>
                  ))}
                </SelectBox>
              )}
            </Field>
            <Field label="Tipo de carteira" required error={errors.walletId} 
              hint={
                walletList.length === 0 && !wallets.isPending ? (
                  <>
                    Nenhuma carteira cadastrada.{' '}
                    <Link to="/carteiras" className="font-bold text-text-accent underline underline-offset-2">
                      Cadastrar carteira
                    </Link>
                  </>
                ) : undefined
              }
            >
              {(a) => (
                <SelectBox {...a} value={walletId} required onChange={(e) => set('walletId', e.target.value)} disabled={wallets.isPending}>
                  <option value="" disabled>
                    {wallets.isPending ? 'Carregando carteiras…' : 'Selecione uma carteira'}
                  </option>
                  {walletList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label} ({w.role === 'primary' ? 'principal' : 'secundária'})
                    </option>
                  ))}
                </SelectBox>
              )}
            </Field>
            <Field label="Endereço da carteira" required>
              {(a) => <input {...a} readOnly value={wallet?.address ?? ''} placeholder="Endereço 0x da carteira" className={inputClass} />}
            </Field>
            <Field label="ENS ou carteira secundária (opcional)">
              {(a) => <input {...a} value={draft.secondary} onChange={(e) => set('secondary', e.target.value)} placeholder="nome.eth" className={inputClass} />}
            </Field>
            <Field label="E-mail" required error={errors.email}>
              {(a) => <input {...a} type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" className={inputClass} />}
            </Field>
          </div>
          <Field label="Observação do colecionador (opcional)" className="md:max-w-[350px]">
            {(a) => (
              <textarea
                {...a}
                value={draft.note}
                onChange={(e) => set('note', e.target.value)}
                maxLength={280}
                className={cn(inputClass, 'h-[152px] resize-none py-2')}
              />
            )}
          </Field>
        </section>

        <aside aria-labelledby="items-title" className="flex w-full flex-col gap-3 lg:w-[405px] lg:shrink-0">
          <h2 id="items-title" className="text-[17px]/4 font-bold text-foreground">
            Seus NFTs
          </h2>
          <div className="flex justify-between border-b-[0.3px] border-primary pb-3 text-base/4 text-foreground" aria-hidden>
            <span className="font-bold">NFTs</span>
            <span className="font-medium">Subtotal</span>
          </div>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className="flex min-h-[70px] items-center gap-2 bg-surface-card pr-4 pl-1">
                <img src={item.image.thumb} alt={item.image.alt} width={66} height={66} className="size-[66px] shrink-0 rounded-lg object-cover" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 leading-4">
                  <p className="truncate text-base font-bold text-foreground">{item.nftName}</p>
                  <p className="text-sm text-secondary">Edição: {item.editionName}</p>
                </div>
                <span className="text-sm text-text-secondary">(x {item.quantity})</span>
                <span className="text-lg/4 font-bold text-text-accent">{formatEth(quote.data?.lines.find((l) => l.itemId === item.id)?.lineTotalEth ?? '0')}</span>
              </li>
            ))}
          </ul>
          <Link to="/carrinho" className="text-center text-sm text-foreground hover:text-text-accent">
            Tem um código promocional? Aplique aqui
          </Link>
          <SummaryValues quote={quote.data} loading={quote.isFetching} error={quote.isError} onRetry={() => quote.refetch()} />

          <fieldset className="mt-3 flex flex-col gap-4">
            <legend className="mb-5 w-full text-center text-[17px]/4 font-bold text-foreground">Carteira e rede</legend>
            {PROVIDERS.map((p) => {
              const selected = draft.provider === p.value
              return (
                <label
                  key={p.value}
                  className={cn(
                    'flex h-[45px] cursor-pointer items-center gap-3 rounded-[3px] border px-3 text-[15px] text-foreground focus-within:ring-2 focus-within:ring-ring',
                    selected ? 'border-primary' : 'border-border',
                  )}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p.value}
                    checked={selected}
                    onChange={() => set('provider', p.value)}
                    className="sr-only"
                  />
                  <span className="relative h-4 w-4 shrink-0 overflow-hidden" aria-hidden>
                    <img src={selected ? radioOn : radioOff} alt="" width={selected ? 39 : 16} height={16} className="absolute top-0 left-0 max-w-none" />
                  </span>
                  {p.label}
                </label>
              )
            })}
            {errors.provider && <p className="text-xs text-destructive">{errors.provider}</p>}
          </fieldset>

          <WalletStatus
            wallet={wallet}
            network={draft.network}
            connected={connected}
            connecting={connect.isPending}
            disconnecting={disconnect.isPending}
            error={connectError}
            onConnect={onConnect}
            onDisconnect={() => wallet && disconnect.mutate(wallet.id)}
          />

          {submitError && !reviewOpen && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={!connected || reviewing || !quote.data || placeOrder.isPending}
            aria-busy={reviewing}
            className="mt-2 h-[45px] rounded-lg bg-primary text-[15px]/4 font-bold text-ink transition-colors hover:bg-text-accent disabled:cursor-not-allowed disabled:opacity-50 max-md:h-[60px] max-md:rounded-[40px]"
          >
            {reviewing ? 'Validando valores…' : 'Revisar e confirmar compra'}
          </button>
        </aside>
      </form>

      {review && wallet && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          quote={review.quote}
          previous={review.previous}
          acknowledged={acknowledged}
          onAcknowledge={() => setAcknowledged(true)}
          draft={draft}
          wallet={wallet}
          providerLabel={providerLabel(draft.provider)}
          submitting={placeOrder.isPending}
          uncertain={submitError !== null && placeOrder.isError && isUncertain(placeOrder.error)}
          error={submitError}
          onConfirm={onConfirm}
        />
      )}
    </div>
  )
}

function mapApiFields(fields: Record<string, string>): Errors {
  return {
    fullName: fields['buyer.fullName'],
    email: fields['buyer.email'],
    network: fields.network,
    walletId: fields.walletId,
  }
}

function WalletStatus(props: {
  wallet: Wallet | undefined
  network: Network | ''
  connected: boolean
  connecting: boolean
  disconnecting: boolean
  error: string | null
  onConnect: () => void
  onDisconnect: () => void
}) {
  const { wallet, network, connected } = props
  return (
    <div className="flex flex-col gap-2 rounded-[3px] border border-border p-3" aria-live="polite">
      {connected && wallet ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-foreground">
            <span className="mr-2 inline-block size-2 rounded-full bg-[#46a358]" aria-hidden />
            Conectada: {shortAddress(wallet.address)} · {network && NETWORK_LABELS[network]}
          </span>
          <button
            type="button"
            onClick={props.onDisconnect}
            disabled={props.disconnecting}
            className="text-text-accent underline-offset-4 hover:underline disabled:opacity-50"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-text-secondary">
            {wallet?.connection && network && wallet.connection.network !== network
              ? `Conectada em ${NETWORK_LABELS[wallet.connection.network]}; reconecte em ${NETWORK_LABELS[network]}.`
              : 'Carteira desconectada.'}
          </span>
          <button
            type="button"
            onClick={props.onConnect}
            disabled={props.connecting}
            aria-busy={props.connecting}
            className="shrink-0 rounded-md border border-primary px-3 py-1.5 font-bold text-text-accent disabled:opacity-50"
          >
            {props.connecting ? 'Conectando…' : 'Conectar carteira'}
          </button>
        </div>
      )}
      {props.error && (
        <p role="alert" className="text-xs text-destructive">
          {props.error}
        </p>
      )}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row" aria-busy="true" aria-label="Carregando pagamento">
      <div className="grid flex-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[69px] bg-surface-card" />
        ))}
      </div>
      <div className="flex flex-col gap-3 lg:w-[405px]">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[70px] bg-surface-card" />
        ))}
        <Skeleton className="h-40 bg-surface-card" />
      </div>
    </div>
  )
}
