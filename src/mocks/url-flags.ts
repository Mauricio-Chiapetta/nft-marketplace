// Primeiro import de main.tsx: roda antes de o router ler a URL, então
// `?mockReset` some da barra de endereço antes da primeira renderização
// (e um refresh não reseta de novo). O reset em si acontece no boot do mock.
const url = new URL(window.location.href)

export const mockResetRequested = url.searchParams.has('mockReset')

if (mockResetRequested) {
  url.searchParams.delete('mockReset')
  window.history.replaceState(window.history.state, '', url)
}
