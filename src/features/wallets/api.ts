import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { Network, Wallet, WalletInput, WalletRole } from '@/types/api'

export const walletKeys = {
  all: (userId: string) => ['me', userId, 'wallets'] as const,
}

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function useWallets() {
  const userId = useSession()?.user.id ?? ''
  return useQuery({
    queryKey: walletKeys.all(userId),
    queryFn: ({ signal }) => api.get<Wallet[]>('/me/wallets', { signal }).then((r) => r.data),
    enabled: Boolean(userId),
  })
}

function useWalletMutation<TInput>(request: (input: TInput) => Promise<Wallet>) {
  const queryClient = useQueryClient()
  const userId = useSession()?.user.id ?? ''
  return useMutation({
    mutationFn: request,
    onSuccess: (wallet) => {
      // Se o papel mudou, a outra carteira assume o papel antigo (como no servidor).
      const previous = queryClient.getQueryData<Wallet[]>(walletKeys.all(userId))?.find((w) => w.id === wallet.id)
      queryClient.setQueryData<Wallet[]>(walletKeys.all(userId), (list) =>
        list?.map((w) => {
          if (w.id === wallet.id) return wallet
          if (previous && w.role === wallet.role) return { ...w, role: previous.role }
          return w
        }),
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: walletKeys.all(userId) }),
  })
}

export const WALLET_ROLE_LABELS: Record<WalletRole, string> = { primary: 'Principal', secondary: 'Secundária' }

export function useCreateWallet() {
  const queryClient = useQueryClient()
  const userId = useSession()?.user.id ?? ''
  return useMutation({
    mutationFn: (input: WalletInput) => api.post<Wallet>('/me/wallets', input).then((r) => r.data),
    onSuccess: (wallet) => {
      queryClient.setQueryData<Wallet[]>(walletKeys.all(userId), (list) => (list ? [...list, wallet] : list))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: walletKeys.all(userId) }),
  })
}

/** Trocar o papel inverte principal e secundária no servidor: a lista é recarregada. */
export function useUpdateWallet() {
  return useWalletMutation(({ walletId, ...input }: Partial<WalletInput> & { walletId: string }) =>
    api.patch<Wallet>(`/me/wallets/${walletId}`, input).then((r) => r.data),
  )
}

/** Conexão simulada com a extensão da carteira (pode ser recusada pelo cenário). */
export function useConnectWallet() {
  return useWalletMutation(({ walletId, network }: { walletId: string; network: Network }) =>
    api.post<Wallet>(`/me/wallets/${walletId}/connect`, { network }).then((r) => r.data),
  )
}

export function useDisconnectWallet() {
  return useWalletMutation((walletId: string) => api.delete<Wallet>(`/me/wallets/${walletId}/connection`).then((r) => r.data))
}
