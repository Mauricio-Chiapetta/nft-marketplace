import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { toApiError } from '@/lib/api-error'
import type { User } from '@/types/api'
import { Field, inputClass } from '@/features/checkout/components/field'
import { AVATAR_MAX_BYTES, AVATAR_TYPES, readAsDataUrl, useChangePassword, useProfile, useUpdateProfile } from '../api'
import { AccountNav } from './account-nav'
import { buttonClass, cardClass, secondaryButtonClass } from './styles'

type Errors = Record<string, string>

const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/
const PASSWORD_HINT = 'Mínimo de 8 caracteres, com letras e números.'

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
      {message}
    </p>
  )
}

function AvatarSection({ user }: { user: User }) {
  const update = useUpdateProfile()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const initial = user.name.trim().charAt(0).toUpperCase() || '?'

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!AVATAR_TYPES.includes(file.type)) return setError('Envie uma imagem PNG, JPEG ou WebP.')
    if (file.size > AVATAR_MAX_BYTES) return setError('A imagem deve ter no máximo 300 KB.')
    update.mutate(
      { avatarDataUrl: await readAsDataUrl(file) },
      {
        onSuccess: () => toast.success('Avatar atualizado.'),
        onError: (e) => {
          const apiError = toApiError(e)
          setError(apiError.fields?.avatarDataUrl ?? apiError.message)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="Seu avatar" width={96} height={96} className="size-24 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden className="grid size-24 shrink-0 place-items-center rounded-full bg-primary text-[40px] font-bold text-ink">
          {initial}
        </span>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-3">
          <input
            ref={input}
            type="file"
            accept={AVATAR_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button type="button" className={secondaryButtonClass} disabled={update.isPending} onClick={() => input.current?.click()}>
            {update.isPending ? 'Enviando…' : user.avatarUrl ? 'Trocar avatar' : 'Enviar avatar'}
          </button>
          {user.avatarUrl && (
            <button
              type="button"
              className="h-[45px] px-2 text-sm font-bold text-text-secondary underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
              disabled={update.isPending}
              onClick={() =>
                update.mutate(
                  { avatarDataUrl: null },
                  { onSuccess: () => toast.success('Avatar removido.'), onError: (e) => setError(toApiError(e).message) },
                )
              }
            >
              Remover
            </button>
          )}
        </div>
        <p className="text-xs text-text-secondary">PNG, JPEG ou WebP de até 300 KB.</p>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile()
  const [values, setValues] = useState({ name: user.name, username: user.username, bio: user.bio })
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const dirty = values.name !== user.name || values.username !== user.username || values.bio !== user.bio

  function set(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors(({ [field]: _removed, ...rest }) => rest)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const next: Errors = {}
    const name = values.name.trim()
    const username = values.username.trim().toLowerCase()
    if (name.length < 2 || name.length > 60) next.name = 'O nome deve ter entre 2 e 60 caracteres.'
    if (!USERNAME_PATTERN.test(username)) next.username = 'Use de 3 a 20 letras minúsculas, números, "_" ou ".".'
    if (values.bio.trim().length > 280) next.bio = 'A bio deve ter no máximo 280 caracteres.'
    setErrors(next)
    if (Object.keys(next).length) return

    update.mutate(
      { name, username, bio: values.bio.trim() },
      {
        onSuccess: (saved) => {
          setValues({ name: saved.name, username: saved.username, bio: saved.bio })
          toast.success('Perfil atualizado.')
        },
        onError: (e) => {
          const apiError = toApiError(e)
          if (apiError.fields) setErrors(apiError.fields)
          else setFormError(apiError.message)
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        <Field label="Nome de exibição" required error={errors.name}>
          {(a) => <input {...a} value={values.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" className={inputClass} />}
        </Field>
        <Field label="Nome de usuário" required error={errors.username} hint="Letras minúsculas, números, “_” ou “.”.">
          {(a) => (
            <input
              {...a}
              value={values.username}
              onChange={(e) => set('username', e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className={inputClass}
            />
          )}
        </Field>
        <Field label="E-mail" hint="O e-mail é usado para entrar e não pode ser alterado aqui." className="md:col-span-2">
          {(a) => <input {...a} value={user.email} readOnly className={inputClass} />}
        </Field>
        <Field label="Bio" error={errors.bio} hint={`${values.bio.length}/280`} className="md:col-span-2">
          {(a) => (
            <textarea
              {...a}
              value={values.bio}
              onChange={(e) => set('bio', e.target.value)}
              rows={4}
              maxLength={300}
              className={`${inputClass} h-auto py-2`}
            />
          )}
        </Field>
      </div>
      <FormAlert message={formError} />
      <button type="submit" className={`${buttonClass} self-start`} disabled={update.isPending || !dirty} aria-busy={update.isPending}>
        {update.isPending ? 'Salvando…' : 'Salvar alterações'}
      </button>
    </form>
  )
}

const emptyPasswords = { currentPassword: '', newPassword: '', confirmPassword: '' }

function PasswordForm() {
  const change = useChangePassword()
  const [values, setValues] = useState(emptyPasswords)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function set(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors(({ [field]: _removed, ...rest }) => rest)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const next: Errors = {}
    if (!values.currentPassword) next.currentPassword = 'Informe a senha atual.'
    if (values.newPassword.length < 8) next.newPassword = 'A senha deve ter ao menos 8 caracteres.'
    else if (!/[A-Za-z]/.test(values.newPassword) || !/\d/.test(values.newPassword)) next.newPassword = 'Use letras e números na senha.'
    else if (values.newPassword === values.currentPassword) next.newPassword = 'A nova senha deve ser diferente da atual.'
    if (values.confirmPassword !== values.newPassword) next.confirmPassword = 'As senhas não coincidem.'
    setErrors(next)
    if (Object.keys(next).length) return

    change.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          setValues(emptyPasswords)
          toast.success('Senha alterada. As outras sessões foram encerradas.')
        },
        onError: (e) => {
          const apiError = toApiError(e)
          if (apiError.fields) setErrors(apiError.fields)
          else setFormError(apiError.message)
        },
      },
    )
  }

  const passwordInput = (field: keyof typeof values, autoComplete: string) => (a: Parameters<Parameters<typeof Field>[0]['children']>[0]) => (
    <input {...a} type="password" value={values[field]} onChange={(e) => set(field, e.target.value)} autoComplete={autoComplete} className={inputClass} />
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {/* Ajuda gerenciadores de senha a associar a conta. */}
      <input type="text" name="username" autoComplete="username" hidden readOnly />
      <div className="grid gap-x-6 gap-y-3 md:grid-cols-3">
        <Field label="Senha atual" required error={errors.currentPassword}>
          {passwordInput('currentPassword', 'current-password')}
        </Field>
        <Field label="Nova senha" required error={errors.newPassword} hint={PASSWORD_HINT}>
          {passwordInput('newPassword', 'new-password')}
        </Field>
        <Field label="Confirmar nova senha" required error={errors.confirmPassword}>
          {passwordInput('confirmPassword', 'new-password')}
        </Field>
      </div>
      <FormAlert message={formError} />
      <button type="submit" className={`${buttonClass} self-start`} disabled={change.isPending} aria-busy={change.isPending}>
        {change.isPending ? 'Alterando…' : 'Alterar senha'}
      </button>
    </form>
  )
}

export function ProfilePage() {
  const profile = useProfile()
  const user = profile.data
  if (!user) return null

  return (
    <div className="flex flex-col gap-8 pb-16 md:pb-24">
      <AccountNav current="Perfil" />
      <h1 className="sr-only">Meu perfil</h1>
      {profile.isError && <FormAlert message="Não foi possível atualizar os dados do perfil. Mostrando os dados da sessão." />}

      <section aria-labelledby="profile-title" className={cardClass}>
        <h2 id="profile-title" className="text-[17px]/4 font-bold text-foreground">
          Perfil do colecionador
        </h2>
        <AvatarSection user={user} />
        <ProfileForm key={user.id} user={user} />
      </section>

      <section aria-labelledby="password-title" className={cardClass}>
        <h2 id="password-title" className="text-[17px]/4 font-bold text-foreground">
          Alterar senha
        </h2>
        <PasswordForm />
      </section>
    </div>
  )
}
