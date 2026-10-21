// Contratos REST e de eventos compartilhados entre o mock (MSW), a camada de
// dados (Axios + TanStack Query) e a interface. Valores em ETH são strings decimais.

export type EthAmount = string
export type ISODate = string

// ---------------------------------------------------------------- erros

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'OUT_OF_STOCK'
  | 'QUANTITY_LIMIT'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'QUOTE_STALE'
  | 'QUOTE_EXPIRED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'WALLET_SLOT_TAKEN'
  | 'WALLET_NOT_CONNECTED'
  | 'WALLET_REJECTED'
  | 'CART_EMPTY'
  | 'PAYLOAD_TOO_LARGE'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    /** Erros por campo, chave = nome do campo no corpo da requisição. */
    fields?: Record<string, string>
    /** Dados extras do erro (ex.: cotação atualizada em QUOTE_STALE). */
    details?: unknown
  }
}

// ---------------------------------------------------------------- catálogo

export type NftCategory = 'art' | 'collectibles' | 'music' | 'photography' | 'gaming' | 'utility'
export type NftSort = 'recent' | 'price-asc' | 'price-desc' | 'popular'
export type NftAvailability = 'all' | 'available'

export interface NftImage {
  src: string
  thumb: string
  alt: string
  width: number
  height: number
}

export interface NftEdition {
  id: string
  name: string
  priceEth: EthAmount
  supply: number
  available: number
  maxPerOrder: number
}

export interface Nft {
  id: string
  name: string
  description: string
  category: NftCategory
  collection: { id: string; name: string }
  creator: { id: string; name: string; handle: string }
  images: NftImage[]
  editions: NftEdition[]
  likes: number
  featured: boolean
  createdAt: ISODate
  /** Incrementada a cada alteração de preço ou disponibilidade. */
  version: number
  /** Menor preço entre edições disponíveis (ou entre todas, se esgotado). */
  priceFromEth: EthAmount
  totalAvailable: number
}

export interface NftListParams {
  q?: string
  /** Lista separada por vírgula na query string. */
  category?: NftCategory[]
  collection?: string[]
  minPrice?: EthAmount
  maxPrice?: EthAmount
  availability?: NftAvailability
  featured?: boolean
  sort?: NftSort
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface CatalogFacets {
  categories: { value: NftCategory; label: string; count: number }[]
  collections: { id: string; name: string; count: number }[]
  priceRange: { min: EthAmount; max: EthAmount }
}

// ---------------------------------------------------------------- sessão e conta

export interface User {
  id: string
  name: string
  email: string
  username: string
  bio: string
  avatarUrl: string | null
  createdAt: ISODate
}

export interface Session {
  token: string
  expiresAt: ISODate
  user: User
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface ProfileUpdateInput {
  name?: string
  username?: string
  bio?: string
  /** Data URL (png, jpeg ou webp) ou null para remover. */
  avatarDataUrl?: string | null
}

export interface PasswordChangeInput {
  currentPassword: string
  newPassword: string
}

// ---------------------------------------------------------------- favoritos

export interface Favorites {
  nftIds: string[]
}

// ---------------------------------------------------------------- carteiras

export type Network = 'ethereum' | 'polygon' | 'arbitrum'
export type WalletRole = 'primary' | 'secondary'

export interface Wallet {
  id: string
  label: string
  address: string
  role: WalletRole
  /** Conexão simulada ativa (null = desconectada). */
  connection: WalletConnection | null
  createdAt: ISODate
  updatedAt: ISODate
}

export interface WalletInput {
  label: string
  address: string
  role: WalletRole
}

export interface WalletConnection {
  network: Network
  connectedAt: ISODate
}

// ---------------------------------------------------------------- carrinho

export interface CartItem {
  /** `${nftId}:${editionId}` */
  id: string
  nftId: string
  editionId: string
  nftName: string
  editionName: string
  image: NftImage
  quantity: number
  unitPriceEth: EthAmount
  /** Preço no momento da inclusão, para sinalizar alterações. */
  addedPriceEth: EthAmount
  available: number
  maxPerOrder: number
  nftVersion: number
}

export interface Cart {
  id: string
  items: CartItem[]
  couponCode: string | null
  itemCount: number
  version: number
  updatedAt: ISODate
}

export interface CartItemInput {
  nftId: string
  editionId: string
  quantity: number
}

export interface CartMergeResult {
  cart: Cart
  /** Itens cuja quantidade foi reduzida por limite ou disponibilidade. */
  adjustments: { itemId: string; requested: number; applied: number }[]
}

// ---------------------------------------------------------------- cotação

export interface QuoteLine {
  itemId: string
  nftId: string
  editionId: string
  nftName: string
  editionName: string
  image: NftImage
  quantity: number
  unitPriceEth: EthAmount
  lineTotalEth: EthAmount
  available: number
  nftVersion: number
}

export type QuoteIssueCode = 'SOLD_OUT' | 'INSUFFICIENT_STOCK'

export interface QuoteIssue {
  itemId: string
  code: QuoteIssueCode
  message: string
  available: number
}

export interface Quote {
  id: string
  network: Network
  lines: QuoteLine[]
  coupon: { code: string; percentOff: number } | null
  subtotalEth: EthAmount
  discountEth: EthAmount
  networkFeeEth: EthAmount
  totalEth: EthAmount
  issues: QuoteIssue[]
  /** Falso quando há linhas sem estoque suficiente. */
  purchasable: boolean
  cartVersion: number
  createdAt: ISODate
  expiresAt: ISODate
}

export interface QuoteInput {
  network: Network
}

/** `details` de QUOTE_STALE e QUOTE_EXPIRED. */
export interface QuoteStaleDetails {
  quote: Quote
}

// ---------------------------------------------------------------- pedidos

export type OrderStatus = 'pending' | 'confirmed' | 'declined'

export interface OrderBuyer {
  fullName: string
  email: string
}

export interface OrderInput {
  quoteId: string
  walletId: string
  network: Network
  buyer: OrderBuyer
}

export type OrderLine = Omit<QuoteLine, 'available'>

export interface Order {
  id: string
  status: OrderStatus
  quoteId: string
  lines: OrderLine[]
  coupon: { code: string; percentOff: number } | null
  subtotalEth: EthAmount
  discountEth: EthAmount
  networkFeeEth: EthAmount
  totalEth: EthAmount
  network: Network
  wallet: { id: string; label: string; address: string }
  buyer: OrderBuyer
  txHash: string | null
  explorerUrl: string | null
  failureReason: string | null
  createdAt: ISODate
  updatedAt: ISODate
  settledAt: ISODate | null
  version: number
}

// ---------------------------------------------------------------- eventos (Socket.IO)

interface EventBase<TType extends string, TResource extends string, TData> {
  /** Identidade estável do evento, para deduplicação. */
  id: string
  type: TType
  resource: { type: TResource; id: string }
  /** Versão do recurso após a alteração; eventos com versão ≤ à conhecida são ignorados. */
  version: number
  occurredAt: ISODate
  data: TData
}

export type NftUpdatedEvent = EventBase<
  'nft.updated',
  'nft',
  { nftId: string; editions: Pick<NftEdition, 'id' | 'priceEth' | 'available'>[] }
>

export type OrderUpdatedEvent = EventBase<
  'order.updated',
  'order',
  Pick<Order, 'status' | 'txHash' | 'explorerUrl' | 'failureReason' | 'settledAt'> & {
    orderId: string
    userId: string
  }
>

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
