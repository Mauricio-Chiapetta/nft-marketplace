import { HttpResponse, http } from 'msw'
import type { Session } from '@/types/api'
import { getDb, mutate, nextId, type UserRecord } from '../db'
import {
  EMAIL_PATTERN,
  apiError,
  errors,
  hashPassword,
  passwordProblem,
  readJson,
  requireUser,
  str,
  toPublicUser,
} from '../http'
import { scenarioIs } from '../scenario'

const SESSION_TTL_MS = 30 * 60_000
const SHORT_SESSION_TTL_MS = 15_000

function createSession(user: UserRecord): Session {
  const ttl = scenarioIs('session-expired') ? SHORT_SESSION_TTL_MS : SESSION_TTL_MS
  const now = Date.now()
  const session = {
    token: crypto.randomUUID(),
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttl).toISOString(),
  }
  mutate((db) => {
    db.sessions.push(session)
  })
  return { token: session.token, expiresAt: session.expiresAt, user: toPublicUser(user) }
}

function uniqueUsername(email: string): string {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 16) || 'colecionador'
  const taken = new Set(getDb().users.map((u) => u.username))
  let candidate = base
  for (let n = 2; taken.has(candidate); n++) candidate = `${base}${n}`
  return candidate
}

export const authHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const body = await readJson(request)
    const name = str(body?.name)
    const email = str(body?.email).toLowerCase()
    const password = typeof body?.password === 'string' ? body.password : ''

    const fields: Record<string, string> = {}
    if (name.length < 2) fields.name = 'Informe seu nome.'
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    const pwProblem = passwordProblem(password)
    if (pwProblem) fields.password = pwProblem
    if (Object.keys(fields).length) return errors.validation(fields)

    if (getDb().users.some((u) => u.email === email)) {
      return apiError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', {
        fields: { email: 'Este e-mail já está cadastrado.' },
      })
    }

    const salt = crypto.randomUUID()
    const user: UserRecord = {
      id: nextId('usr'),
      name,
      email,
      username: uniqueUsername(email),
      bio: '',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash: await hashPassword(salt, password),
    }
    mutate((db) => {
      db.users.push(user)
    })
    return HttpResponse.json(createSession(user), { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await readJson(request)
    const email = str(body?.email).toLowerCase()
    const password = typeof body?.password === 'string' ? body.password : ''

    const fields: Record<string, string> = {}
    if (!EMAIL_PATTERN.test(email)) fields.email = 'Informe um e-mail válido.'
    if (!password) fields.password = 'Informe sua senha.'
    if (Object.keys(fields).length) return errors.validation(fields)

    const user = getDb().users.find((u) => u.email === email)
    if (!user || (await hashPassword(user.salt, password)) !== user.passwordHash) {
      return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }
    return HttpResponse.json(createSession(user))
  }),

  http.get('/api/auth/session', ({ request }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const session: Session = { token: auth.session.token, expiresAt: auth.session.expiresAt, user: toPublicUser(auth.user) }
    return HttpResponse.json(session)
  }),

  http.post('/api/auth/logout', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    mutate((db) => {
      const session = db.sessions.find((s) => s.token === token)
      if (!session) return
      db.sessions = db.sessions.filter((s) => s.token !== token)
      // Conexões de carteira simuladas não sobrevivem ao fim da sessão.
      for (const wallet of db.wallets.filter((w) => w.userId === session.userId)) {
        delete db.walletConnections[wallet.id]
      }
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
