import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/lib/api-error'
import type { Wallet, WalletInput, WalletRole } from '@/types/api'
import { Field, SelectBox, inputClass } from '@/features/checkout/components/field'
import { AccountNav } from '@/features/profile/components/account-nav'
import { FormAlert } from '@/features/profile/components/profile-page'
import { buttonClass, cardClass, secondaryButtonClass } from '@/features/profile/components/styles'
import { NETWORK_LABELS, WALLET_ROLE_LABELS, useCreateWallet, useUpdateWallet, useWallets } from '../api'

type Errors = Partial<Record<keyof WalletInput, string>>

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/
const ROLES: WalletRole[] = ['primary', 'secondary']

function validate(values: WalletInput): Errors {
  const errors: Errors = {}
  const label = values.label.trim()
  if (label.length < 2 || label.length > 40) errors.label = 'O apelido deve ter entre 2 e 40 caracteres.'
  if (!ADDRESS_PATTERN.test(values.address.trim())) errors.address = 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'
  return errors
}

interface WalletFormProps {
  initial: WalletInput
  /** Papel travado no cadastro (cada vaga tem o seu); na edição pode inverter com a outra. */
  canChangeRole: boolean
  submitLabel: string
  pending: boolean
  onSubmit: (values: WalletInput, fail: (error: unknown) => void) => void
  onCancel?: () => void
}

function WalletForm({ initial, canChangeRole, submitLabel, pending, onSubmit, onCancel }: WalletFormProps) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function set<K extends keyof WalletInput>(field: K, value: WalletInput[K]) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors(({ [field]: _removed, ...rest }) => rest)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const next = validate(values)
    setErrors(next)
    if (Object.keys(next).length) return
    onSubmit({ label: values.label.trim(), address: values.address.trim(), role: values.role }, (error) => {
      const apiError = toApiError(error)
      if (apiError.fields) setErrors(apiError.fields)
      // Conflito de vaga e erros sem campo vão para o alerta do formulário.
      if (!apiError.fields || apiError.code === 'WALLET_SLOT_TAKEN') setFormError(apiError.message)
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        <Field label="Apelido" required error={errors.label}>
          {(a) => <input {...a} value={values.label} onChange={(e) => set('label', e.target.value)} placeholder="Ex.: Cofre principal" className={inputClass} />}
        </Field>
        <Field label="Papel" required error={errors.role} hint={canChangeRole ? 'Trocar o papel inverte com a outra carteira.' : undefined}>
          {(a) => (
            <SelectBox {...a} value={values.role} disabled={!canChangeRole} onChange={(e) => set('role', e.target.value as WalletRole)}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {WALLET_ROLE_LABELS[role]}
                </option>
              ))}
            </SelectBox>
          )}
        </Field>
        <Field label="Endereço" required error={errors.address} className="md:col-span-2">
          {(a) => (
            <input
              {...a}
              value={values.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="0x…"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              className={`${inputClass} font-mono`}
            />
          )}
        </Field>
      </div>
      <FormAlert message={formError} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={buttonClass} disabled={pending} aria-busy={pending}>
          {pending ? 'Salvando…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={secondaryButtonClass} disabled={pending} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

function WalletSlot({ role, wallet, hasOther }: { role: WalletRole; wallet: Wallet | undefined; hasOther: boolean }) {
  const create = useCreateWallet()
  const update = useUpdateWallet()
  const [editing, setEditing] = useState(false)
  const title = `Carteira ${WALLET_ROLE_LABELS[role].toLowerCase()}`
  const titleId = `wallet-${role}-title`

  if (!wallet) {
    return (
      <section aria-labelledby={titleId} className={cardClass}>
        <h2 id={titleId} className="text-[17px]/4 font-bold text-foreground">
          {title}
        </h2>
        <p className="text-sm text-text-secondary">
          {role === 'primary' ? 'Usada por padrão no pagamento.' : 'Opcional: uma segunda carteira para receber ou pagar.'}
        </p>
        <WalletForm
          initial={{ label: '', address: '', role }}
          canChangeRole={false}
          submitLabel="Cadastrar carteira"
          pending={create.isPending}
          onSubmit={(values, fail) =>
            create.mutate(values, { onSuccess: () => toast.success(`${title} cadastrada.`), onError: fail })
          }
        />
      </section>
    )
  }

  return (
    <section aria-labelledby={titleId} className={cardClass}>
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-[17px]/4 font-bold text-foreground">
          {title}
        </h2>
        {wallet.connection && (
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-text-accent">
            Conectada · {NETWORK_LABELS[wallet.connection.network]}
          </span>
        )}
      </div>
      {editing ? (
        <WalletForm
          initial={{ label: wallet.label, address: wallet.address, role: wallet.role }}
          canChangeRole={hasOther}
          submitLabel="Salvar carteira"
          pending={update.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={(values, fail) => {
            // Só os campos alterados: trocar o endereço desconecta a carteira no servidor.
            const patch: Partial<WalletInput> = {}
            if (values.label !== wallet.label) patch.label = values.label
            if (values.address.toLowerCase() !== wallet.address) patch.address = values.address
            if (values.role !== wallet.role) patch.role = values.role
            if (!Object.keys(patch).length) return setEditing(false)
            update.mutate(
              { walletId: wallet.id, ...patch },
              {
                onSuccess: () => {
                  setEditing(false)
                  toast.success('Carteira atualizada.')
                },
                onError: fail,
              },
            )
          }}
        />
      ) : (
        <>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-text-secondary">Apelido</dt>
            <dd className="font-bold text-foreground">{wallet.label}</dd>
            <dt className="text-text-secondary">Endereço</dt>
            <dd className="font-mono break-all text-foreground" title={wallet.address}>
              {wallet.address}
            </dd>
          </dl>
          <button type="button" className={`${secondaryButtonClass} self-start`} onClick={() => setEditing(true)}>
            Editar <span className="sr-only">{title.toLowerCase()}</span>
          </button>
        </>
      )}
    </section>
  )
}

export function WalletsPage() {
  const wallets = useWallets()
  const list = wallets.data ?? []

  return (
    <div className="flex flex-col gap-8 pb-16 md:pb-24">
      <AccountNav current="Carteiras" />
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px]/7 font-bold text-foreground">Carteiras</h1>
        <p className="text-sm text-text-secondary">
          Cadastre uma carteira principal e, se quiser, uma secundária. A conexão com a extensão é simulada no pagamento.
        </p>
      </div>

      {wallets.isPending ? (
        <div className="grid gap-6 lg:grid-cols-2" aria-busy="true" aria-label="Carregando carteiras">
          <Skeleton className="h-64 bg-surface-card" />
          <Skeleton className="h-64 bg-surface-card" />
        </div>
      ) : wallets.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-md bg-surface-card p-5">
          <p className="text-sm text-foreground">{toApiError(wallets.error).message}</p>
          <button type="button" className={secondaryButtonClass} onClick={() => wallets.refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {ROLES.map((role) => (
            <WalletSlot
              key={role}
              role={role}
              wallet={list.find((w) => w.role === role)}
              hasOther={list.some((w) => w.role !== role)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
