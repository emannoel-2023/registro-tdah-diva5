import { CONFIG } from "./config.js";
import { DIVA, TODO, isFilled } from "./diva-data.js";
import { score } from "./scoring.js";

// Regras de privacidade deste arquivo:
// - nunca usa localStorage/sessionStorage/IndexedDB/cookies;
// - nunca usa innerHTML (tudo via textContent => sem XSS);
// - sem servidor configurado, respostas e PDF ficam somente no navegador;
// - com servidor configurado, as respostas vão no corpo de UMA requisição;
//   o e-mail é apagado do campo assim que a resposta chega.

const $ = (id) => document.getElementById(id);
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const LAST_STEP = 4;
const TOTAL_ANSWERS = DIVA.symptoms.length * 2 + 1;

let step = 0;
let widgetId = null;
let turnstileReady = null;
let dirty = false;
const configured = /^https:\/\//.test(CONFIG.WORKER_URL) && Boolean(CONFIG.TURNSTILE_SITE_KEY);

function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "text") n.textContent = v;
    else if (k === "class") n.className = v;
    else n.setAttribute(k, v);
  }
  for (const c of children) if (c) n.append(c);
  return n;
}

// ---------------------------------------------------------------- renderização

function checkbox(name, index, text) {
  const isTodo = text === TODO;
  return el("label", { class: "check" + (isTodo ? " placeholder" : "") }, [
    el("input", { type: "checkbox", name, value: String(index) }),
    el("span", { text: isTodo ? `Exemplo ${index + 1} (texto a preencher)` : text }),
  ]);
}

function examplesBox(name, title, list, note = "") {
  const count = el("span", { class: "ex-count", "data-count-for": name });
  const box = el("details", {}, [
    el("summary", {}, [el("span", { text: title }), count]),
    el("div", { class: "examples" }, list.map((t, i) => checkbox(name, i, t))),
    note ? el("p", { class: "hint", text: "* " + note }) : null,
  ]);
  box.addEventListener("change", () => {
    const n = box.querySelectorAll("input:checked").length;
    count.textContent = n ? `${n} marcado${n > 1 ? "s" : ""}` : "";
  });
  return box;
}

function ynGroup(name, labelText) {
  const id = name + "-lbl";
  return el("div", {}, [
    el("div", { class: "yn-label", id, text: labelText }),
    el("div", { class: "yn", role: "radiogroup", "aria-labelledby": id }, [
      el("label", { class: "yn-btn" }, [el("input", { type: "radio", name, value: "1" }), el("span", { text: "Sim" })]),
      el("label", { class: "yn-btn" }, [el("input", { type: "radio", name, value: "0" }), el("span", { text: "Não" })]),
    ]),
  ]);
}

function symptomCard(s, i) {
  const period = (key, label, sub, list, note) =>
    el("div", { class: "period", id: `p-${i}-${key}` }, [
      el("div", { class: "period-label" }, [document.createTextNode(label + " "), el("small", { text: sub })]),
      examplesBox(`ex-${i}-${key}`, "Ver exemplos", list, note),
      ynGroup(`s-${i}-${key}`, "Este sintoma está presente?"),
    ]);
  return el("article", { class: "card symptom", id: `sym-${i}` }, [
    el("div", { class: "sym-head" }, [el("span", { class: "badge", text: s.id }), el("h3", { text: s.topic })]),
    s.question !== TODO ? el("p", { class: "question", text: s.question }) : null,
    el("div", { class: "periods" }, [
      period("a", "Idade adulta", "(últimos 6 meses)", s.adult, s.adultNote),
      period("c", "Infância", "(5 a 12 anos)", s.child, s.childNote),
    ]),
  ]);
}

