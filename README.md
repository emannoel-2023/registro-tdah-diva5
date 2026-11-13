# Registro de sintomas de TDAH em adultos (estrutura DIVA-5) com PDF

Site estático (GitHub Pages) + um Cloudflare Worker pequeno. A pessoa preenche
o registro no computador ou no celular (Parte 1 – desatenção, Parte 2 –
hiperatividade/impulsividade, Parte 3 – início e prejuízos), baixa um PDF com
resumo, folha de pontuação e todas as respostas e, se quiser, recebe o mesmo
PDF por e-mail. O PDF serve para ser analisado depois por um profissional.

> **Não é um diagnóstico.** A DIVA-5 é uma entrevista aplicada por um
> profissional de saúde. O site diz isso na abertura, no resultado, no PDF e no e-mail.
**Nenhum e-mail ou resposta é armazenado** — não há banco de dados, planilha,
cookie, analytics nem log.

```
Navegador ──(respostas + e-mail + token anti-robô)──▶ Worker ──▶ Resend (envia o e-mail)
   ▲                                                   │
   └───────────────────── PDF ◀─────────────────────────┘
```

## Por que precisa de um Worker?

O GitHub Pages só serve arquivos estáticos: ele não consegue enviar e-mail.
Enviar e-mail exige uma chave de API, e uma chave colocada no site fica visível
para qualquer pessoa (e seria usada para mandar spam em seu nome). Por isso a
chave fica no Worker, como *secret* criptografado, nunca no código.

## O que protege contra abuso

| Ameaça | Proteção |
| --- | --- |
| Vazamento de e-mails | Nada é gravado: sem banco, KV, cache ou `console.log`; logs do Worker desligados; o e-mail não vai no PDF; o campo é limpo após o envio |
| Chaves vazadas no repositório | Nenhuma chave no código; tudo em GitHub Secrets → Worker Secrets |
| Robôs / spam | Cloudflare Turnstile (anti-robô) obrigatório, validado no servidor, com checagem de domínio e ação |
| Inundar a caixa de alguém | Limite por IP (5/min) e por destinatário (2/min); o conteúdo do e-mail é fixo |
| Mandar PDF/texto falso para terceiros | O navegador só envia **números** (sim/não e quais exemplos foram marcados); não há campo de texto livre; o resultado e o PDF são gerados no servidor |
| Dados de saúde por e-mail | Envio só com caixa de consentimento marcada (checada também no servidor); o corpo do e-mail não traz respostas, só o PDF anexo; não pedimos nome |
| Outros sites usando seu Worker | CORS liberado só para a origem exata do seu site |
| XSS | Sem `innerHTML`; CSP restrita; texto do e-mail escapado |
| Requisições gigantes / malformadas | Corpo limitado a 4 KB, JSON e respostas validados, e-mail validado (bloqueia vírgulas, quebras de linha, `<>`) |

**Seja honesto com quem usa o site:** o *seu* sistema não guarda nada, mas
qualquer e-mail enviado passa por um provedor (aqui, o Resend), que mantém um
registro de entrega por alguns dias, e a Cloudflare/GitHub veem o IP de quem
acessa, como em qualquer site. Se quiser zero terceiros, deixe o envio por
e-mail desligado (não configure `RESEND_API_KEY`): o site continua funcionando
só com o download.

## Como publicar (sem instalar nada no computador)

Você vai precisar de contas gratuitas no **GitHub**, na **Cloudflare** e no
**Resend** (este último só se quiser o envio por e-mail; ele exige um domínio
seu verificado para mandar e-mails a qualquer pessoa).

### 1. Repositório
Crie um repositório público no GitHub e envie estes arquivos.

### 2. Turnstile (anti-robô)
Cloudflare → **Turnstile** → *Add widget* → domínio `SEU-USUARIO.github.io`.
Anote a **Site Key** (pública) e a **Secret Key** (secreta).

### 3. Resend (e-mail)
Verifique seu domínio em resend.com → *Domains* e crie uma **API Key** com
permissão só de envio (*Sending access*).

### 4. Token da Cloudflare
Cloudflare → *My Profile* → *API Tokens* → modelo **Edit Cloudflare Workers**.
Anote também o **Account ID** (aparece na página inicial do painel).

### 5. Secrets no GitHub
No repositório: *Settings → Secrets and variables → Actions → New repository secret*:

| Nome | Valor |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | token do passo 4 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID |
| `ALLOWED_ORIGIN` | `https://SEU-USUARIO.github.io` (sem barra no final, sem caminho) |
| `TURNSTILE_SECRET` | Secret Key do Turnstile |
| `RESEND_API_KEY` | chave do Resend |
| `MAIL_FROM` | `Resultado <resultado@seudominio.com>` |

