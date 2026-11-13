// Cloudflare Worker: recebe as respostas, calcula o resultado, gera o PDF,
// (opcionalmente) envia por e-mail e devolve o PDF ao navegador.
//
// NÃO ARMAZENA NADA: não há banco, KV, R2, D1, cache nem console.log.
// O e-mail só existe na memória durante esta requisição.
//
// Configuração (todas como *secrets* do Worker, nenhuma no código):
//   ALLOWED_ORIGIN    ex.: https://seu-usuario.github.io   (origem exata do site)
//   TURNSTILE_SECRET  chave secreta do Cloudflare Turnstile
//   RESEND_API_KEY    chave da API do Resend (opcional; sem ela, só baixa o PDF)
//   MAIL_FROM         ex.: Resultado <resultado@seudominio.com>
// Bindings opcionais (wrangler.toml): IP_LIMITER, EMAIL_LIMITER (rate limit).

import { DIVA } from "../../docs/diva-data.js";
import { score } from "../../docs/scoring.js";
import { buildPdf } from "./pdf.js";

const MAX_BODY_BYTES = 4096;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch {
      // Sem log de propósito: o erro poderia conter dados da requisição.
      return reply(500, { error: "internal" }, corsHeaders(request, env));
    }
  },
};

async function handle(request, env) {
  if (!env.ALLOWED_ORIGIN || !env.TURNSTILE_SECRET) {
    return reply(500, { error: "not_configured" });
  }

  const url = new URL(request.url);
  if (url.pathname !== "/api/result") return reply(404, { error: "not_found" });

  // Só aceita chamadas vindas do seu site.
  const cors = corsHeaders(request, env);
  if (!cors) return reply(403, { error: "origin" });

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...BASE_HEADERS, ...cors } });
  if (request.method !== "POST") return reply(405, { error: "method" }, cors);

  const ctype = request.headers.get("Content-Type") || "";
  if (!ctype.toLowerCase().startsWith("application/json")) return reply(415, { error: "content_type" }, cors);

  const ip = request.headers.get("CF-Connecting-IP") || "";

  // Rate limit por IP (contador em memória da Cloudflare; o IP vai como hash).
  if (env.IP_LIMITER) {
    const { success } = await env.IP_LIMITER.limit({ key: await sha256(ip || "unknown") });
    if (!success) return reply(429, { error: "rate_limited" }, cors);
  }

  const raw = await readLimited(request, MAX_BODY_BYTES);
  if (raw === null) return reply(413, { error: "too_large" }, cors);

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply(400, { error: "json" }, cors);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply(400, { error: "body" }, cors);

  const { answers, token } = body;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  // E-mail com dados de saúde só com consentimento explícito (LGPD).
  if (email && body.consent !== true) return reply(400, { error: "consent" }, cors);

  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return reply(403, { error: "captcha" }, cors);
  }
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
    return reply(400, { error: "email" }, cors);
  }

  const summary = score(answers);
  if (!summary) return reply(400, { error: "answers" }, cors);

  // Verificação anti-robô (token de uso único).
  if (!(await verifyTurnstile(token, ip, env))) return reply(403, { error: "captcha" }, cors);

  const pdfBytes = await buildPdf(summary, new Date());
  const pdfB64 = bytesToBase64(pdfBytes);

  let emailSent = false;
  if (email && env.RESEND_API_KEY && env.MAIL_FROM) {
    // Limite extra por destinatário, para dificultar usar o site para
    // encher a caixa de alguém. A chave é um hash, não o e-mail.
    let allowed = true;
    if (env.EMAIL_LIMITER) {
      ({ success: allowed } = await env.EMAIL_LIMITER.limit({ key: await sha256(email.toLowerCase()) }));
    }
    if (allowed) emailSent = await sendEmail(email, summary, pdfB64, env);
  }

  return reply(
    200,
    {
      counts: summary.counts,
      criteria: summary.criteria,
      allMet: summary.allMet,
      pattern: summary.pattern,
      emailSent,
      pdf: pdfB64,
    },
    cors
  );
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || !env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function reply(status, obj, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...BASE_HEADERS, ...(extra || {}), "Content-Type": "application/json; charset=utf-8" },
  });
}

// Lê o corpo parando assim que passar do limite (não confia no Content-Length).
async function readLimited(request, limit) {
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

async function verifyTurnstile(token, ip, env) {
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!res.ok) return false;
  const data = await res.json();
  if (data.success !== true) return false;
  // Garante que o token foi gerado no SEU site e para esta ação.
  const expectedHost = new URL(env.ALLOWED_ORIGIN).hostname;
  if (data.hostname && data.hostname !== expectedHost) return false;
  if (data.action && data.action !== "result") return false;
  return true;
}

async function sendEmail(to, summary, pdfB64, env) {
  // O corpo do e-mail não traz respostas nem sintomas: só um aviso.
  // Os detalhes ficam apenas no PDF anexado.
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1c1f24;max-width:560px">` +
    `<h2 style="margin:0 0 12px">${esc(DIVA.title)}</h2>` +
    `<p>Segue em anexo o PDF com as respostas que você preencheu.</p>` +
    `<p><strong>Este registro não é um diagnóstico.</strong> Leve o PDF para um(a) ` +
    `profissional de saúde mental analisar.</p>` +
    `<p style="color:#5d6570;font-size:13px">Você recebeu este e-mail porque informou este ` +
    `endereço no formulário. Nenhuma resposta ou endereço foi armazenado.</p></div>`;
  const text =
    `${DIVA.title}

Segue em anexo o PDF com as respostas que você preencheu.
` +
    `Este registro não é um diagnóstico. Leve o PDF para um(a) profissional de saúde mental analisar.

` +
    `Nenhuma resposta ou endereço foi armazenado.`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [to],
        subject: "Seu registro de sintomas (PDF)",
        html,
        text,
        attachments: [{ filename: "registro-sintomas.pdf", content: pdfB64 }],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

async function sha256(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let bin = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(bin);
}