function render() {
  document.title = DIVA.title;
  $("title").textContent = DIVA.title;
  $("subtitle").textContent = DIVA.subtitle;
  $("intro").textContent = DIVA.intro;
  $("disclaimer").textContent = DIVA.disclaimer;
  $("onset-question").textContent = DIVA.onset.question;

  DIVA.symptoms.forEach((s, i) => $(s.domain === "A" ? "part-A" : "part-HI").append(symptomCard(s, i)));
  DIVA.impairment.adult.forEach((d, k) => $("impair-adult").append(examplesBox(`ia-${k}`, d.name, d.examples)));
  DIVA.impairment.child.forEach((d, k) => $("impair-child").append(examplesBox(`ic-${k}`, d.name, d.examples)));

  if (!isFilled()) {
    const w = $("fill-warning");
    w.textContent =
      "Modo de demonstração: os textos oficiais das perguntas e exemplos ainda não foram preenchidos em diva-data.js.";
    w.hidden = false;
  }
}

// ---------------------------------------------------------------- respostas

const radio = (name) => {
  const r = document.querySelector(`input[name="${name}"]:checked`);
  return r ? Number(r.value) : null;
};
const mask = (name) => {
  let m = 0;
  document.querySelectorAll(`input[name="${name}"]:checked`).forEach((c) => (m |= 1 << Number(c.value)));
  return m;
};

function collect() {
  const s = DIVA.symptoms.map((_, i) => [radio(`s-${i}-a`), radio(`s-${i}-c`), mask(`ex-${i}-a`), mask(`ex-${i}-c`)]);
  const always = radio("onset");
  const ageRaw = $("onset-age").value.trim();
  const age = always === 0 && /^\d{1,2}$/.test(ageRaw) && Number(ageRaw) >= 1 ? Number(ageRaw) : -1;
  return {
    s,
    b: [always, age],
    ia: DIVA.impairment.adult.map((_, k) => mask(`ia-${k}`)),
    ic: DIVA.impairment.child.map((_, k) => mask(`ic-${k}`)),
  };
}

function answeredCount() {
  let n = 0;
  DIVA.symptoms.forEach((_, i) => {
    if (radio(`s-${i}-a`) !== null) n++;
    if (radio(`s-${i}-c`) !== null) n++;
  });
  if (radio("onset") !== null) n++;
  return n;
}

function updateProgress() {
  const n = answeredCount();
  $("progress-fill").style.width = `${Math.round((n / TOTAL_ANSWERS) * 100)}%`;
  $("progress-text").textContent = `${n}/${TOTAL_ANSWERS}`;
}

// ---------------------------------------------------------------- etapas

function validateStep(n) {
  if (n === 1 || n === 2) {
    const domain = n === 1 ? "A" : "HI";
    let first = null;
    DIVA.symptoms.forEach((s, i) => {
      if (s.domain !== domain) return;
      for (const key of ["a", "c"]) {
        const missing = radio(`s-${i}-${key}`) === null;
        $(`p-${i}-${key}`).classList.toggle("missing", missing);
        if (missing && !first) first = $(`p-${i}-${key}`);
      }
      const card = $(`sym-${i}`);
      card.classList.toggle("missing", Boolean(card.querySelector(".period.missing")));
    });
    if (first) {
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      return "Responda Sim ou Não nos itens destacados.";
    }
  }
  if (n === 3) {
    const card = $("onset-card");
    const missing = radio("onset") === null;
    card.classList.toggle("missing", missing);
    if (missing) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      return "Responda a pergunta sobre o início dos sintomas.";
    }
    const age = $("onset-age").value.trim();
    if (radio("onset") === 0 && age && !(/^\d{1,2}$/.test(age) && Number(age) >= 1)) {
      $("onset-age").focus();
      return "Idade inválida (use um número de 1 a 99).";
    }
  }
  return null;
}

function showStep(n) {
  step = n;
  document.querySelectorAll(".step").forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
  const current = document.querySelector(`.step[data-step="${n}"]`);
  $("topbar-title").textContent = current.dataset.title;
  $("prev").hidden = n === 0;
  $("next").hidden = n === LAST_STEP;
  $("step-nav").classList.toggle("static", n === LAST_STEP);
  $("next").textContent = n === 0 ? "Começar" : n === LAST_STEP - 1 ? "Revisar" : "Próximo";
  setStatus("");
  if ($("nav-msg")) $("nav-msg").textContent = "";
  if (n === LAST_STEP) enterFinalStep();
  window.scrollTo(0, 0);
}

