// Seed determinístico do mock: sem Math.random nem Date.now, para que reset,
// testes e baselines visuais partam sempre do mesmo estado.
import { ethAdd, ethMul, ethPercent, ethSub } from '@/lib/eth'
import type { Network, NftCategory, NftEdition, NftImage, OrderLine } from '@/types/api'
import type {
  CartRecord,
  DbState,
  NftRecord,
  OrderRecord,
  UserRecord,
  WalletRecord,
} from '../db'

export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.0021',
  polygon: '0.0004',
  arbitrum: '0.0006',
}

export const EXPLORERS: Record<Network, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
}

export const CATEGORY_LABELS: Record<NftCategory, string> = {
  art: 'Arte',
  collectibles: 'Colecionáveis',
  music: 'Música',
  photography: 'Fotografia',
  gaming: 'Games',
  utility: 'Utilidade',
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as NftCategory[]

const COLLECTIONS = [
  { id: 'col_canopy', name: 'Canopy Club' },
  { id: 'col_elite', name: 'Jungle Elite' },
  { id: 'col_banana', name: 'Banana Republic' },
  { id: 'col_vine', name: 'Vine Society' },
  { id: 'col_moss', name: 'Mossy Monkeys' },
]

const CREATORS = [
  { id: 'cr_lia', name: 'Lia Monteiro', handle: 'liamonteiro' },
  { id: 'cr_kofi', name: 'Kofi Mensah', handle: 'kofi.eth' },
  { id: 'cr_yuki', name: 'Yuki Tanaka', handle: 'yukitnk' },
  { id: 'cr_rafa', name: 'Rafa Duarte', handle: 'rafaduarte' },
  { id: 'cr_ines', name: 'Inês Couto', handle: 'inescouto' },
  { id: 'cr_omar', name: 'Omar Haddad', handle: 'omarh' },
]

const NAME_PREFIXES = ['Emerald', 'Velvet', 'Midnight', 'Golden', 'Mossy', 'Solar', 'Crimson', 'Silent', 'Neon', 'Ancient']
const NAME_SUFFIXES = ['Ape', 'Guardian', 'Drifter', 'Chief']

// Alterar o formato do estado exige incrementar: dados antigos são descartados.
export const SCHEMA_VERSION = 1
export const NFT_COUNT = 40
const DAY = 86_400_000
const CATALOG_EPOCH = Date.UTC(2026, 8, 30, 12)
const IMAGE_SIZE = 960

function image(variant: number, name: string, collection: string): NftImage {
  const n = (variant % 4) + 1
  return {
    src: `/nfts/jungle-${n}-960.webp`,
    thumb: `/nfts/jungle-${n}-480.webp`,
    alt: `${name}: ilustração de um macaco estilizado da coleção ${collection}`,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  }
}

export function nftId(index: number) {
  return `nft_${String(index + 1).padStart(3, '0')}`
}

function buildNft(i: number): NftRecord {
  const id = nftId(i)
  const name = `${NAME_PREFIXES[i % 10]} ${NAME_SUFFIXES[Math.floor(i / 10)]}`
  const collection = COLLECTIONS[(i * 3) % COLLECTIONS.length]
  const creator = CREATORS[Math.floor(i / 2) % CREATORS.length]
  const category = CATEGORIES[i % CATEGORIES.length]
  const basePrice = ethAdd('0.05', ethMul('0.025', (i * 37) % 40))

  const soldOut = i % 9 === 4
  const goldSoldOut = i % 5 === 2
  const editionCount = 1 + ((i + 2) % 3)
  const stdSupply = 20 + ((i * 11) % 31)

  const editions: NftEdition[] = [
    {
      id: `${id}-std`,
      name: 'Standard',
      priceEth: basePrice,
      supply: stdSupply,
      available: soldOut ? 0 : stdSupply - ((i * 7) % stdSupply),
      maxPerOrder: 5,
    },
  ]
  if (editionCount >= 2) {
    editions.push({
      id: `${id}-gold`,
      name: 'Gold',
      priceEth: ethMul(basePrice, 3),
      supply: 10,
      available: soldOut || goldSoldOut ? 0 : 10 - (i % 4),
      maxPerOrder: 2,
    })
  }
  if (editionCount >= 3) {
    editions.push({
      id: `${id}-gen`,
      name: 'Genesis',
      priceEth: ethMul(basePrice, 10),
      supply: 1,
      available: soldOut ? 0 : 1,
      maxPerOrder: 1,
    })
  }

  return {
    id,
    name,
    description:
      `${name} faz parte da coleção ${collection.name}, criada por ${creator.name}. ` +
      'Cada edição é numerada e acompanha certificado de autenticidade on-chain simulado.',
    category,
    collection,
    creator,
    images: [0, 1, 2].map((offset) => image(i + offset, name, collection.name)),
    editions,
    likes: 12 + ((i * 53) % 300),
    featured: i % 5 === 0 && i < 20,
    createdAt: new Date(CATALOG_EPOCH - i * DAY).toISOString(),
    version: 1,
  }
}

// Senha das contas fictícias: Jungle@2026 (armazenada apenas como SHA-256 com salt).
const USERS: UserRecord[] = [
  {
    id: 'usr_ana',
    name: 'Ana Ribeiro',
    email: 'ana@jungle.dev',
    username: 'anaribeiro',
    bio: 'Coleciono arte digital desde 2021.',
    avatarUrl: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    salt: 'ana-salt-7f3a',
    passwordHash: 'c714c8049c0bd84b699c11fe5589b5cdd08f8a83218aad1dde9cfb4757134415',
  },
  {
    id: 'usr_bruno',
    name: 'Bruno Costa',
    email: 'bruno@jungle.dev',
    username: 'brunocosta',
    bio: '',
    avatarUrl: null,
    createdAt: '2026-03-02T14:30:00.000Z',
    salt: 'bruno-salt-91c2',
    passwordHash: '4d30e8a923c27a35fd403f7e4e07b8d04574f28936b0cda19c32c43b6409aa43',
  },
]

const WALLETS: WalletRecord[] = [
  {
    id: 'wal_ana_main',
    userId: 'usr_ana',
    label: 'Carteira principal',
    address: '0x8ba1f109551bd432803012645ac136ddd64dba72',
    role: 'primary',
    createdAt: '2026-01-15T10:05:00.000Z',
    updatedAt: '2026-01-15T10:05:00.000Z',
  },
  {
    id: 'wal_ana_alt',
    userId: 'usr_ana',
    label: 'Cold wallet',
    address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
    role: 'secondary',
    createdAt: '2026-02-10T09:00:00.000Z',
    updatedAt: '2026-02-10T09:00:00.000Z',
  },
  {
    id: 'wal_bruno_main',
    userId: 'usr_bruno',
    label: 'MetaMask',
    address: '0x2546bcd3c84621e976d8185a91a922ae77ecec30',
    role: 'primary',
    createdAt: '2026-03-02T14:40:00.000Z',
    updatedAt: '2026-03-02T14:40:00.000Z',
  },
]

function orderLine(nft: NftRecord, editionIndex: number, quantity: number, unitPriceEth: string): OrderLine {
  const edition = nft.editions[editionIndex]
  return {
    itemId: `${nft.id}:${edition.id}`,
    nftId: nft.id,
    editionId: edition.id,
    nftName: nft.name,
    editionName: edition.name,
    image: nft.images[0],
    quantity,
    unitPriceEth,
    lineTotalEth: ethMul(unitPriceEth, quantity),
    nftVersion: nft.version,
  }
}

function seedOrders(nfts: NftRecord[]): OrderRecord[] {
  // Pedido confirmado da Ana com preço histórico (diferente do atual): o recibo
  // deve refletir o snapshot, não o catálogo.
  const anaLine = orderLine(nfts[5], 0, 2, '0.08')
  const anaSubtotal = anaLine.lineTotalEth
  const anaDiscount = ethPercent(anaSubtotal, 10)
  const anaFee = NETWORK_FEES.ethereum

  const brunoLine = orderLine(nfts[9], 0, 1, nfts[9].editions[0].priceEth)
  const brunoFee = NETWORK_FEES.polygon

  return [
    {
      id: 'ord_seed_ana',
      userId: 'usr_ana',
      status: 'confirmed',
      quoteId: 'quo_seed_ana',
      lines: [anaLine],
      coupon: { code: 'JUNGLE10', percentOff: 10 },
      subtotalEth: anaSubtotal,
      discountEth: anaDiscount,
      networkFeeEth: anaFee,
      totalEth: ethAdd(ethSub(anaSubtotal, anaDiscount), anaFee),
      network: 'ethereum',
      wallet: { id: 'wal_ana_main', label: 'Carteira principal', address: WALLETS[0].address },
      buyer: { fullName: 'Ana Ribeiro', email: 'ana@jungle.dev' },
      txHash: '0x5f1c8a0d2b7e4a9c3f6d1e8b0a7c4d2e9f3b6a1c8d5e2f7a0b4c9d6e3f1a8b5c',
      explorerUrl: `${EXPLORERS.ethereum}0x5f1c8a0d2b7e4a9c3f6d1e8b0a7c4d2e9f3b6a1c8d5e2f7a0b4c9d6e3f1a8b5c`,
      failureReason: null,
      createdAt: '2026-09-12T18:20:00.000Z',
      updatedAt: '2026-09-12T18:20:06.000Z',
      settledAt: '2026-09-12T18:20:06.000Z',
      version: 2,
      idempotencyKey: 'seed-ana-1',
      bodyHash: 'seed',
      outcome: 'confirmed',
      resolveAt: null,
    },
    {
      id: 'ord_seed_bruno',
      userId: 'usr_bruno',
      status: 'declined',
      quoteId: 'quo_seed_bruno',
      lines: [brunoLine],
      coupon: null,
      subtotalEth: brunoLine.lineTotalEth,
      discountEth: '0',
      networkFeeEth: brunoFee,
      totalEth: ethAdd(brunoLine.lineTotalEth, brunoFee),
      network: 'polygon',
      wallet: { id: 'wal_bruno_main', label: 'MetaMask', address: WALLETS[2].address },
      buyer: { fullName: 'Bruno Costa', email: 'bruno@jungle.dev' },
      txHash: null,
      explorerUrl: null,
      failureReason: 'Pagamento recusado pela carteira.',
      createdAt: '2026-10-01T11:00:00.000Z',
      updatedAt: '2026-10-01T11:00:05.000Z',
      settledAt: '2026-10-01T11:00:05.000Z',
      version: 2,
      idempotencyKey: 'seed-bruno-1',
      bodyHash: 'seed',
      outcome: 'declined',
      resolveAt: null,
    },
  ]
}

export function createSeed(): DbState {
  const nfts = Array.from({ length: NFT_COUNT }, (_, i) => buildNft(i))

  const brunoCart: CartRecord = {
    id: 'cart_usr_bruno',
    items: [
      { nftId: nfts[5].id, editionId: nfts[5].editions[0].id, quantity: 1, addedPriceEth: nfts[5].editions[0].priceEth },
    ],
    couponCode: null,
    version: 1,
    updatedAt: '2026-10-10T09:00:00.000Z',
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    seq: 0,
    eventSeq: 0,
    users: structuredClone(USERS),
    sessions: [],
    nfts,
    coupons: [
      { code: 'JUNGLE10', percentOff: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
      { code: 'WELCOME5', percentOff: 5, expiresAt: '2099-12-31T23:59:59.000Z' },
      { code: 'SUMMER24', percentOff: 20, expiresAt: '2024-09-01T00:00:00.000Z' },
    ],
    favorites: {
      usr_ana: [nftId(0), nftId(2), nftId(7)],
      usr_bruno: [nftId(1), nftId(9)],
    },
    carts: { 'user:usr_bruno': brunoCart },
    wallets: structuredClone(WALLETS),
    walletConnections: {},
    quotes: [],
    orders: seedOrders(nfts),
  }
}
