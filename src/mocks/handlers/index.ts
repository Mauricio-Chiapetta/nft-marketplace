import { HttpResponse, http } from 'msw'
import { errors } from '../http'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { favoritesHandlers } from './favorites'
import { networkHandlers } from './network'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { quoteHandlers } from './quotes'
import { walletHandlers } from './wallets'

// A ordem importa: condições de rede primeiro, rota inexistente por último.
export const handlers = [
  ...networkHandlers,
  http.get('/api/health', () => HttpResponse.json({ status: 'ok' })),
  ...authHandlers,
  ...catalogHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
  http.all('/api/*', () => errors.notFound('Rota da API inexistente.')),
]