function next() {
  const err = validateStep(step);
  if (err) return toast(err);
  if (step < LAST_STEP) showStep(step + 1);
}

function toast(msg) {
  // mensagem curta perto dos botões de navegação
  let t = $("nav-msg");
  if (!t) {
    t = el("p", { id: "nav-msg", class: "status error", role: "alert" });
    $("step-nav").prepend(t);
  }
  t.textContent = msg;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.textContent = ""), 5000);
}

function fillSummary(dl, r) {
  dl.textContent = "";
  const rows = [
    ["Desatenção – idade adulta", `${r.counts.aAdult} de 9`],
    ["Desatenção – infância", `${r.counts.aChild} de 9`],
    ["Hiperatividade – idade adulta", `${r.counts.hAdult} de 9`],
    ["Hiperatividade – infância", `${r.counts.hChild} de 9`],
  ];
  if (r.impairment) {
    rows.push(["Áreas com prejuízo – adulto", `${r.impairment.areasAdult} de 5`]);
    rows.push(["Áreas com prejuízo – infância", `${r.impairment.areasChild} de 5`]);
  }
  for (const [k, v] of rows) dl.append(el("dt", { text: k }), el("dd", { text: v }));
}

function enterFinalStep() {
  const r = score(collect());
  if (r) fillSummary($("summary"), r);
  if (!configured) {
    setStatus("O PDF será gerado no seu aparelho, sem enviar suas respostas.");
    return;
  }
  ensureTurnstile();
}

// ---------------------------------------------------------------- envio

function setStatus(msg, kind = "") {
  const s = $("status");
  s.textContent = msg;
  s.className = "status" + (kind ? " " + kind : "");
}

function loadTurnstileScript() {
  if (!turnstileReady) {
    turnstileReady = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("turnstile"));
      document.head.append(s);
    });
  }
  return turnstileReady;
}

function ensureTurnstile() {
  loadTurnstileScript()
    .then(() => {
      if (widgetId !== null) return;
      widgetId = window.turnstile.render("#turnstile", {
        sitekey: CONFIG.TURNSTILE_SITE_KEY,
        action: "result",
        language: "pt-br",
        size: "flexible",
      });
    })
    .catch(() => setStatus("Não foi possível carregar a verificação anti-robô. Desative bloqueadores e recarregue.", "error"));
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function downloadPdf(bytes) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: "registro-sintomas.pdf" });
  document.body.append(a);
  a.click();
  a.remove();
  // A URL fica viva até recarregar a página, para o link "Baixar novamente".
  return url;
}

const ERRORS = {
  400: "Respostas inválidas. Recarregue a página e tente novamente.",
  403: "Verificação anti-robô falhou. Tente novamente.",
  413: "Requisição grande demais.",
  429: "Muitas tentativas. Aguarde um minuto e tente de novo.",
};

