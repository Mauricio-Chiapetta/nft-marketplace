import axios from 'axios'

// Toda chamada REST passa por esta instância. O MSW intercepta /api/*.
export const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})
