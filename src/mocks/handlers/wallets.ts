import { HttpResponse, http } from 'msw'
import type { Wallet, WalletConnection, WalletRole } from '@/types/api'
import { getDb, mutate, nextId, type WalletRecord } from '../db'
import { apiError, errors, readJson, requireUser, str } from '../http'
import { scenarioIs } from '../scenario'
import { isNetwork } from './quotes'

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/
const ROLES: WalletRole[] = ['primary', 'secondary']

function toWalletDto(record: WalletRecord): Wallet {
  const { userId: _userId, ...wallet } = record
  return { ...wallet, connection: getDb().walletConnections[record.id] ?? null }
}

function walletsOf(userId: string): Wallet[] {
  return getDb()
    .wallets.filter((w) => w.userId === userId)
    .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))
    .map(toWalletDto)
}

function validateWalletFields(body: Record<string, unknown>, partial: boolean) {
  const fields: Record<string, string> = {}
  const values: Partial<Pick<Wallet, 'label' | 'address' | 'role'>> = {}
  if (!partial || 'label' in body) {
    const label = str(body.label)
    if (label.length < 2 || label.length > 40) fields.label = 'O apelido deve ter entre 2 e 40 caracteres.'
    else values.label = label
  }
  if (!partial || 'address' in body) {
    const address = str(body.address)
    if (!ADDRESS_PATTERN.test(address)) fields.address = 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'
    else values.address = address.toLowerCase()
  }
  if (!partial || 'role' in body) {
    if (!ROLES.includes(body.role as WalletRole)) fields.role = 'Escolha principal ou secundária.'
    else values.role = body.role as WalletRole
  }
  return { fields, values }
}

function findOwnWallet(userId: string, walletId: unknown) {
  return getDb().wallets.find((w) => w.id === walletId && w.userId === userId)
}

export const walletHandlers = [
  http.get('/api/me/wallets', ({ request }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json(walletsOf(auth.user.id))
  }),

  http.post('/api/me/wallets', async ({ request }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const { fields, values } = validateWalletFields((await readJson(request)) ?? {}, false)
    const own = getDb().wallets.filter((w) => w.userId === auth.user.id)
    if (values.address && own.some((w) => w.address === values.address)) {
      fields.address = 'Esta carteira já está cadastrada.'
    }
    if (Object.keys(fields).length) return errors.validation(fields)

    if (own.some((w) => w.role === values.role)) {
      const slot = values.role === 'primary' ? 'principal' : 'secundária'
      return apiError(409, 'WALLET_SLOT_TAKEN', `Você já possui uma carteira ${slot}. Edite-a em vez de cadastrar outra.`, {
        fields: { role: `Já existe uma carteira ${slot}.` },
      })
    }

    const now = new Date().toISOString()
    const wallet = mutate((db) => {
      const record: WalletRecord = {
        id: nextId('wal'),
        userId: auth.user.id,
        label: values.label!,
        address: values.address!,
        role: values.role!,
        createdAt: now,
        updatedAt: now,
      }
      db.wallets.push(record)
      return record
    })
    return HttpResponse.json(toWalletDto(wallet), { status: 201 })
  }),

  http.patch('/api/me/wallets/:walletId', async ({ request, params }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const wallet = findOwnWallet(auth.user.id, params.walletId)
    if (!wallet) return errors.notFound('Carteira não encontrada.')

    const { fields, values } = validateWalletFields((await readJson(request)) ?? {}, true)
    const others = getDb().wallets.filter((w) => w.userId === auth.user.id && w.id !== wallet.id)
    if (values.address && others.some((w) => w.address === values.address)) {
      fields.address = 'Esta carteira já está cadastrada.'
    }
    if (Object.keys(fields).length) return errors.validation(fields)

    const updated = mutate((db) => {
      const now = new Date().toISOString()
      const record = db.wallets.find((w) => w.id === wallet.id)!
      // Trocar o papel inverte as carteiras principal e secundária.
      if (values.role && values.role !== record.role) {
        const swapped = db.wallets.find((w) => w.userId === auth.user.id && w.role === values.role)
        if (swapped) {
          swapped.role = record.role
          swapped.updatedAt = now
        }
      }
      if (values.address && values.address !== record.address) delete db.walletConnections[record.id]
      Object.assign(record, values, { updatedAt: now })
      return record
    })
    return HttpResponse.json(toWalletDto(updated))
  }),

  // Conexão simulada com a extensão da carteira.
  http.post('/api/me/wallets/:walletId/connect', async ({ request, params }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const wallet = findOwnWallet(auth.user.id, params.walletId)
    if (!wallet) return errors.notFound('Carteira não encontrada.')
    const network = (await readJson(request))?.network
    if (!isNetwork(network)) return errors.validation({ network: 'Selecione uma rede válida.' })
    if (scenarioIs('wallet-rejected')) {
      return apiError(409, 'WALLET_REJECTED', 'A conexão foi recusada na carteira.')
    }

    const connection: WalletConnection = { network, connectedAt: new Date().toISOString() }
    mutate((db) => {
      db.walletConnections[wallet.id] = connection
    })
    return HttpResponse.json(toWalletDto(wallet))
  }),

  http.delete('/api/me/wallets/:walletId/connection', ({ request, params }) => {
    const auth = requireUser(request)
    if (!auth.ok) return auth.response
    const wallet = findOwnWallet(auth.user.id, params.walletId)
    if (!wallet) return errors.notFound('Carteira não encontrada.')
    mutate((db) => {
      delete db.walletConnections[wallet.id]
    })
    return HttpResponse.json(toWalletDto(wallet))
  }),
]
