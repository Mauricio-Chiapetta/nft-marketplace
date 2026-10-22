// Cenário 8: perfil, avatar, senha e carteiras, com erros de validação (locais e da API).
import { expect, test, type Page } from '@playwright/test'
import { PASSWORD } from './support/api.ts'
import { ANA, BRUNO, login, logout, start, submitLogin } from './support/app.ts'

// PNG 1x1 válido.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

async function pickAvatar(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /^(Enviar|Trocar) avatar$/ }).click()
  await (await chooser).setFiles(file)
}

test('8a. perfil: dados, avatar e senha com erros de validação', async ({ page }) => {
  await start(page)
  await login(page, ANA.email, '/perfil')
  const save = page.getByRole('button', { name: 'Salvar alterações' })

  // Validação local e conflito vindo da API.
  await page.getByLabel('Nome de exibição').fill('')
  await save.click()
  await expect(page.getByLabel('Nome de exibição')).toHaveAttribute('aria-invalid', 'true')
  await page.getByLabel('Nome de exibição').fill('Ana R. Ribeiro')
  await page.getByLabel('Nome de usuário').fill('brunocosta')
  await save.click()
  await expect(page.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Nome de usuário')).toHaveAccessibleDescription(/uso|existe|indisponível/i)
  await page.getByLabel('Nome de usuário').fill('ana.ribeiro')
  await page.getByLabel('Bio').fill('Arte generativa e fotografia.')
  await save.click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()
  await expect(page.getByLabel('E-mail')).toHaveAttribute('readonly', '')

  // Avatar: tipo e tamanho validados antes do envio; envio e remoção.
  await pickAvatar(page, { name: 'a.gif', mimeType: 'image/gif', buffer: PNG })
  await expect(page.getByText('Envie uma imagem PNG, JPEG ou WebP.')).toBeVisible()
  await pickAvatar(page, { name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(301 * 1024, 1) })
  await expect(page.getByText('A imagem deve ter no máximo 300 KB.')).toBeVisible()
  await pickAvatar(page, { name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByText('Avatar atualizado.')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()

  // Persistem após refresh.
  await page.reload()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana R. Ribeiro')
  await expect(page.getByLabel('Nome de usuário')).toHaveValue('ana.ribeiro')
  await expect(page.getByLabel('Bio')).toHaveValue('Arte generativa e fotografia.')
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()
  await page.getByRole('button', { name: 'Remover', exact: true }).click()
  await expect(page.getByText('Avatar removido.')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toHaveCount(0)

  // Senha: confirmação divergente (local) e senha atual incorreta (API).
  const change = page.getByRole('button', { name: 'Alterar senha' })
  await page.getByRole('textbox', { name: 'Senha atual', exact: true }).fill('errada123')
  await page.getByRole('textbox', { name: 'Nova senha', exact: true }).fill('NovaSenha2026')
  await page.getByLabel('Confirmar nova senha').fill('Outra2026')
  await change.click()
  await expect(page.getByLabel('Confirmar nova senha')).toHaveAttribute('aria-invalid', 'true')
  await page.getByLabel('Confirmar nova senha').fill('NovaSenha2026')
  await change.click()
  await expect(page.getByRole('textbox', { name: 'Senha atual', exact: true })).toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('textbox', { name: 'Senha atual', exact: true }).fill(PASSWORD)
  await change.click()
  await expect(page.getByText('Senha alterada. As outras sessões foram encerradas.')).toBeVisible()

  // A senha antiga deixa de valer; a nova entra.
  await logout(page)
  await page.goto('/entrar')
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await dialog.getByLabel('E-mail').fill(ANA.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/incorret|inválid/i).first()).toBeVisible()
  await submitLogin(page, ANA.email, 'NovaSenha2026')
})

test('8b. carteiras: cadastro, duplicada, edição e troca de papel', async ({ page }) => {
  await start(page)
  await login(page, BRUNO.email, '/carteiras')
  const secondary = page.getByRole('region', { name: 'Carteira secundária' })
  const register = secondary.getByRole('button', { name: 'Cadastrar carteira' })

  await register.click()
  await expect(secondary.getByLabel('Apelido')).toHaveAttribute('aria-invalid', 'true')
  await secondary.getByLabel('Apelido').fill('Cofre frio')
  await secondary.getByLabel('Endereço').fill('0x123')
  await register.click()
  await expect(secondary.getByLabel('Endereço')).toHaveAttribute('aria-invalid', 'true')
  // Duplicada: o endereço já é a principal do Bruno (erro da API).
  await secondary.getByLabel('Endereço').fill('0x2546bcd3c84621e976d8185a91a922ae77ecec30')
  await register.click()
  await expect(secondary.getByLabel('Endereço')).toHaveAccessibleDescription('Esta carteira já está cadastrada.')
  await secondary.getByLabel('Endereço').fill('0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc')
  await register.click()
  await expect(page.getByText('Carteira secundária cadastrada.')).toBeVisible()
  await expect(secondary.getByText('Cofre frio')).toBeVisible()

  // Trocar o papel inverte as duas carteiras.
  await secondary.getByRole('button', { name: /^Editar/ }).click()
  await secondary.getByLabel('Papel').selectOption('primary')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira atualizada.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Carteira principal' }).getByText('Cofre frio')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Carteira secundária' }).getByText('MetaMask')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('region', { name: 'Carteira principal' }).getByText('Cofre frio')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Carteira secundária' }).getByText('MetaMask')).toBeVisible()
})
