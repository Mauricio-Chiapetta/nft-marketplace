// Helpers dos testes para falar com o backend simulado. As chamadas partem da
// página (fetch) para passarem pelo service worker do MSW; `page.request` não
// seria interceptado.
import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'Jungle@2026'

export interface CallOptions {
  method?: string
  body?: unknown
  token?: string
  headers?: Record<string, string>
}

export interface CallResult<T> {
  status: number
  body: T
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string>; details?: unknown }
}

export function call<T = Record<string, unknown>>(page: Page, path: string, options: CallOptions = {}) {
  return page.evaluate(
    async ({ path, options }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options.headers }
      if (options.token) headers.Authorization = `Bearer ${options.token}`
      const response = await fetch(`/api${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
      const text = await response.text()
      return { status: response.status, body: text ? JSON.parse(text) : null }
    },
    { path, options },
  ) as Promise<CallResult<T>>
}

/** Executa um método de `window.__mock` (controles do servidor simulado). */
export function mock<T = unknown>(page: Page, method: string, ...args: unknown[]) {
  return page.evaluate(
    ({ method, args }) => {
      const control = (window as unknown as { __mock: Record<string, (...a: unknown[]) => unknown> }).__mock
      return control[method](...args)
    },
    { method, args },
  ) as Promise<T>
}

export async function login(page: Page, email: string) {
  const { status, body } = await call<{ token: string }>(page, '/auth/login', {
    method: 'POST',
    body: { email, password: PASSWORD },
  })
  expect(status).toBe(200)
  return body.token
}
