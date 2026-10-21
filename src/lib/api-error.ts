import { isAxiosError } from 'axios'
import type { ApiErrorBody } from '@/types/api'

export type ApiError = ApiErrorBody['error'] & { status: number | null }

/** Normaliza qualquer falha de request para o envelope de erro da API. */
export function toApiError(error: unknown): ApiError {
  if (isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data?.error
    if (body) return { ...body, status: error.response?.status ?? null }
    if (error.code === 'ECONNABORTED') {
      return { code: 'SERVICE_UNAVAILABLE', message: 'O servidor demorou para responder. Tente novamente.', status: null }
    }
    if (!error.response) {
      return { code: 'SERVICE_UNAVAILABLE', message: 'Sem conexão. Verifique sua internet e tente novamente.', status: null }
    }
  }
  return { code: 'INTERNAL_ERROR', message: 'Algo deu errado. Tente novamente.', status: null }
}
