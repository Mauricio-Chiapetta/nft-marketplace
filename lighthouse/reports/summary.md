# Lighthouse: medianas de 3 medições

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| inicio | mobile | 69 | 100 | 82 | 100 | 4.56 s | 0.004 | 327 ms |
| inicio | desktop | 98 | 97 | 81 | 100 | 1.03 s | 0.002 | 1 ms |
| detalhe | mobile | 75 | 100 | 82 | 100 | 4.27 s | 0 | 229 ms |
| detalhe | desktop | 98 | 100 | 81 | 100 | 1.02 s | 0 | 0 ms |

## Auditorias reprovadas (todas as medições)

- inicio / mobile: performance/first-contentful-paint; performance/largest-contentful-paint; performance/total-blocking-time; best-practices/is-on-https
- inicio / desktop: accessibility/target-size; best-practices/is-on-https
- detalhe / mobile: performance/first-contentful-paint; performance/largest-contentful-paint; performance/total-blocking-time; best-practices/is-on-https
- detalhe / desktop: best-practices/is-on-https

## Ambiente

- date: 2026-10-23T06:37:01.384Z
- lighthouse: 12.8.2
- chrome: 156.0.0.0
- node: v20.20.0
- os: Windows_NT 10.0.19045 (x64)
- cpu: Intel(R) Core(TM) i3-6100 CPU @ 3.70GHz
- memoryGb: 16
- target: http://localhost:4174 (vite preview do build de produção, mocks no cenário padrão)
- runs: 3
