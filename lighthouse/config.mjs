// Configuração versionada da auditoria Lighthouse (usada por scripts/lighthouse.mjs).
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

export const RUNS = 3
export const PORT = 4174

/** Páginas auditadas no cenário padrão dos mocks (seed restaurado a cada execução). */
export const PAGES = [
  { name: 'inicio', path: '/' },
  { name: 'detalhe', path: '/nfts/nft_001' },
]

const categories = ['performance', 'accessibility', 'best-practices', 'seo']

// Antivírus da máquina de auditoria (Kaspersky) injeta scripts HTTP em toda página;
// bloqueados para medir só a aplicação. Sem efeito onde o antivírus não existe.
const blockedUrlPatterns = ['*kaspersky-labs.com*']

/**
 * mobile: padrão do Lighthouse (Moto G Power emulado, 4G lento simulado, CPU 4x).
 * desktop: preset oficial `desktop-config` (1350x940, throttling de desktop).
 */
export const PROFILES = {
  mobile: { extends: 'lighthouse:default', settings: { onlyCategories: categories, blockedUrlPatterns } },
  desktop: { ...desktopConfig, settings: { ...desktopConfig.settings, onlyCategories: categories, blockedUrlPatterns } },
}

export const CHROME_FLAGS = ['--headless=new', '--no-sandbox', '--disable-gpu']
