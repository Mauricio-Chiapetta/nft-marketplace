// Pedidos são privados: a chave inclui o usuário.
export const orderKeys = {
  all: (userId: string) => ['me', userId, 'orders'] as const,
  detail: (userId: string, orderId: string) => ['me', userId, 'orders', orderId] as const,
}
