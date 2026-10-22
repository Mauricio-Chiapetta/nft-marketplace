import { io } from 'socket.io-client'

// Conexão única de tempo real. O servidor é simulado pelo MSW (@mswjs/socket.io-binding);
// o host não existe na rede: o WebSocket é interceptado antes de sair do navegador.
export const SOCKET_URL = 'wss://realtime.kurio.test'

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000,
  // Sem resposta ao handshake em 4 s: conta como falha e tenta de novo.
  timeout: 4000,
})
