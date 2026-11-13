// Configuração PÚBLICA do site. Nada aqui é segredo:
// - WORKER_URL: endereço do Worker (qualquer visitante vê isso no navegador).
// - TURNSTILE_SITE_KEY: a chave "site key" do Cloudflare Turnstile é pública
//   por definição. A chave SECRETA fica só no Worker (como secret), nunca aqui.
//
// Preencha os dois valores depois de criar o Worker e o widget Turnstile
// (veja o README). Se o Worker estiver num domínio próprio em vez de
// *.workers.dev, ajuste também o "connect-src" do CSP em index.html.

export const CONFIG = Object.freeze({
  WORKER_URL: "", // ex.: "https://resultado-teste.SEU-SUBDOMINIO.workers.dev"
  TURNSTILE_SITE_KEY: "", // ex.: "0x4AAAAAAA..."
});
