import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ethCompare, ethMin, formatEth } from '@/lib/eth'
import { sessionStore } from '@/lib/session'
import { socket } from '@/lib/socket'
import { cartKeys } from '@/features/cart/api'
import { catalogKeys } from '@/features/catalog/queries'
import { orderKeys } from '@/features/orders/keys'
import type { Cart, Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, Paginated, RealtimeEvent } from '@/types/api'

// Eventos chegam pelo socket.io-client e só então alteram o cache do Query.
// Cada evento tem id estável (duplicata é ignorada) e versão do recurso
// (versão ≤ à já conhecida é ignorada, para nunca regredir o estado).

const SEEN_LIMIT = 500
const seen = new Set<string>()
const versions = new Map<string, number>()

function accept(event: RealtimeEvent) {
  if (seen.has(event.id)) return false
  seen.add(event.id)
  if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value!)
  const key = `${event.resource.type}:${event.resource.id}`
  if ((versions.get(key) ?? 0) >= event.version) return false
  versions.set(key, event.version)
  return true
}

function patchNft(nft: Nft, event: NftUpdatedEvent): Nft {
  if (nft.id !== event.data.nftId || nft.version >= event.version) return nft
  const editions = nft.editions.map((edition) => {
    const patch = event.data.editions.find((e) => e.id === edition.id)
    return patch ? { ...edition, priceEth: patch.priceEth, available: patch.available } : edition
  })
  const available = editions.filter((e) => e.available > 0)
  return {
    ...nft,
    editions,
    version: event.version,
    totalAvailable: editions.reduce((sum, e) => sum + e.available, 0),
    priceFromEth: ethMin(...(available.length ? available : editions).map((e) => e.priceEth)),
  }
}

function onNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent) {
  const { nftId } = event.data
  queryClient.setQueryData<Nft>(catalogKeys.detail(nftId), (nft) => (nft ? patchNft(nft, event) : nft))
  queryClient.setQueriesData<Paginated<Nft>>({ queryKey: [...catalogKeys.all, 'list'] }, (page) =>
    page ? { ...page, items: page.items.map((nft) => patchNft(nft, event)) } : page,
  )
  // Filtros por preço/ordem podem mudar com o novo valor: refaz em segundo plano.
  queryClient.invalidateQueries({ queryKey: [...catalogKeys.all, 'list'], refetchType: 'active' })

  // Carrinho: o servidor recalcula preço/estoque; avisa quem tem o NFT no carrinho.
  const carts = queryClient.getQueriesData<Cart>({ queryKey: cartKeys.all })
  const affected = carts
    .flatMap(([, cart]) => cart?.items ?? [])
    .filter((item) => item && 'nftId' in item && item.nftId === nftId)
  if (!affected.length) return
  for (const item of affected) {
    const patch = event.data.editions.find((e) => e.id === item.editionId)
    if (!patch) continue
    if (patch.available < item.quantity) {
      toast.warning(`${item.nftName} (${item.editionName}): restam ${patch.available} unidade(s).`, { id: `rt-${item.id}` })
    } else if (ethCompare(patch.priceEth, item.unitPriceEth) !== 0) {
      toast.info(`${item.nftName} (${item.editionName}) agora custa ${formatEth(patch.priceEth)}.`, { id: `rt-${item.id}` })
    }
  }
  queryClient.invalidateQueries({ queryKey: cartKeys.all })
}

function onOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent) {
  // Defesa extra: o servidor já filtra, mas evento de outro usuário nunca toca o cache.
  const userId = sessionStore.get()?.user.id
  if (!userId || event.data.userId !== userId) return
  const key = orderKeys.detail(userId, event.data.orderId)
  queryClient.setQueryData<Order>(key, (order) => {
    if (!order || order.version >= event.version || order.status !== 'pending') return order
    const { orderId: _id, userId: _user, ...changes } = event.data
    return { ...order, ...changes, version: event.version, updatedAt: event.occurredAt }
  })
  queryClient.invalidateQueries({ queryKey: key })
  // Confirmado: o servidor removeu do carrinho os itens comprados.
  if (event.data.status === 'confirmed') queryClient.invalidateQueries({ queryKey: cartKeys.all })
}

/** Liga o socket ao ciclo de vida da sessão. Retorna a função de limpeza. */
export function installRealtime(queryClient: QueryClient) {
  let connectedOnce = false
  let token = sessionStore.get()?.token ?? null

  const onConnect = () => {
    socket.emit('auth', { token: sessionStore.get()?.token ?? null })
    // Reconexão: o que mudou enquanto estávamos fora vem da REST.
    if (connectedOnce) queryClient.invalidateQueries({ type: 'active' })
    connectedOnce = true
  }
  const handleNft = (event: NftUpdatedEvent) => accept(event) && onNftUpdated(queryClient, event)
  const handleOrder = (event: OrderUpdatedEvent) => accept(event) && onOrderUpdated(queryClient, event)

  socket.on('connect', onConnect)
  socket.on('nft.updated', handleNft)
  socket.on('order.updated', handleOrder)

  // Troca de sessão: nova conexão, sem herdar a identidade anterior.
  const unsubscribe = sessionStore.subscribe(() => {
    const next = sessionStore.get()?.token ?? null
    if (next === token) return
    token = next
    for (const key of [...versions.keys()]) if (key.startsWith('order:')) versions.delete(key)
    socket.disconnect().connect()
  })

  socket.connect()

  return () => {
    unsubscribe()
    socket.off('connect', onConnect)
    socket.off('nft.updated', handleNft)
    socket.off('order.updated', handleOrder)
    socket.disconnect()
  }
}
