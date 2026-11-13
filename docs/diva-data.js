// Conteúdo transcrito do PDF fornecido pelo usuário para trabalho acadêmico.
// Fonte: DIVA-5 em português (Brasil), março de 2019, DIVA Foundation.
// Autores: J. J. S. Kooij, M. H. Francken e T. I. Bron.
// Tradução brasileira: Mario Rodrigues Louzã, Anny Karinna P. M. Menezes
// e Maria Ângela Gobbo (PRODATH / Instituto de Psiquiatria do HC-FMUSP).
// Perguntas e exemplos: páginas 5–16, na ordem do arquivo fornecido.
// Ao alterar a ordem ou quantidade de exemplos, republique o Worker.

export const TODO = "__PREENCHER__";
const MAX_ITEMS = 30; // limite técnico (as respostas usam 1 bit por exemplo)

const BULLET = /^[❑□☐■•\-–]\s*/u;
const IGNORE = [
  /^outros\b/i,
  /^sintoma presente/i,
  /^exemplos? (na|da|de)\b/i,
  /^\d+\s*$/, // número de página
  /^DIVA-5\b/i,
];

/** Separa um bloco colado do PDF em uma lista de exemplos. */
export function parseList(block) {
  const out = [];
  let skipping = false; // dentro de uma nota de rodapé "* A não ser..."
  for (const raw of String(block).split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (line.startsWith("*")) { skipping = true; continue; }
    if (BULLET.test(line)) {
      skipping = false;
      out.push(line.replace(BULLET, ""));
      continue;
    }
    if (skipping || IGNORE.some((r) => r.test(line))) continue;
    if (out.length) out[out.length - 1] = (out[out.length - 1] + " " + line).trim();
    else out.push(line);
  }
  const items = out
    .map((t) => t.trim()) // preserva os asteriscos ligados às notas dos exemplos
    .filter((t) => t && !IGNORE.some((r) => r.test(t)));
  if (items.length > MAX_ITEMS) throw new Error(`Lista com mais de ${MAX_ITEMS} exemplos: ${items[0]}`);
  return items;
}

// ex(n, `...`): se o bloco estiver vazio, usa n marcadores (modo demonstração).
const ex = (n, block) => {
  const items = parseList(block);
  return items.length ? items : Array.from({ length: n }, () => TODO);
};
const q = (text) => {
  const t = String(text).replace(/\s+/g, " ").trim();
  return t || TODO;
};

