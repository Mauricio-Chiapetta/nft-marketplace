// O backend é o MSW, que sobe em paralelo à primeira renderização. As
// requisições do Axios esperam por ele (ver src/lib/api.ts).
let resolveReady!: () => void

export const backendReady = new Promise<void>((resolve) => {
  resolveReady = resolve
})

export const markBackendReady = () => resolveReady()
