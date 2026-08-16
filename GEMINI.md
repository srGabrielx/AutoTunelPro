# AutoTunelPro — Regras de Arquitetura e Comportamento

## Playback e Alteração de Parâmetros
- Mudança de BPM durante reprodução deve preservar a fase atual, cancelar somente eventos futuros ainda não agendados e reagendar usando `AudioContext.currentTime`.
- Mudança de tom ou escala **não deve** regenerar silenciosamente as notas já criadas pelo usuário.
- `generateFullBeat` e funções de geração não devem ser colocadas em arrays de dependência de `useEffect` sem guard explícito.

## Web Audio API
- Nunca recrie o `AudioContext` a cada alteração de parâmetro.
- Cada faixa deve ter seu próprio `GainNode` persistente. Nunca crie um `GainNode` por step.
- Use `setTargetAtTime(value, ctx.currentTime, 0.015)` para transições suaves de volume.
- Mute deve zerar o gain sem destruir o valor de volume salvo pelo usuário.

## Estado React e Áudio
- Nunca use estado React (`useState`, `useEffect`) como relógio de áudio.
- O scheduler sample-accurate (`setInterval` de 25ms + lookahead de 120ms) é a única fonte de tempo.
- Cada `useEffect` deve declarar suas dependências corretas e possuir cleanup. Não determinar `[]` como padrão obrigatório.

## Exportação
- Volume individual de cada faixa deve ser respeitado na exportação WAV.
- DSP de exportação roda no worker, não na Main Thread.

## Botão Flutuante (FAB) — Eventos
- O FAB usa pointer events (`onPointerDown/Move/Up`) exclusivamente para arrastar.
- O toggle de menu/drawer deve estar **exclusivamente** no handler `onClick`, com `e.stopPropagation()` e `e.preventDefault()`.
- Nunca dispare `setIsTransportOpen` dentro de `onPointerUp`. Isso causa "ghost click" — ao desmontar o FAB, o click propaga para o elemento abaixo (botões de playback/gerar).
- Use `dragState.current.hasMoved` (booleano persistente via `useRef`) para distinguir drag de tap.
- A imagem/ícone interno do FAB deve ter `pointer-events: none`.

## PWA — Instalação
- O evento `beforeinstallprompt` deve ser capturado **globalmente** no `<script>` do `layout.tsx`, não dentro de componentes React.
- Armazene em `window.deferredPWAInstallPrompt` e dispare um `CustomEvent('pwa-prompt-ready')`.
- O componente `InstallBanner` escuta esse evento e chama `promptEvent.prompt()` diretamente ao clicar em "Instalar App".
- Em modo standalone (`display-mode: standalone`), o banner não deve aparecer.
- **Não** aplicar `skipWaiting()` automaticamente — pode atualizar o app durante uma sessão ativa.

## Posicionamento de Elementos Flutuantes
- Botões flutuantes usam `position: fixed` com margens explícitas (mínimo 20px das bordas).
- Desktop: `right: 24px; bottom: 24px`.
- Mobile: `right: 16px; bottom: calc(16px + env(safe-area-inset-bottom))`.
- **Nunca** centralizar com `left: 50%; transform: translateX(-50%)` ou `mx-auto`.
- Usar `z-index` suficiente (9999) sem cobrir modais.
- Menus dropdown de FABs devem abrir **acima** do botão, não abaixo.

## Isolamento de Estado UI
- Estado de menus (`isLayerMenuOpen`, `isTransportOpen`) deve ser completamente independente de:
  - `playbackMode`
  - estado de áudio / `currentStep`
  - estado de geração / `busy`
  - dados de camadas musicais
- Abrir/fechar um menu **nunca** pode disparar `startPlayback`, `stopPlayback`, `generateMelody` ou qualquer função de áudio.
- Menus devem fechar com: Escape, clique fora (`mousedown` em `document`), e após seleção de item.
- Cada menu controla seu próprio estado local ou usa `openMenuId` único (apenas 1 menu aberto por vez).

## Verificação Rigorosa Pré-Commit
- **NUNCA** fazer um `git commit` ou `git push` sem antes rodar explicitamente `npx tsc --noEmit` (ou `npm run build`) para validar a tipagem TypeScript.
- Se o usuário pedir "faz o push aí" no meio de uma refatoração, **obrigatoriamente** rode `tsc --noEmit` localmente antes de empurrar o código para o repositório, garantindo que o build remoto (ex: Vercel) não quebre.

## Tipagem de useRef para Mapeamento de Estado
- Ao adicionar novas propriedades de estado (`useState`) que precisam ser sincronizadas em um `useRef` para acesso síncrono (como o `stateRef`), garanta sempre que a nova propriedade seja adicionada **tanto na inicialização do `useRef` quanto na atribuição dentro do `useEffect`**, senão o TypeScript emitirá erros de inferência "Object literal may only specify known properties".

## Paridade Absoluta Playback / WAV & Determinismo de Groove
- **RNG Determinístico Obrigatório:** Toda humanização, velocity e micro-timing devem ser calculados a partir de um PRNG derivado de `(seed, trackId, step, rollIndex)`. **Nunca** use `Math.random()` na síntese ou agendamento de áudio, garantindo que o áudio tocado no navegador seja bit-accurate com o arquivo WAV exportado.
- **Estrutura Explícita de Rolls:** Subdivisões de passos de 1/16 devem ser expressas como `rollCount: 1 | 2 | 3 | 4 | 6` dentro da interface `DrumRoll`, evitando ambiguidades de frações e permitindo cálculo direto do intervalo (`stepDuration / rollCount`).
- **Pitch Curves Paramétricas:** Curvas de afinação em rolls de hi-hat (pitch drop) devem utilizar parâmetros quantitativos (`startCents`, `endCents`, `durationMs`) em vez de booleanos soltos.
- **Limites de Micro-Timing:** O micro-timing deve ser armazenado como `microTimingMs`, convertido em segundos apenas no scheduler, e estritamente limitado a no máximo ±15ms.
- **Preservação de Compasso:** O micro-timing nunca pode deslocar um hit para fora do seu compasso ou inverter a ordem cronológica com hits vizinhos.
- **Preservação dos Tempos Fortes:** O swing deve afetar preferencialmente os contratempos (offbeats/passos ímpares), sem deslocar destrutivamente os tempos fortes (1 e 3) do Kick e Snare.
- **Sidechain (Kick → 808):** Em qualquer reprodução ou exportação WAV onde Kick e 808 coincidam, deve ser aplicado ducking automático e suave no 808 (atenuação rápida de 6ms com release de 75-80ms).
