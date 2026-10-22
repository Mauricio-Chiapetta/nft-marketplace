import axios from 'axios'
import type { ApiErrorBody } from '@/types/api'
import { getGuestId } from './guest'
import { sessionStore } from './session'

// Toda chamada REST passa por esta instância. O MSW intercepta /api/*.
export const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const session = sessionStore.get()
  if (session && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${session.token}`)
  }
  // Carrinho e cotação de visitante; com sessão, o servidor usa o usuário.
  if (!config.headers.has('X-Guest-Id')) config.headers.set('X-Guest-Id', getGuestId())
  return config
})

api.interceptors.response.use(undefined, (error) => {
  const status = error.response?.status
  const code = (error.response?.data as ApiErrorBody | undefined)?.error?.code
  const sentToken = error.config?.headers?.get?.('Authorization')
  const session = sessionStore.get()
  // Só encerra se a falha foi da sessão atual (não de uma requisição antiga).
  if (status === 401 && (code === 'SESSION_EXPIRED' || code === 'UNAUTHORIZED') && session && sentToken === `Bearer ${session.token}`) {
    sessionStore.end('expired')
  }
  return Promise.reject(error)
})
