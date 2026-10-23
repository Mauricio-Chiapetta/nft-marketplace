// Auditoria Lighthouse: build otimizado + `vite preview`, 3 medições por página e
// perfil, mediana por categoria e métricas. Relatórios em lighthouse/reports.
// Uso: pnpm lighthouse  (pula o build com --no-build)
import { execSync, spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { chromium } from '@playwright/test'
import { CHROME_FLAGS, PAGES, PORT, PROFILES, RUNS } from '../lighthouse/config.mjs'

const OUT = 'lighthouse/reports'
const base = `http://localhost:${PORT}`

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`preview não respondeu em ${base}`)
}

if (!process.argv.includes('--no-build')) execSync('pnpm build', { stdio: 'inherit' })
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const server = spawn('pnpm', ['preview', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore' })
const results = []
let chromeVersion = ''
try {
  await waitForServer()
  for (const page of PAGES) {
    for (const [profile, config] of Object.entries(PROFILES)) {
      for (let run = 1; run <= RUNS; run++) {
        // Chrome novo a cada medição: storage, cache e service worker limpos.
        const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: CHROME_FLAGS })
        try {
          const result = await lighthouse(`${base}${page.path}`, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, config)
          const { lhr, report } = result
          chromeVersion = lhr.environment.hostUserAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? chromeVersion
          const file = join(OUT, `${page.name}-${profile}-${run}`)
          writeFileSync(`${file}.report.html`, report[0])
          writeFileSync(`${file}.report.json`, report[1])
          const score = (id) => Math.round((lhr.categories[id]?.score ?? 0) * 100)
          const entry = {
            page: page.name,
            profile,
            run,
            performance: score('performance'),
            accessibility: score('accessibility'),
            bestPractices: score('best-practices'),
            seo: score('seo'),
            lcpMs: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
            cls: Number(lhr.audits['cumulative-layout-shift'].numericValue.toFixed(3)),
            tbtMs: Math.round(lhr.audits['total-blocking-time'].numericValue),
            // Auditorias com peso que reprovaram: base da justificativa das metas não atingidas.
            failing: Object.entries(lhr.categories).flatMap(([category, { auditRefs }]) =>
              auditRefs
                .filter((ref) => ref.weight > 0 && lhr.audits[ref.id].score !== null && lhr.audits[ref.id].score < 0.9)
                .map((ref) => `${category}/${ref.id}`),
            ),
          }
          results.push(entry)
          console.log(JSON.stringify(entry))
        } finally {
          await chrome.kill()
        }
      }
    }
  }
} finally {
  server.kill()
  if (process.platform === 'win32') {
    try {
      execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT} ^| findstr LISTENING') do taskkill /PID %a /F`, { stdio: 'ignore', shell: 'cmd.exe' })
    } catch {
      // já encerrado
    }
  }
}

const keys = ['performance', 'accessibility', 'bestPractices', 'seo', 'lcpMs', 'cls', 'tbtMs']
const medians = []
for (const page of PAGES) {
  for (const profile of Object.keys(PROFILES)) {
    const runs = results.filter((r) => r.page === page.name && r.profile === profile)
    medians.push({ page: page.name, profile, ...Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k]))])) })
  }
}

const { version: lighthouseVersion } = JSON.parse(execSync('node -p "JSON.stringify(require(\'lighthouse/package.json\'))"').toString())
const environment = {
  date: new Date().toISOString(),
  lighthouse: lighthouseVersion,
  chrome: chromeVersion,
  node: process.version,
  os: `${os.type()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0]?.model,
  memoryGb: Math.round(os.totalmem() / 1024 ** 3),
  target: `${base} (vite preview do build de produção, mocks no cenário padrão)`,
  runs: RUNS,
}
writeFileSync(join(OUT, 'summary.json'), JSON.stringify({ environment, medians, runs: results }, null, 2))

const table = [
  '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...medians.map(
    (m) =>
      `| ${m.page} | ${m.profile} | ${m.performance} | ${m.accessibility} | ${m.bestPractices} | ${m.seo} | ${(m.lcpMs / 1000).toFixed(2)} s | ${m.cls} | ${m.tbtMs} ms |`,
  ),
].join('\n')
writeFileSync(
  join(OUT, 'summary.md'),
  `# Lighthouse: medianas de ${RUNS} medições\n\n${table}\n\n## Auditorias reprovadas (todas as medições)\n\n${medians
    .map((m) => {
      const failing = [...new Set(results.filter((r) => r.page === m.page && r.profile === m.profile).flatMap((r) => r.failing))]
      return `- ${m.page} / ${m.profile}: ${failing.length ? failing.join('; ') : 'nenhuma'}`
    })
    .join('\n')}\n\n## Ambiente\n\n${Object.entries(environment)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')}\n`,
)
console.log(`\n${table}`)
