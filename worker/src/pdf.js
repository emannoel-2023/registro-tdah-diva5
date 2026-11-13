import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DIVA } from "../../docs/diva-data.js";

// As fontes padrão do PDF só aceitam WinAnsi (Latin-1 + alguns símbolos).
// Acentos do português funcionam; qualquer outro caractere vira "?".
function winAnsi(s) {
  return String(s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/≥/g, ">=")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function wrap(text, font, size, maxWidth) {
  const lines = [];
  for (const para of winAnsi(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) line = test;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

const yesNo = (v) => (v ? "Sim" : "Não");

/**
 * Gera o PDF do registro. Propositalmente NÃO inclui nome nem e-mail.
 * @param {ReturnType<import("../../docs/scoring.js").score>} r
 * @param {Date} date
 * @returns {Promise<Uint8Array>}
 */
export async function buildPdf(r, date) {
  const doc = await PDFDocument.create();
  doc.setTitle(winAnsi(DIVA.title));
  doc.setProducer("");
  doc.setCreator("");
  doc.setCreationDate(date);
  doc.setModificationDate(date);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28, H = 841.89, M = 50; // A4
  const maxW = W - 2 * M;
  const ink = rgb(0.11, 0.12, 0.14);
  const muted = rgb(0.38, 0.4, 0.44);
  const accent = rgb(0.18, 0.36, 0.83);
  const line = rgb(0.85, 0.87, 0.9);
  const yes = rgb(0.1, 0.5, 0.22);
  const no = rgb(0.6, 0.15, 0.1);

  let page;
  let y;
  let pageNo = 0;
  const newPage = () => {
    page = doc.addPage([W, H]);
    pageNo++;
    y = H - M;
    page.drawText(winAnsi(`${DIVA.title} - página ${pageNo}`), { x: M, y: 24, size: 8, font: regular, color: muted });
  };
  newPage();

  const ensure = (needed) => {
    if (y - needed < M) newPage();
  };
  const write = (text, { font = regular, size = 10, color = ink, gap = 3, indent = 0 } = {}) => {
    for (const l of wrap(text, font, size, maxW - indent)) {
      ensure(size + gap);
      y -= size;
      page.drawText(l, { x: M + indent, y, size, font, color });
      y -= gap;
    }
  };
  const space = (n) => { y -= n; };
  const rule = () => {
    ensure(10);
    space(4);
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: line });
    space(8);
  };
  const heading = (text) => {
    ensure(40);
    space(8);
    write(text, { font: bold, size: 13, color: accent, gap: 6 });
  };
  // Linha de tabela: [texto, x relativo, fonte, cor]
  const row = (cols, { size = 10, gap = 5 } = {}) => {
    ensure(size + gap);
    y -= size;
    for (const [t, x, f = regular, c = ink] of cols) page.drawText(winAnsi(t), { x: M + x, y, size, font: f, color: c });
    y -= gap;
  };

  // Cabeçalho
  write(DIVA.title, { font: bold, size: 18, gap: 5 });
  write(DIVA.subtitle, { size: 9, color: muted });
  write(
    "Preenchido em " +
      date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" }),
    { size: 9, color: muted }
  );
  space(8);
  write(DIVA.disclaimer, { size: 9.5, color: no, gap: 3 });
  rule();

  // Resumo
  heading("Resumo de sintomas");
  row([["", 0], ["Idade adulta", 300, bold], ["Infância", 400, bold]]);
  row([["Déficit de atenção (A1-A9)", 0], [`${r.counts.aAdult} / 9`, 300], [`${r.counts.aChild} / 9`, 400]]);
  row([["Hiperatividade/impulsividade (HI1-HI9)", 0], [`${r.counts.hAdult} / 9`, 300], [`${r.counts.hChild} / 9`, 400]]);
  row([["Áreas com prejuízo (de 5)", 0], [String(r.impairment.areasAdult), 300], [String(r.impairment.areasChild), 400]]);

  heading("Folha de pontuação (critérios avaliáveis por autorrelato)");
  const crit = [
    ["Infância: 3 ou mais sintomas de A e/ou HI", r.criteria.childSeveral],
    ["Idade adulta: 5 ou mais sintomas de A", r.criteria.adultA],
    ["Idade adulta: 5 ou mais sintomas de HI", r.criteria.adultHI],
    ["Sintomas presentes desde antes dos 12 anos", r.criteria.onsetBefore12],
    ["Prejuízo em 2 ou mais áreas - idade adulta", r.criteria.impairAdult],
    ["Prejuízo em 2 ou mais áreas - infância", r.criteria.impairChild],
  ];
  for (const [t, v] of crit) row([[t, 0], [yesNo(v), 400, bold, v ? yes : no]]);
  space(4);
  write(`Padrão atual: ${r.pattern}.`, { font: bold, size: 10 });
  write(
    r.allMet
      ? "Os critérios avaliáveis por autorrelato foram atendidos. Isto indica a necessidade de avaliação profissional; não confirma diagnóstico."
      : "Nem todos os critérios avaliáveis por autorrelato foram atendidos. Ainda assim, só um profissional pode concluir.",
    { size: 9.5, color: muted }
  );
  write(
    "Não avaliados aqui (exclusivos do profissional): se outro transtorno explica melhor os sintomas (critério E), " +
      "informações de familiares/parceiro(a) e relatórios escolares.",
    { size: 9.5, color: muted }
  );
  if (!r.onset.always && r.onset.age) write(`Idade de início informada: ${r.onset.age} anos.`, { size: 10 });

  // Detalhes
  const symptomBlock = (s) => {
    ensure(60);
    space(6);
    write(`${s.id} - ${s.topic}`, { font: bold, size: 10.5 });
    if (s.question) write(s.question, { size: 9, color: muted });
    for (const [label, present, ex, note] of [
      ["Idade adulta", s.adult, s.adultExamples, s.adultNote],
      ["Infância", s.child, s.childExamples, s.childNote],
    ]) {
      row([[`${label}:`, 10], [present ? "presente" : "ausente", 90, bold, present ? yes : no]], { size: 9.5, gap: 3 });
      for (const e of ex) write(`- ${e}`, { size: 9, indent: 22, gap: 2 });
      if (note && ex.some((e) => e.endsWith("*"))) {
        write(`* ${note}`, { size: 8.5, indent: 22, color: muted, gap: 2 });
      }
    }
  };

  heading("Parte 1 - Déficit de atenção");
  r.symptoms.filter((s) => s.domain === "A").forEach(symptomBlock);
  heading("Parte 2 - Hiperatividade / impulsividade");
  r.symptoms.filter((s) => s.domain === "HI").forEach(symptomBlock);

  heading("Parte 3 - Início e prejuízos");
  write(DIVA.onset.question, { size: 9.5, color: muted });
  write(
    r.onset.always
      ? "Resposta: Sim, vários sintomas antes dos 12 anos."
      : `Resposta: Não. Início aos ${r.onset.age ?? "?"} anos.`,
    { font: bold, size: 10 }
  );
  for (const [label, list] of [
    ["Prejuízos na idade adulta", r.impairment.adult],
    ["Prejuízos na infância e adolescência", r.impairment.child],
  ]) {
    space(6);
    write(label, { font: bold, size: 10.5 });
    for (const d of list) {
      write(`${d.name}: ${d.examples.length ? d.examples.length + " marcado(s)" : "nenhum"}`, { size: 9.5, indent: 10 });
      for (const e of d.examples) write(`- ${e}`, { size: 9, indent: 22, gap: 2 });
    }
  }

  return doc.save();
}