### 6. Publicar o Worker
*Actions → Deploy do Worker → Run workflow*. No final do log aparece o
endereço, algo como `https://resultado-teste.SEU-SUBDOMINIO.workers.dev`.

### 7. Configurar e publicar o site
Edite `docs/config.js` com o endereço do Worker e a **Site Key** do Turnstile
(os dois são públicos por natureza). Depois: *Settings → Pages → Deploy from a
branch → `main` / `/docs`*. O site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## Textos da DIVA-5 e direitos autorais (leia antes de publicar)

> **Repositório privado + GitHub Pages:** o site publicado pelo GitHub Pages
> fica **público** mesmo com o repositório privado (e Pages em repositório
> privado exige plano pago). Se o texto da DIVA não puder ficar público, use o
> site só localmente para a apresentação (veja "Rodar localmente" abaixo).

## Rodar localmente (para apresentar sem publicar)
Com Python instalado, na pasta do projeto:

```
python -m http.server 8000
```

e abra `http://localhost:8000/docs/`. O formulário e a navegação funcionam;
para gerar o PDF é preciso o Worker publicado (passos acima).

A DIVA-5 é uma publicação da **DIVA Foundation** (Haia, Holanda), de
J. J. S. Kooij, M. H. Francken e T. I. Bron, e contém trechos do DSM-5
reproduzidos com permissão da **American Psychiatric Association**.

Esta cópia do projeto foi preenchida para um **trabalho acadêmico**, a partir
do PDF em português (Brasil), de março de 2019, fornecido pelo usuário.
A tradução brasileira é creditada a Mario Rodrigues Louzã, Anny Karinna
P. M. Menezes e Maria Ângela Gobbo (PRODATH / Instituto de Psiquiatria do
HC-FMUSP).

`docs/diva-data.js` contém as 18 perguntas, os 288 exemplos selecionáveis e
os títulos das áreas de prejuízo das páginas 5–16, preservando a ordem do
arquivo fornecido. A nota dos exemplos com asterisco em A2 aparece também no
site e, quando pertinente às respostas, no PDF gerado. Os campos livres
“Outros” e os campos exclusivos do entrevistador não foram adicionados ao
registro. O aviso de que o registro não é um diagnóstico foi mantido.

Para uso em site público, mantenha a orientação de solicitar autorização à
DIVA Foundation antes de publicar os textos. A configuração de Worker e
Turnstile continua sendo necessária para gerar e baixar o PDF.

Depois de publicado, **não mude a ordem nem a quantidade** dos exemplos sem
republicar o Worker: as respostas são enviadas pela posição de cada exemplo.
O Worker é republicado sozinho quando `docs/diva-data.js` ou `docs/scoring.js`
mudam na branch `main`.

## Regras de pontuação usadas (folha de pontuação da DIVA-5)
- Infância: 3 ou mais sintomas de desatenção **e/ou** de hiperatividade/impulsividade.
- Idade adulta: 5 ou mais sintomas de desatenção e/ou 5 ou mais de hiperatividade/impulsividade.
- Início: sintomas presentes desde antes dos 12 anos.
- Prejuízo: pelo menos uma situação marcada em 2 ou mais áreas, na idade adulta e na infância.
- **Não avaliados** (só o profissional): se outro transtorno explica melhor os
  sintomas (critério E), informações de familiares/parceiro(a) e relatórios
  escolares, tipo de apresentação e gravidade. O PDF diz isso explicitamente.

## LGPD
As respostas são **dados pessoais sensíveis (saúde)**. O site não pede nome,
não guarda nada e só envia e-mail com consentimento explícito. Mesmo assim,
coloque no site um contato do responsável e, se for usar com pacientes,
confirme os requisitos com quem cuida da proteção de dados da sua clínica.

## Dicas de segurança extras
- Ative *Settings → Code security → Secret scanning* e *Dependabot* no GitHub.
- Proteja a branch `main` (*Settings → Branches*) para ninguém alterar o site sem revisão.
- No Resend, desative rastreamento de abertura/cliques.
- Se usar um domínio próprio para o Worker, troque `https://*.workers.dev` no
  `connect-src` do `docs/index.html` pelo endereço exato.

## Estrutura
```
docs/            site (GitHub Pages) – funciona em celular e computador
  index.html     página + CSP
  style.css      layout responsivo (1 coluna no celular, 2 no computador)
  app.js         etapas, validação e envio (não guarda nada)
  diva-data.js   estrutura da DIVA-5 + textos (a preencher)
  scoring.js     validação e folha de pontuação (usado também pelo Worker)
  config.js      endereço do Worker + Site Key pública
worker/          Cloudflare Worker
  src/index.js   validação, anti-robô, rate limit, envio do e-mail
  src/pdf.js     geração do PDF (resumo, pontuação, respostas detalhadas)
.github/workflows/deploy-worker.yml   publica o Worker usando os secrets
```