async function onSubmit(ev) {
  ev.preventDefault();
  if (step !== LAST_STEP) return;

  const answers = collect();
  const summary = score(answers);
  if (!summary) {
    setStatus("Há respostas faltando. Volte e confira as etapas anteriores.", "error");
    return;
  }

  if (!configured) {
    const btn = $("submit");
    btn.disabled = true;
    setStatus("Gerando seu PDF…");
    try {
      const { buildPdf } = await import("./pdf.js");
      const bytes = await buildPdf(summary);
      showResult(summary, false, downloadPdf(bytes));
      setStatus("");
    } catch {
      setStatus("Não foi possível gerar o PDF. Confira sua conexão e tente novamente; suas respostas continuam nesta página.", "error");
    } finally {
      btn.disabled = false;
    }
    return;
  }

  const emailInput = $("email");
  const email = emailInput.value.trim();
  const consent = $("consent").checked;
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
    setStatus("E-mail inválido.", "error");
    emailInput.focus();
    return;
  }
  if (email && !consent) {
    setStatus("Para enviar por e-mail, marque a autorização.", "error");
    $("consent").focus();
    return;
  }

  const token = window.turnstile && widgetId !== null ? window.turnstile.getResponse(widgetId) : "";
  if (!token) {
    setStatus("Aguarde a verificação anti-robô acima concluir.", "error");
    return;
  }

  const btn = $("submit");
  btn.disabled = true;
  setStatus("Gerando seu PDF…");

  try {
    const res = await fetch(CONFIG.WORKER_URL.replace(/\/+$/, "") + "/api/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, email, consent: Boolean(email && consent), token }),
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    emailInput.value = "";
    $("consent").checked = false;
    $("consent-wrap").hidden = true;

    if (!res.ok) {
      setStatus(ERRORS[res.status] || "Erro no servidor. Tente novamente mais tarde.", "error");
      return;
    }
    const data = await res.json();
    if (typeof data.pdf !== "string" || !data.counts) throw new Error("bad response");

    const url = downloadPdf(base64ToBytes(data.pdf));
    showResult(data, Boolean(email), url);
    setStatus("");
  } catch {
    setStatus("Não foi possível conectar ao servidor. Tente novamente.", "error");
  } finally {
    btn.disabled = false;
    if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
  }
}

function showResult(data, askedEmail, url) {
  dirty = false;
  let note = "Seu PDF está pronto. Se o download não iniciar, use o link abaixo.";
  if (askedEmail) {
    note += data.emailSent
      ? " Uma cópia foi enviada para o e-mail informado (confira também o spam)."
      : " Não foi possível enviar o e-mail agora; guarde o PDF baixado.";
  }
  const p = $("result-note");
  p.textContent = note + " ";
  // Link de reserva: alguns celulares bloqueiam o download automático.
  p.append(el("a", { href: url, download: "registro-sintomas.pdf", text: "Baixar novamente" }));
  fillSummary($("result-summary"), score(collect()) || data);
  $("form").hidden = true;
  $("result").hidden = false;
  $("topbar-title").textContent = "Concluído";
  window.scrollTo({ top: 0 });
}

function restart() {
  dirty = false;
  location.reload();
}

// ---------------------------------------------------------------- início

function init() {
  render();
  showStep(0);
  updateProgress();

  const form = $("form");
  form.addEventListener("submit", onSubmit);
  form.addEventListener("change", (e) => {
    dirty = true;
    updateProgress();
    const t = e.target;
    if (t.name === "onset") $("onset-age-wrap").hidden = t.value !== "0";
    if (t.type === "radio" && t.name.startsWith("s-")) {
      const p = t.closest(".period");
      p.classList.remove("missing");
      const card = t.closest(".symptom");
      if (!card.querySelector(".period.missing")) card.classList.remove("missing");
    }
    if (t.name === "onset") $("onset-card").classList.remove("missing");
  });
  // Enter dentro do formulário não deve pular etapas.
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && step !== LAST_STEP) e.preventDefault();
  });
  $("email").addEventListener("input", () => ($("consent-wrap").hidden = $("email").value.trim() === ""));
  $("next").addEventListener("click", next);
  $("prev").addEventListener("click", () => step > 0 && showStep(step - 1));
  $("restart").addEventListener("click", restart);
  window.addEventListener("beforeunload", (e) => {
    if (dirty) e.preventDefault();
  });

  $("email-options").hidden = !configured;
  $("local-pdf-note").hidden = configured;
  if (configured) {
    $("privacy-note").textContent = "Privacidade: não pedimos nome. Para gerar o PDF, suas respostas são enviadas ao servidor sem cadastro ou banco de dados. Se você autorizar o envio por e-mail, o PDF também passa pelo provedor de e-mail.";
    loadTurnstileScript().catch(() => {});
  }
}

init();
