import { HttpResponse, http } from 'msw'
import { getDb, mutate } from '../db'
import { apiError, errors, hashPassword, passwordProblem, readJson, requireUser, str, toPublicUser } from '../http'

const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/
const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
/** ~300 KB de imagem em base64: mantém o estado do mock dentro da cota do localStorage. */
const AVATAR_MAX_LENGTH = 400_000

export const profileHandlers = [
  http.get('/api/me/profile', ({ request }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json(toPublicUser(auth.user))
  }),

  http.patch('/api/me/profile', async ({ request }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const body = await readJson(request)
    if (!body) return errors.validation({}, 'Corpo da requisição inválido.')

    const patch: { name?: string; username?: string; bio?: string; avatarUrl?: string | null } = {}
    const fields: Record<string, string> = {}

    if ('name' in body) {
      const name = str(body.name)
      if (name.length < 2 || name.length > 60) fields.name = 'O nome deve ter entre 2 e 60 caracteres.'
      else patch.name = name
    }
    if ('username' in body) {
      const username = str(body.username).toLowerCase()
      if (!USERNAME_PATTERN.test(username)) fields.username = 'Use de 3 a 20 letras minúsculas, números, "_" ou ".".'
      else patch.username = username
    }
    if ('bio' in body) {
      const bio = str(body.bio)
      if (bio.length > 280) fields.bio = 'A bio deve ter no máximo 280 caracteres.'
      else patch.bio = bio
    }
    if ('avatarDataUrl' in body) {
      const avatar = body.avatarDataUrl
      if (avatar === null) patch.avatarUrl = null
      else if (typeof avatar !== 'string' || !AVATAR_PATTERN.test(avatar)) {
        fields.avatarDataUrl = 'Envie uma imagem PNG, JPEG ou WebP.'
      } else if (avatar.length > AVATAR_MAX_LENGTH) {
        return apiError(413, 'PAYLOAD_TOO_LARGE', 'A imagem deve ter no máximo 300 KB.', {
          fields: { avatarDataUrl: 'A imagem deve ter no máximo 300 KB.' },
        })
      } else patch.avatarUrl = avatar
    }
    if (Object.keys(fields).length) return errors.validation(fields)

    if (patch.username && getDb().users.some((u) => u.username === patch.username && u.id !== auth.user.id)) {
      return apiError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', {
        fields: { username: 'Este nome de usuário já está em uso.' },
      })
    }

    const user = mutate((db) => {
      const record = db.users.find((u) => u.id === auth.user.id)!
      Object.assign(record, patch)
      return record
    })
    return HttpResponse.json(toPublicUser(user))
  }),

  http.post('/api/me/password', async ({ request }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const body = await readJson(request)
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    const fields: Record<string, string> = {}
    if (!currentPassword) fields.currentPassword = 'Informe a senha atual.'
    const problem = passwordProblem(newPassword)
    if (problem) fields.newPassword = problem
    else if (newPassword === currentPassword) fields.newPassword = 'A nova senha deve ser diferente da atual.'
    if (Object.keys(fields).length) return errors.validation(fields)

    if ((await hashPassword(auth.user.salt, currentPassword)) !== auth.user.passwordHash) {
      return errors.validation({ currentPassword: 'Senha atual incorreta.' })
    }

    const salt = crypto.randomUUID()
    const passwordHash = await hashPassword(salt, newPassword)
    mutate((db) => {
      const record = db.users.find((u) => u.id === auth.user.id)!
      record.salt = salt
      record.passwordHash = passwordHash
      // Encerra as demais sessões do usuário; a atual continua válida.
      db.sessions = db.sessions.filter((s) => s.userId !== auth.user.id || s.token === auth.session.token)
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
