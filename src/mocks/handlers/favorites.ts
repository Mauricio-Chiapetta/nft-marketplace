import { HttpResponse, http } from 'msw'
import type { Favorites } from '@/types/api'
import { getDb, mutate } from '../db'
import { errors, requireUser } from '../http'
import { findNft } from '../services/catalog'

function favoritesOf(userId: string): Favorites {
  return { nftIds: getDb().favorites[userId] ?? [] }
}

export const favoritesHandlers = [
  http.get('/api/me/favorites', ({ request }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json(favoritesOf(auth.user.id))
  }),

  // PUT e DELETE são idempotentes: repetir a operação não muda o resultado.
  http.put('/api/me/favorites/:nftId', ({ request, params }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const nftId = String(params.nftId)
    if (!findNft(nftId)) return errors.notFound('NFT não encontrado.')
    mutate((db) => {
      const list = db.favorites[auth.user.id] ?? []
      if (!list.includes(nftId)) db.favorites[auth.user.id] = [...list, nftId]
    })
    return HttpResponse.json(favoritesOf(auth.user.id))
  }),

  http.delete('/api/me/favorites/:nftId', ({ request, params }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const nftId = String(params.nftId)
    mutate((db) => {
      db.favorites[auth.user.id] = (db.favorites[auth.user.id] ?? []).filter((id) => id !== nftId)
    })
    return HttpResponse.json(favoritesOf(auth.user.id))
  }),
]
