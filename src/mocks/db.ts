// Banco de dados do mock: estado único, persistido em localStorage para
// sobreviver a refresh. Toda escrita passa por `mutate`, que persiste ao final.
import type {
  Nft,
  Order,
  Quote,
  User,
  Wallet,
  WalletConnection,
} from '@/types/api'
import { SCHEMA_VERSION, createSeed } from './data/fixtures'

const STORAGE_KEY = 'nft-mock:db'

export type NftRecord = Omit<Nft, 'priceFromEth' | 'totalAvailable'>

export interface UserRecord extends User {
  passwordHash: string
  salt: string
}

export interface SessionRecord {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
}

/** `user:<id>` para usuários autenticados, `guest:<id>` para visitantes. */
export type OwnerKey = `user:${string}` | `guest:${string}`

export interface CartRecordItem {
  nftId: string
  editionId: string
  quantity: number
  addedPriceEth: string
}

export interface CartRecord {
  id: string
  items: CartRecordItem[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface CouponRecord {
  code: string
  percentOff: number
  expiresAt: string
}

export interface WalletRecord extends Omit<Wallet, 'connection'> {
  userId: string
}

export interface QuoteRecord extends Quote {
  ownerKey: OwnerKey
  fingerprint: string
}

export interface OrderRecord extends Order {
  userId: string
  idempotencyKey: string
  bodyHash: string
  /** Resultado decidido na criação (cenário ativo); aplicado ao liquidar. */
  outcome: 'confirmed' | 'declined'
  /** Momento (ms) da liquidação automática; null = só via controle de teste. */
  resolveAt: number | null
}

export interface DbState {
  schemaVersion: number
  seq: number
  eventSeq: number
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: NftRecord[]
  coupons: CouponRecord[]
  favorites: Record<string, string[]>
  carts: Record<OwnerKey, CartRecord>
  wallets: WalletRecord[]
  /** Conexões simuladas, por id de carteira. */
  walletConnections: Record<string, WalletConnection>
  quotes: QuoteRecord[]
  orders: OrderRecord[]
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schemaVersion === SCHEMA_VERSION) return parsed
    }
  } catch {
    // armazenamento indisponível ou corrompido: recomeça do seed
  }
  return createSeed()
}

let state: DbState = load()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Sem persistência (modo privado, cota): o estado segue válido em memória.
  }
}

export function getDb(): Readonly<DbState> {
  return state
}

export function mutate<T>(fn: (db: DbState) => T): T {
  const result = fn(state)
  persist()
  return result
}

/** Restaura integralmente o cenário conhecido (seed). */
export function resetDb() {
  state = createSeed()
  persist()
}

export function nextId(prefix: string): string {
  state.seq += 1
  return `${prefix}_${String(state.seq).padStart(4, '0')}`
}

export function nextEventId(): string {
  state.eventSeq += 1
  return `evt_${String(state.eventSeq).padStart(6, '0')}`
}

