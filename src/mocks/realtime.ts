// Servidor Socket.IO simulado: WebSocket interceptado pelo MSW (ws.link) e
// protocolo Socket.IO via @mswjs/socket.io-binding. Repassa os eventos do
// barramento (src/mocks/events.ts) aos clientes conectados.
//
// Limitações do binding: só o namespace padrão, sem rooms/broadcast nem leitura
// do `auth` do handshake. Por isso o cliente se identifica com o evento `auth`
// logo após conectar, e o filtro por usuário é feito aqui.
import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { RealtimeEvent } from '@/types/api'
import { getDb } from './db'
import { subscribe } from './events'

export const REALTIME_URL = 'wss://realtime.kurio.test'

// Mesmos valores que o binding anuncia no handshake do Engine.IO.
const PING_INTERVAL_MS = 25_000

interface ClientState {
  userId: string | null
  token: string | null
  close: () => void
}

const clients = new Set<ClientState>()
let online = true

function userForToken(token: string | null): string | null {
  if (!token) return null
  const session = getDb().sessions.find((s) => s.token === token)
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null
  return session.userId
}

/** Eventos de pedido só vão para o dono, e só enquanto a sessão for válida. */
function canDeliver(client: ClientState, event: RealtimeEvent) {
  if (event.type === 'nft.updated') return true
  return client.userId !== null && userForToken(client.token) === event.data.userId
}

// Regex: a URL do Socket.IO leva path e query (/socket.io/?EIO=4&transport=websocket).
const realtime = ws.link(/^wss:\/\/realtime\.kurio\.test\//)

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection) => {
    // "Sem conexão": o handshake nunca é respondido, como numa rede caída. O cliente
    // desiste pelo timeout de conexão e segue tentando reconectar. (Fechar o socket
    // antes do handshake deixaria o Manager do Socket.IO preso em "connecting".)
    if (!online) return

    const io = toSocketIo(connection)
    const state: ClientState = { userId: null, token: null, close: () => connection.client.close() }
    clients.add(state)

    // Engine.IO exige pings do servidor; sem eles o cliente cai a cada ~30 s.
    const ping = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)

    io.client.on('auth', (_event, payload: { token?: string } | undefined) => {
      const token = typeof payload?.token === 'string' ? payload.token : null
      state.token = token
      state.userId = userForToken(token)
      io.client.emit('auth.result', { authenticated: state.userId !== null })
    })

    const unsubscribe = subscribe((event) => {
      if (canDeliver(state, event)) io.client.emit(event.type, event)
    })

    connection.client.addEventListener('close', () => {
      clearInterval(ping)
      unsubscribe()
      clients.delete(state)
    })
  }),
]

export const realtimeControl = {
  /** Derruba as conexões abertas (o cliente reconecta sozinho). */
  dropConnections() {
    for (const client of [...clients]) client.close()
  },
  /** `false` recusa novas conexões até voltar a `true`. */
  setOnline(value: boolean) {
    online = value
    if (!value) realtimeControl.dropConnections()
  },
  connectedClients: () => clients.size,
}