export const DIVA = {
  title: "Registro de Sintomas – TDAH em Adultos",
  subtitle: "Trabalho acadêmico baseado na DIVA-5 (Kooij, Francken & Bron, DIVA Foundation, 2019)",
  intro: "os sintomas na idade adulta devem estar presentes há pelo menos 6 meses. Os sintomas na infância referem-se à idade entre os 5 e os 12 anos. Para um sintoma ser atribuído ao TDAH, este deve ter um curso crônico e não episódico.",
  disclaimer:
    "Este registro NÃO é um diagnóstico. A DIVA-5 é uma entrevista feita por um " +
    "profissional de saúde, de preferência com informações de familiares. Leve " +
    "o PDF gerado para um(a) psiquiatra ou psicólogo(a) analisar.",

  // `topic`: título curto (texto próprio). `question`: pergunta transcrita do PDF.
  // ex(n, ...): quantidade de exemplos da fonte, sem o campo livre "Outros".
  symptoms: [
    // ---------- Parte 1: déficit de atenção (páginas 5 a 9 do PDF) ----------
    {
      id: "A1", domain: "A", topic: "Atenção a detalhes e erros por descuido",
      question: q(`Você com frequência não presta atenção suficiente aos detalhes ou comete erros por distração, no trabalho ou em outras atividades? Como era durante sua infância (na escola ou durante outras atividades)?`),
      adult: ex(7, `
❑ Comete erros por distração
❑ Tem que trabalhar devagar para evitar erros
❑ Não lê as instruções com atenção
❑ Não é bom em trabalhos detalhados
❑ Precisa de muito tempo para os detalhes
❑ Perde-se nos detalhes
❑ Trabalha muito rápido e, por isso, cometer erros
`),
      child: ex(7, `
❑ Cometia erros por distração nos trabalhos escolares
❑ Cometia erros devido a uma leitura errada das perguntas
❑ Deixava perguntas sem responder, por não as ter lido corretamente
❑ Deixava sem responder as perguntas do verso da página nas provas
❑ Os outros comentavam sobre o seu trabalho desleixado
❑ Não revia as respostas dos trabalhos feitos em casa
❑ Precisava de muito tempo para os trabalhos detalhados
`),
    },
    {
      id: "A2", domain: "A", topic: "Manter a atenção nas tarefas",
      question: q(`Você com frequência tem dificuldade em manter-se concentrado durante as tarefas? E era durante sua infância (em jogos ou atividades)?`),
      adult: ex(5, `
❑ Não consegue manter a atenção nas tarefas durante muito tempo*
❑ Distrai-se facilmente com as próprias associações/ pensamentos
❑ Tem dificuldade em ver um filme ou ler um livro até o fim*
❑ Fica rapidamente entediado com os assuntos*
❑ Faz perguntas sobre assuntos que já foram discutidos
`),
      child: ex(6, `
❑ Tinha dificuldade em prestar atenção nos trabalhos escolares
❑ Tinha dificuldade em manter-se atento aos jogos*
❑ Distraía-se facilmente
❑ Tinha dificuldade em concentrar-se*
❑ Precisava de um ambiente muito estruturado para não se distrair
❑ Ficava rapidamente entediado com os assuntos*
`),
      adultNote: "A não ser que o assunto seja considerado muito interessante (ex. jogar no computador ou passatempos)",
      childNote: "A não ser que o assunto fosse considerado muito interessante (ex. jogar no computador ou passatempos)",
    },
    {
      id: "A3", domain: "A", topic: "Parecer não escutar quando falam com você",
      question: q(`Você com frequência parece não estar ouvindo, quando alguém lhe dirige diretamente a palavra? Como era durante sua infância?`),
      adult: ex(5, `
❑ Divaga ou parece ausente
❑ Tem dificuldade de concentrar-se numa conversa
❑ Não sabe do que se falou depois de uma conversa
❑ Muda frequentemente o assunto de uma conversa
❑ Os outros dizem que está com a cabeça em outro lugar
`),
      child: ex(5, `
❑ Não se lembrava do que os pais/professores diziam
❑ Estava frequentemente “sonhando” ou ausente
❑ Ouvia apenas quando olhavam nos seus olhos ou levantavam a voz
❑ Com frequência precisava ser chamado mais de uma vez
❑ As perguntas precisavam ser repetidas
`),
    },
    {
      id: "A4", domain: "A", topic: "Seguir instruções e concluir tarefas",
      question: q(`Você com frequência não segue as instruções ou não consegue terminar as tarefas ou obrigações no trabalho? Como era durante sua infância (na escola)?`),
      adult: ex(5, `
❑ Faz várias coisas ao mesmo tempo sem terminar nenhuma delas
❑ Tem dificuldade para finalizar as tarefas quando já não são mais novidade
❑ Necessita de prazos-limite para terminar as tarefas
❑ Tem dificuldade em terminar tarefas administrativas
❑ Tem dificuldade em seguir instruções de um manual
`),
      child: ex(8, `
❑ Tinha dificuldade em estar pronto na hora
❑ Quarto/mesa de trabalho ficavam desarrumados
❑ Tinha dificuldade de brincar sozinho
❑ Tinha dificuldade de planejar as tarefas ou o trabalho de casa
❑ Fazia várias coisas ao mesmo tempo
❑ Chegava com frequência atrasado
❑ Tinha pouca noção do tempo
❑ Tinha dificuldade em prestar atenção
`),
    },
    {
      id: "A5", domain: "A", topic: "Organizar tarefas e atividades",
      question: q(`Você com frequência tem dificuldade para organizar tarefas e atividades? Como era durante sua infância?`),
      adult: ex(14, `
❑ Dificuldade no planejamento de atividades da vida cotidiana
❑ Dificuldade em gerenciar tarefas sequenciais
❑ A casa e/ou o local de trabalho estão desorganizados
❑ Dificuldade em manter materiais e pertences em ordem
❑ Trabalha desarrumado e desorganizado
❑ Planeja muitas tarefas ao mesmo tempo ou planejamento ineficiente
❑ Regularmente reserva coisas que acontecerão ao mesmo tempo (reserva dupla)
❑ Chega atrasado
❑ Falha em cumprir prazos
❑ Não consegue usar uma agenda ou diário consistentemente
❑ Inflexível por causa da necessidade de manter os horários
❑ má percepção e gestão do tempo
❑ Faz agendamentos, mas não os usa
❑ Precisa de outras pessoas para estruturar suas coisas
`),
      child: ex(10, `
❑ Dificilmente está pronto a tempo
❑ Quarto/mesa de trabalho ficavam desarrumados
❑ Dificuldade em manter materiais e pertences em ordem
❑ Dificuldade para brincar sozinho
❑ Dificuldade em planejar tarefas ou lições de casa
❑ Falha para cumprir prazos
❑ Faz as coisas de um jeito confuso
❑ Chega atrasado
❑ Má percepção de tempo/horários
❑ Dificuldade em manter-se entretido
`),
    },
    {
      id: "A6", domain: "A", topic: "Evitar tarefas de esforço mental prolongado",
      question: q(`Você com frequência evita (ou tem aversão ou reluta em envolver-se em) tarefas que requeiram um esforço mental continuado? Como era durante sua infância?`),
      adult: ex(7, `
❑ Faz primeiro o que é o mais fácil ou divertido
❑ Adia sucessivamente as tarefas entediantes ou árduas
❑ Adia as tarefas e, em consequência, não cumpre prazos
❑ Evita os trabalhos monótonos como, por exemplo, os de natureza administrativa.
❑ Evita preparar relatórios, preencher formulários ou rever textos longos
❑ Não gosta de ler porque exige esforço mental
❑ Evita coisas que exigem muita concentração
`),
      child: ex(5, `
❑ Evitava ou detestava os trabalhos de casa
❑ Lia poucos livros ou não gostava de ler por isso exigir esforço mental
❑ Evitava coisas que exigiam muita concentração
❑ Detestava disciplinas que exigiam muita concentração
❑ Adiava sucessivamente tarefas entediantes ou árduas
`),
    },
    {
      id: "A7", domain: "A", topic: "Perder objetos",
      question: q(`Você com frequência perde objetos necessários para as tarefas ou atividades? Como era durante sua infância?`),
      adult: ex(7, `
❑ Perde a carteira, as chaves ou a agenda
❑ Deixa frequentemente coisas para trás
❑ Perde papéis do trabalho
❑ Perde muito tempo procurando as coisas
❑ Entra em pânico quando os outros mudam as coisas de lugar
❑ Arruma coisas no lugar errado
❑ Perde listas, números de telefone, anotações
`),
      child: ex(5, `
❑ Perdia a agenda, as canetas, equipamentos de ginástica ou outras coisas
❑ Perdia roupa, brinquedos ou trabalhos de casa
❑ Perdia muito tempo procurando as coisas
❑ Entrava em pânico quando os outros mudavam as coisas de lugar
❑ Recebia comentários dos pais/professores sobre o fato de perder as coisas
`),
    },
    {
      id: "A8", domain: "A", topic: "Distrair-se com estímulos externos",
      question: q(`Você com frequência se distrai facilmente com estímulos externos? Como era durante sua infância?`),
      adult: ex(5, `
❑ Tem dificuldade em ignorar estímulos externos
❑ Depois de se distrair, tem dificuldade em voltar ao assunto
❑ Distrai-se facilmente com barulhos ou com o que acontece à sua volta
❑ Escuta as conversas dos outros
❑ Tem dificuldade em filtrar/selecionar informação
`),
      child: ex(3, `
❑ Durante as aulas olhava muitas vezes para fora da janela
❑ Distraía-se facilmente com barulhos ou com o que acontecia à sua volta
❑ Depois de se distrair, tinha dificuldade em voltar ao assunto
`),
    },
    {
      id: "A9", domain: "A", topic: "Esquecimentos no dia a dia",
      question: q(`Você com frequencia se esquece das atividades do dia-a-dia? Como era durante sua infância?`),
      adult: ex(8, `
❑ Esquece de compromissos ou outras obrigações
❑ Esquece as chaves, a agenda etc.
❑ Precisa ser lembrado frequentemente de compromissos
❑ Esquece de pagar contas ou retornar chamadas telefônicas
❑ Precisa voltar à casa para buscar coisas esquecidas
❑ Uso rígido de listas ou rotinas para garantir que as coisas não sejam esquecidas
❑ Esquece de manter a agenda diária ou olhá-la
❑ Esquece de fazer tarefas ou dar recados
`),
      child: ex(6, `
❑ Esquecia de compromissos ou instruções
❑ Esquecia de fazer tarefas ou dar recados
❑ Tinha que ser lembrado frequentemente de coisas
❑ A meio caminho de uma tarefa, esquecia o que deveria ser feito
❑ Esquecia de levar as coisas para a escola
❑ Esquecia as coisas na escola ou nas casas dos amigos
`),
    },

    // ---------- Parte 2: hiperatividade/impulsividade (páginas 10 a 14) ----------
    {
      id: "HI1", domain: "HI", topic: "Mexer mãos e pés ou se remexer sentado",
      question: q(`Você com frequência mexe de forma irrequieta as mãos e os pés ou remexe-se na cadeira quando está sentado? Como era durante sua infância?`),
      adult: ex(5, `
❑ Tem dificuldade em ficar quieto/a sentado/a
❑ Balança as pernas
❑ Bate com a caneta ou brinca com qualquer coisa
❑ Rói as unhas ou mexe no cabelo
❑ Consegue controlar a inquietação motora, mas isso faz com que fique ainda mais tenso(a)
`),
      child: ex(6, `
❑ Os pais diziam muitas vezes para se sentar quieto/a ou algo parecido
❑ Balançava as pernas
❑ Batia com a caneta ou brincava com qualquer coisa
❑ Roía as unhas ou mexia no cabelo
❑ Não conseguia ficar sentado/a normalmente numa cadeira
❑ Conseguia controlar a inquietação motora, mas isso o(a) fazia ficar ainda mais tenso(a)
`),
    },
    {
      id: "HI2", domain: "HI", topic: "Levantar-se quando deveria ficar sentado",
      question: q(`Você com frequência se levanta do lugar em situações em que é esperado que permaneça sentado? Como era durante sua infância?`),
      adult: ex(6, `
❑ Deixa frequentemente o seu lugar no escritório ou no ambiente de trabalho
❑ Evita simpósios, palestras, igreja etc.
❑ Prefere andar em vez de ficar sentado
❑ Nunca fica parado por muito tempo, sempre se movimentando
❑ Estressado devido à dificuldade de ficar quieto
❑ Usa desculpas para poder andar por aí
`),
      child: ex(4, `
❑ Muitas vezes se levantava enquanto comia ou deixava seu lugar na sala de aula
❑ Acha muito difícil permanecer sentado na escola ou durante refeições
❑ Era chamado à atenção para permanecer sentado
❑ Dar desculpas para andar por aí
`),
    },
    {
      id: "HI3", domain: "HI", topic: "Inquietação",
      question: q(`Você com frequência se sente irrequieto? Como era durante sua infância?`),
      adult: ex(3, `
❑ Sente-se irrequieto ou agitado por dentro
❑ Tem a sensação de precisar estar ocupado
❑ Tem dificuldade em relaxar
`),
      child: ex(4, `
❑ Estava sempre correndo
❑ Subia nos móveis ou saltava em cima dos bancos
❑ Subia nas árvores
❑ Sentia-se agitado por dentro
`),
    },
    {
      id: "HI4", domain: "HI", topic: "Dificuldade com lazer tranquilo",
      question: q(`Você com frequência tem dificuldade em dedicar-se tranquilamente a atividades de lazer? Como era durante sua infância (nas atividades de lazer)?`),
      adult: ex(5, `
❑ Fala durante atividades quando isto é inapropriado
❑ Em público tende a ser arrogante ou chamar atenção
❑ É barulhento em várias situações
❑ Tem dificuldade em fazer atividades sossegadamente
❑ Tem dificuldade em falar baixo
`),
      child: ex(4, `
❑ Era barulhento durante os jogos ou durante as aulas
❑ Não conseguia ver televisão ou filmes sossegadamente
❑ Era repreendido para ficar mais quieto/sossegado
❑ Em público tendia a destacar-se/chamar atenção
`),
    },
    {
      id: "HI5", domain: "HI", topic: "Agitação constante, sempre em movimento",
      question: q(`Você com frequência “está a mil por hora” ou age como se estivesse “ligado a um motor”? Como era durante sua infância?`),
      adult: ex(6, `
❑ Sempre ocupado fazendo algo
❑ É desconfortável permanecer parado por tempo prolongado, por ex. em restaurantes ou reuniões
❑ Tem muita energia, sempre em movimento
❑ Os outros consideram você inquieto ou difícil de acompanhar
❑ Passa por cima dos próprios limites
❑ Acha difícil deixar as coisas, energia em excesso
`),
      child: ex(6, `
❑ Constantemente ocupado
❑ Os outros consideravam você inquieto ou difícil de acompanhar
❑ Era desconfortável permanecer parado por tempo prolongado
❑ Excesso de atividade na escola e em casa
❑ Tinha muita energia
❑ Sempre em movimento, energia em excesso
`),
    },
    {
      id: "HI6", domain: "HI", topic: "Falar demais",
      question: q(`Você com frequência fala excessivamente? Como era durante sua infância?`),
      adult: ex(6, `
❑ Fala de maneira tão agitada que os outros o acham cansativo
❑ Tem fama de ser muito falador
❑ Tem dificuldade em parar de falar
❑ Tem a tendência de falar excessivamente
❑ Não deixa os outros falarem numa conversa
❑ Precisa de muitas palavras para dizer qualquer coisa
`),
      child: ex(6, `
❑ Tinha fama de ser tagarela
❑ Os professores e os pais mandavam-no frequentemente calar-se
❑ Nos relatórios da escola tinha comentários acerca de falar demais
❑ Era castigado por falar em demasia
❑ Distraía os outros com conversas, quando faziam os trabalhos escolares
❑ Não deixava os outros falarem durante as conversas
`),
    },
    {
      id: "HI7", domain: "HI", topic: "Responder antes de a pergunta terminar",
      question: q(`Você com frequência dá as respostas antes que as perguntas tenham sido completadas? Como era durante sua infância?`),
      adult: ex(5, `
❑ Fala impulsivamente, fala sem pensar
❑ Diz o que lhe vem à cabeça
❑ Responde sem deixar o outro acabar a frase
❑ Completa as frases das outras pessoas
❑ É indelicado, grosseiro, sem tato
`),
      child: ex(6, `
❑ Era um tagarela, dizia coisas sem pensar primeiro
❑ Queria ser o primeiro a responder a perguntas na escola
❑ Dizia a primeira resposta que lhe vinha à cabeça, mesmo que estivesse errada
❑ Interrompia os outros antes de acabarem de dizer a frase
❑ Dificuldade em esperar sua vez durante as conversas
❑ Era conhecido como sendo indelicado
`),
    },
    {
      id: "HI8", domain: "HI", topic: "Dificuldade em esperar a vez",
      question: q(`Você com frequência tem dificuldade em esperar pela sua vez? Como era durante sua infância?`),
      adult: ex(4, `
❑ Dificuldade em esperar em uma fila, “furando” a fila
❑ Dificuldade em esperar pacientemente no trânsito ou no engarrafamento
❑ É impaciente
❑ Inicia subitamente relacionamentos e/ou empregos, ou os deixa de repente, por impaciência
`),
      child: ex(5, `
❑ Dificuldade em esperar sua vez nas atividades de grupo
❑ Dificuldade em aguardar sua vez na sala de aula
❑ Queria ser sempre o primeiro a falar ou agir
❑ Tornava-se impaciente com facilidade
❑ Atravessava a rua sem olhar
`),
    },
    {
      id: "HI9", domain: "HI", topic: "Interromper ou se intrometer",
      question: q(`Você com frequência interrompe ou se intromete nas atividades dos outros? Como era durante sua infância?`),
      adult: ex(6, `
❑ Intromete-se facilmente nos assuntos dos outros
❑ Interrompe os outros
❑ Interrompe as pessoas nas suas atividades sem pedir licença
❑ Os outros comentam sobre ser intrometido
❑ Tem dificuldade em respeitar os limites dos outros
❑ Tem uma opinião sobre tudo e a expressa imediatamente
`),
      child: ex(4, `
❑ Intrometia-se nos jogos dos outros
❑ Interrompia as conversas dos outros
❑ Reagia a tudo
❑ Não era capaz de esperar
`),
    },
  ],

  // ---------- Parte 3 – Critério B (página 14) ----------
  onset: {
    question: "Sempre apresentou os sintomas acima mencionados de Déficit de Atenção e/ou Hiperatividade/impulsividade?",
  },

  // ---------- Parte 3 – Critério C (páginas 15 e 16) ----------
  impairment: {
    adult: [
      { name: "Trabalho / educação", examples: ex(11, `
❑ Não concluiu a educação / formação necessária para o trabalho
❑ Trabalhe abaixo do nível de educação/formação
❑ Fica rapidamente farto de um cargo ou função no trabalho
❑ Padrão de muitos trabalhos de curta duração
❑ Dificuldade com o trabalho administrativo / planejamento
❑ Não consegue promoções
❑ Rende abaixo de sua capacidade de trabalho
❑ Sai do emprego/é despedido por causa de uma discussão
❑ Encontra-se em afastamento médico (prolongado) devido às incapacidades provocadas pelos sintomas
❑ Prejuízo limitado por conseguir compensar com QI elevado
❑ Prejuízo limitado por conseguir compensar com apoio de estrutura externa
`) },
      { name: "Relacionamentos e/ou família", examples: ex(10, `
❑ Fica rapidamente aborrecido nos relacionamentos
❑ Impulsivamente começa/termina relacionamentos
❑ Relacionamentos desiquilibrados devido aos sintomas
❑ Problemas de relacionamento, muitas discussões, falta de intimidade
❑ Divorciado devido aos sintomas
❑ Problemas com a sexualidade devido aos sintomas
❑ Dificuldade na educação dos filhos, resultante dos sintomas
❑ Dificuldade nas tarefas domésticas e/ou administrativas
❑ Problemas financeiros ou apostar em jogos de azar
❑ Medo de começar um relacionamento
`) },
      { name: "Interação social", examples: ex(6, `
❑ Fica rapidamente entediado com os contatos sociais
❑ Dificuldade em manter contatos sociais
❑ Conflitos devido a problemas de comunicação
❑ Dificuldade em iniciar contatos sociais
❑ Comportamento pouco assertivo devido a experiências negativas
❑ Não é atencioso (esquece de mandar postal, de enviar pêsames, de telefonar etc.)
`) },
      { name: "Tempo livre / hobbies", examples: ex(10, `
❑ Incapaz de relaxar adequadamente durante o tempo livre
❑ Tem que praticar esportes intensamente para relaxar
❑ Lesões resultantes da prática excessiva de esportes
❑ Não consegue ler um livro ou assistir a um filme até o fim
❑ Está sempre ativo e, por isso, sente-se exausto
❑ Perde interesse rapidamente pelos hobbies
❑ Acidentes ao dirigir e/ou perda da carteira de motorista como resultado de condução imprudente
❑ Busca de ‘adrenalina’ e/ou assume muitos riscos
❑ Problemas com a polícia ou justiça
❑ Come compulsivamente
`) },
      { name: "Autoconfiança / autoimagem", examples: ex(6, `
❑ É inseguro devido aos comentários negativos de outras pessoas
❑ Autoimagem negativa devido aos erros frequentes
❑ Medo de fracasso quando começa algo novo
❑ Reação exagerada a críticas
❑ Perfeccionismo
❑ Sente-se triste devido aos sintomas do TDAH
`) },
    ],
    child: [
      { name: "Vida acadêmica", examples: ex(10, `
❑ Nível educacional mais baixo do que seria de esperar pelo QI
❑ Repetições de ano devido a problemas de concentração
❑ Formação não concluída/desistiu da escola
❑ Precisou de muito mais tempo do que o normal para terminar a formação escolar
❑ Conseguiu uma formação compatível com o QI com muita dificuldade
❑ Tinha dificuldade em fazer as lições de casa
❑ Frequentou o ensino especial devido aos sintomas
❑ Recebia comentários dos professores sobre seu comportamento ou sua concentração
❑ Prejuízo limitado por conseguir compensar com um QI elevado
❑ Prejuízo limitado por conseguir compensar com apoio de estrutura externa
`) },
      { name: "Vida familiar", examples: ex(4, `
❑ Discutia frequentemente com os irmãos/irmãs
❑ Era frequentemente castigado ou apanhava
❑ Tinha pouco contato com a família devido a conflitos
❑ Precisou ter a vida organizada pelos pais durante mais tempo do que o que seria normal
`) },
      { name: "Interação social", examples: ex(8, `
❑ Tinha dificuldade em manter contatos sociais
❑ Teve conflitos devido a problemas de comunicação
❑ Tinha dificuldades em iniciar contatos sociais
❑ Tinha comportamento pouco assertivo como resultado de experiências negativas
❑ Tinha poucos amigos
❑ Era importunado
❑ Era excluído ou não era admitido para fazer parte de grupos
❑ Foi ‘bully’ (praticava bullying)
`) },
      { name: "Tempo livre/hobbies", examples: ex(9, `
❑ Não conseguia relaxar no tempo livre
❑ Precisava praticar muito esporte para conseguir relaxar
❑ Teve lesões resultantes da prática excessiva de esportes
❑ Não conseguia ver um filme ou ler um livro até o fim
❑ Estava sempre em ação e, por isso, andava exausto
❑ Perdia rapidamente interesse pelos hobbies
❑ Buscava sensações intensas/arriscava demais
❑ Problemas com a polícia ou a justiça
❑ Teve muitos acidentes
`) },
      { name: "Autoconfiança/autoimagem", examples: ex(5, `
❑ Era inseguro devido aos comentários negativos que recebia dos outros
❑ Tinha baixa autoestima devido aos erros frequentes
❑ Tinha medo de falhar quando começava algo novo
❑ Reagia exageradamente a críticas
❑ Era perfeccionista
`) },
    ],
  },
};

/** true quando todos os textos foram preenchidos. */
export function isFilled() {
  const lists = [
    ...DIVA.symptoms.flatMap((s) => [[s.question], s.adult, s.child]),
    ...DIVA.impairment.adult.map((d) => d.examples),
    ...DIVA.impairment.child.map((d) => d.examples),
  ];
  return lists.every((l) => l.every((t) => t !== TODO));
}

/** Texto para exibir (troca o marcador por um rótulo neutro). */
export function label(text, fallback) {
  return text === TODO ? fallback : text;
}
