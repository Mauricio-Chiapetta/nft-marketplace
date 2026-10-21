import { io } from 'socket.io-client'

// Conexão única de tempo real. O servidor é simulado pelo MSW (@mswjs/socket.io-binding).
export const SOCKET_URL = 'ws://localhost/realtime'

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
})
