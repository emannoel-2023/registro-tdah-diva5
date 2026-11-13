// Validação das respostas + pontuação segundo a folha de pontuação da DIVA-5.
// Usado pelo site (resumo na tela) e pelo Worker (que é quem gera o PDF),
// então o resultado nunca depende do que o navegador "diz" que é.
//
// Formato das respostas (compacto, só números):
// {
//   s:  [[adulto, infancia, mascaraExAdulto, mascaraExInfancia], ...18],
//         adulto/infancia: 1 = sintoma presente, 0 = ausente
//         mascara: bit i ligado = exemplo i marcado
//   b:  [sempre, idade]   sempre: 1 = sim (antes dos 12), 0 = não
//                          idade: idade de início se sempre = 0 (1..99) ou -1
//   ia: [mascara, ...5]   prejuízos na idade adulta, por área
//   ic: [mascara, ...5]   prejuízos na infância, por área
// }

import { DIVA, label } from "./diva-data.js";

const isBit = (v) => v === 0 || v === 1;
const isMask = (v, n) => Number.isInteger(v) && v >= 0 && v < 2 ** n;
const bits = (mask, n) => {
  const out = [];
  for (let i = 0; i < n; i++) if (mask & (1 << i)) out.push(i);
  return out;
};

/** Retorna o resumo completo, ou null se as respostas forem inválidas. */
export function score(answers) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  const { s, b, ia, ic } = answers;
  const syms = DIVA.symptoms;
  const impA = DIVA.impairment.adult;
  const impC = DIVA.impairment.child;

  if (!Array.isArray(s) || s.length !== syms.length) return null;
  if (!Array.isArray(b) || b.length !== 2) return null;
  if (!Array.isArray(ia) || ia.length !== impA.length) return null;
  if (!Array.isArray(ic) || ic.length !== impC.length) return null;

  const symptoms = [];
  for (let i = 0; i < syms.length; i++) {
    const row = s[i];
    const def = syms[i];
    if (!Array.isArray(row) || row.length !== 4) return null;
    const [a, c, am, cm] = row;
    if (!isBit(a) || !isBit(c) || !isMask(am, def.adult.length) || !isMask(cm, def.child.length)) return null;
    symptoms.push({
      id: def.id,
      domain: def.domain,
      topic: def.topic,
      question: label(def.question, ""),
      adultNote: def.adultNote || "",
      childNote: def.childNote || "",
      adult: a === 1,
      child: c === 1,
      adultExamples: bits(am, def.adult.length).map((k) => label(def.adult[k], `Exemplo ${k + 1}`)),
      childExamples: bits(cm, def.child.length).map((k) => label(def.child[k], `Exemplo ${k + 1}`)),
    });
  }

  const [always, age] = b;
  if (!isBit(always) || !Number.isInteger(age)) return null;
  if (always === 1 && age !== -1) return null;
  if (always === 0 && !(age === -1 || (age >= 1 && age <= 99))) return null;

  const domains = (masks, defs) => {
    const out = [];
    for (let i = 0; i < defs.length; i++) {
      if (!isMask(masks[i], defs[i].examples.length)) return null;
      out.push({
        name: defs[i].name,
        examples: bits(masks[i], defs[i].examples.length).map((k) => label(defs[i].examples[k], `Exemplo ${k + 1}`)),
      });
    }
    return out;
  };
  const impAdult = domains(ia, impA);
  const impChild = domains(ic, impC);
  if (!impAdult || !impChild) return null;

  const count = (domain, period) => symptoms.filter((x) => x.domain === domain && x[period]).length;
  const counts = {
    aAdult: count("A", "adult"),
    aChild: count("A", "child"),
    hAdult: count("HI", "adult"),
    hChild: count("HI", "child"),
  };
  const areasAdult = impAdult.filter((d) => d.examples.length > 0).length;
  const areasChild = impChild.filter((d) => d.examples.length > 0).length;

  // Folha de pontuação da DIVA-5 (critérios A a D; o E só um profissional avalia).
  const criteria = {
    childSeveral: counts.aChild >= 3 || counts.hChild >= 3, // A: vários (≥3) na infância
    adultA: counts.aAdult >= 5, // A: ≥5 de desatenção na vida adulta
    adultHI: counts.hAdult >= 5, // A: ≥5 de hiperatividade/impulsividade
    onsetBefore12: always === 1, // B
    impairAdult: areasAdult >= 2, // C/D
    impairChild: areasChild >= 2, // C/D
  };
  const allMet =
    (criteria.adultA || criteria.adultHI) &&
    criteria.childSeveral &&
    criteria.onsetBefore12 &&
    criteria.impairAdult &&
    criteria.impairChild;

  let pattern = "Menos de 5 sintomas em cada grupo na vida adulta";
  if (criteria.adultA && criteria.adultHI) pattern = "Sintomas de desatenção e de hiperatividade/impulsividade";
  else if (criteria.adultA) pattern = "Predomínio de sintomas de desatenção";
  else if (criteria.adultHI) pattern = "Predomínio de sintomas de hiperatividade/impulsividade";

  return {
    symptoms,
    counts,
    onset: { always: always === 1, age: age === -1 ? null : age },
    impairment: { adult: impAdult, child: impChild, areasAdult, areasChild },
    criteria,
    allMet,
    pattern,
  };
}
