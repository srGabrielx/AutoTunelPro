# BeatForge Studio

MVP full-stack para gerar melodias e drums com motores independentes. Cada motor recebe seu próprio estilo (`trap-br`, `trap-uk` ou `trap-usa`) e devolve uma sequência determinística de 16 passos.

## Stack

- Next.js + React + TypeScript
- Route Handlers como back-end serverless
- Web Audio API para prévia no navegador
- Neon Postgres opcional para a próxima fase
- Vercel para hospedagem

## Rodar localmente

```bash
npm install
npm run dev
```

## Usar no Antigravity

1. Importe ou abra esta pasta como projeto.
2. Use Node.js 22.
3. Execute `npm install`.
4. Execute `npm run dev`.
5. Para validar a versão da Vercel, execute `npm run vercel:build`.

## Deploy gratuito na Vercel

Importe o repositório na Vercel. O arquivo `vercel.json` já seleciona Next.js e o comando de build. O gerador funciona sem banco e sem API paga.

## Estrutura

```text
app/                 interface e endpoints HTTP
components/          componentes interativos
lib/engines/         motores de geração independentes
lib/music/           presets, tipos e aleatoriedade
database/            modelo SQL opcional para projetos salvos
docs/                decisões, riscos e roteiro
```

## Endpoints

- `POST /api/melody`
- `POST /api/drums`

Corpo: `{ "style":"trap-br", "bpm":140, "complexity":3, "key":"C", "seed":123 }`.

## Regra arquitetural

Os motores não importam um ao outro. Eles compartilham somente tipos, presets e funções puras. Isso permite trocar o gerador de melodia por ML no futuro sem tocar no motor de drums.
