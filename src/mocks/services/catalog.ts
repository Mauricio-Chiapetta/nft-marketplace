import { ethMin } from '@/lib/eth'
import type { Nft, NftEdition } from '@/types/api'
import { getDb, mutate, nextEventId, type NftRecord } from '../db'
import { publish } from '../events'

export function toNftDto(record: NftRecord): Nft {
  const available = record.editions.filter((e) => e.available > 0)
  const priced = available.length > 0 ? available : record.editions
  return {
    ...record,
    priceFromEth: ethMin(...priced.map((e) => e.priceEth)),
    totalAvailable: record.editions.reduce((sum, e) => sum + e.available, 0),
  }
}

export function findNft(nftId: string): NftRecord | undefined {
  return getDb().nfts.find((n) => n.id === nftId)
}

export function findEdition(nftId: string, editionId: string): { nft: NftRecord; edition: NftEdition } | null {
  const nft = findNft(nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return nft && edition ? { nft, edition } : null
}

export type EditionPatch = { editionId: string } & Partial<Pick<NftEdition, 'priceEth' | 'available'>>

/**
 * Único caminho de alteração de preço/disponibilidade: incrementa a versão do
 * NFT e publica `nft.updated`, mantendo REST e eventos coerentes.
 */
export function updateNftEditions(nftId: string, patches: EditionPatch[]): NftRecord {
  const nft = mutate((db) => {
    const record = db.nfts.find((n) => n.id === nftId)
    if (!record) throw new Error(`NFT inexistente: ${nftId}`)
    for (const { editionId, ...patch } of patches) {
      const edition = record.editions.find((e) => e.id === editionId)
      if (!edition) throw new Error(`Edição inexistente: ${editionId}`)
      if (patch.priceEth !== undefined) edition.priceEth = patch.priceEth
      if (patch.available !== undefined) edition.available = Math.max(0, Math.min(edition.supply, patch.available))
    }
    record.version += 1
    return record
  })

  const eventId = mutate(() => nextEventId())
  publish({
    id: eventId,
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: {
      nftId: nft.id,
      editions: nft.editions.map(({ id, priceEth, available }) => ({ id, priceEth, available })),
    },
  })
  return nft
}
