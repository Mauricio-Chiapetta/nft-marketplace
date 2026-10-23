// Utilitários HTTP do mock: envelope de erro, leitura de corpo e identidade.
// Toda rota privada resolve o usuário exclusivamente pelo token Bearer.
import { HttpResponse } from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/types/api'
import { getDb, mutate, type OwnerKey, type SessionRecord, type UserRecord } from './db'

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: { fields?: Record<string, string>; details?: unknown } = {},
) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message, ...extra } }, { status })
}

export const errors = {
  validation: (fields: Record<string, string>, message = 'Verifique os campos destacados.') =>
    apiError(422, 'VALIDATION_ERROR', message, { fields }),
  unauthorized: () => apiError(401, 'UNAUTHORIZED', 'Faça login para continuar.'),
  sessionExpired: () => apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.'),
  forbidden: (message = 'Você não tem permissão para esta ação.') => apiError(403, 'FORBIDDEN', message),
  notFound: (message = 'Recurso não encontrado.') => apiError(404, 'NOT_FOUND', message),
}

/** Corpo JSON como objeto; `null` se ausente ou malformado. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function hashPassword(salt: string, password: string) {
  return sha256(`${salt}:${password}`)
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return 'A senha deve ter ao menos 8 caracteres.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.'
  return null
}

// ---------------------------------------------------------------- identidade

type AuthOk = { ok: true; user: UserRecord; session: SessionRecord }
type AuthFail = { ok: false; response: Response }

function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  const match = header?.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

/** `null` quando não há credencial; erro quando há credencial inválida. */
function authenticate(request: Request): AuthOk | AuthFail | null {
  const token = bearerToken(request)
  if (!token) return null

  const session = getDb().sessions.find((s) => s.token === token)
  if (!session) return { ok: false, response: errors.unauthorized() }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    mutate((db) => {
      db.sessions = db.sessions.filter((s) => s.token !== token)
    })
    return { ok: false, response: errors.sessionExpired() }
  }

  const user = getDb().users.find((u) => u.id === session.userId)
  if (!user) return { ok: false, response: errors.unauthorized() }
  return { ok: true, user, session }
}

export function requireUser(request: Request): AuthOk | AuthFail {
  return authenticate(request) ?? { ok: false, response: errors.unauthorized() }
}

/** Dono do carrinho: usuário autenticado ou visitante identificado por `X-Guest-Id`. */
export function resolveCartOwner(
  request: Request,
): { ok: true; ownerKey: OwnerKey; user: UserRecord | null } | AuthFail {
  const auth = authenticate(request)
  if (auth?.ok) return { ok: true, ownerKey: `user:${auth.user.id}`, user: auth.user }
  if (auth) return auth

  const guestId = request.headers.get('X-Guest-Id')
  if (!guestId || !/^[\w-]{8,64}$/.test(guestId)) {
    return { ok: false, response: errors.validation({ guestId: 'Cabeçalho X-Guest-Id ausente ou inválido.' }) }
  }
  return { ok: true, ownerKey: `guest:${guestId}`, user: null }
}

export function toPublicUser(user: UserRecord) {
  const { passwordHash: _hash, salt: _salt, ...publicUser } = user
  return publicUser
}
