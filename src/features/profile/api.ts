import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { sessionStore, useSession } from '@/lib/session'
import type { User } from '@/types/api'

export const profileKeys = {
  detail: (userId: string) => ['me', userId, 'profile'] as const,
}

export interface ProfileInput {
  name?: string
  username?: string
  bio?: string
  /** data URL da imagem, ou null para remover. */
  avatarDataUrl?: string | null
}

/** Perfil vindo da API; a sessão serve de dado inicial para não piscar. */
export function useProfile() {
  const session = useSession()
  const userId = session?.user.id ?? ''
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: ({ signal }) => api.get<User>('/me/profile', { signal }).then((r) => r.data),
    enabled: Boolean(userId),
    placeholderData: session?.user,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const userId = useSession()?.user.id ?? ''
  return useMutation({
    mutationFn: (input: ProfileInput) => api.patch<User>('/me/profile', input).then((r) => r.data),
    onSuccess: (user) => {
      queryClient.setQueryData(profileKeys.detail(userId), user)
      // Header, checkout e demais telas leem o usuário da sessão.
      if (sessionStore.get()?.user.id === user.id) sessionStore.updateUser(user)
    },
  })
}

export function useChangePassword() {
  return useMutation({
    // Sem cache das variáveis: a senha não fica no MutationCache.
    gcTime: 0,
    mutationFn: (input: { currentPassword: string; newPassword: string }) => api.post('/me/password', input),
  })
}

export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const AVATAR_MAX_BYTES = 300 * 1024

export function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
