// Cenário 3: cadastro, login, expiração de sessão, logout e troca de usuário.
import { expect, test } from '@playwright/test'
import { mock } from './support/api.ts'
import { ANA, BRUNO, login, logout, start, submitLogin } from './support/app.ts'

test('3. cadastro com validação e conflito, login, expiração, logout e troca de usuário', async ({ page }) => {
  await start(page, '/criar-conta')
  const dialog = page.getByRole('dialog', { name: 'Criar conta' })

  // Validação local, associada aos campos.
  await dialog.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(dialog.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
  await expect(dialog.getByLabel('E-mail')).toHaveAccessibleDescription(/e-mail/i)

  // Conflito vindo da API aparece no campo.
  await dialog.getByLabel('Nome de usuário').fill('Carla Nunes')
  await dialog.getByLabel('E-mail').fill(ANA.email)
  await dialog.getByLabel('Senha', { exact: true }).fill('Senha1234')
  await dialog.getByLabel('Confirmar senha').fill('Senha1234')
  await dialog.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(dialog.getByLabel('E-mail')).toHaveAccessibleDescription(/cadastrad|em uso|existe/i)

  await dialog.getByLabel('E-mail').fill('carla@jungle.dev')
  await dialog.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(dialog).toBeHidden()
  await page.goto('/perfil')
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Carla Nunes')
  await logout(page)

  // Senha errada não entra.
  await page.goto('/entrar')
  const loginDialog = page.getByRole('dialog', { name: 'Entrar' })
  await loginDialog.getByLabel('E-mail').fill(ANA.email)
  await loginDialog.getByLabel('Senha', { exact: true }).fill('errada123')
  await loginDialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(loginDialog.getByText(/incorret|inválid/i).first()).toBeVisible()

  // Login, sessão sobrevive ao refresh.
  await login(page, ANA.email, '/perfil')
  await page.reload()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(ANA.name)

  // Expiração durante a navegação: aviso e volta ao login, retomando a rota depois.
  // O 401 pode vir da navegação ou de uma revalidação em segundo plano; nos dois
  // casos a rota em que o usuário estava vira o `redirect`.
  await mock(page, 'expireSessions')
  await page.getByRole('link', { name: 'Carteiras', exact: true }).first().click({ timeout: 2000 }).catch(() => {})
  await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar.')).toBeVisible()
  await expect(page).toHaveURL(/\/entrar\?redirect=%2F(perfil|carteiras)$/)
  const resumeTo = new URL(page.url()).searchParams.get('redirect')!
  await submitLogin(page, ANA.email)
  await expect(page).toHaveURL(new RegExp(`${resumeTo}$`))
  await page.goto('/carteiras')
  await expect(page.getByText('Cold wallet')).toBeVisible()

  // Troca de usuário: nada da sessão anterior fica visível.
  await logout(page)
  await login(page, BRUNO.email, '/carteiras')
  await expect(page.getByText('MetaMask').first()).toBeVisible()
  await expect(page.getByText('Cold wallet')).toHaveCount(0)
  await page.goto('/pedidos/ord_seed_ana')
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()

  // Rota privada sem sessão leva ao login.
  await logout(page)
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/entrar\?redirect=%2Fperfil/)
})
