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

## Paridade de Groove & Equivalência Perceptual
- **Paridade Determinística do Plano de Eventos:** A mesma seed produz obrigatoriamente o mesmo plano musical (instrumentos, steps, timestamps, `rollCount`, `subIndex`, velocities, `microTimingMs`, curvas de pitch, envelopes de sidechain e volumes). Garantir equivalência perceptual entre playback Web Audio e exportação WAV.
- **RNG Determinístico Obrigatório:** Toda humanização, velocity e micro-timing devem ser derivados de `(seed, trackId, step, subIndex)`. **Nunca** use `Math.random()` na síntese, agendamento ou exportação de áudio.
- **Estrutura Explícita de Rolls:** Subdivisões de passos de 1/16 devem ser expressas como `rollCount: 1 | 2 | 3 | 4 | 6` dentro da interface `DrumRoll`, com cálculo direto do intervalo (`rollInterval = stepDuration / roll.count`).
- **Pitch Curves Paramétricas:** Curvas de afinação em rolls de hi-hat devem utilizar parâmetros quantitativos (`startCents`, `endCents`, `durationMs`) que afetam a afinação real (`frequency = baseFrequency * Math.pow(2, cents / 1200)` e `playbackRate = Math.pow(2, cents / 1200)`), ou `filterCurve` (`startHz`, `endHz`, `durationMs`) para modulação de filtro.
- **Limites de Micro-Timing:** O micro-timing deve ser armazenado como `microTimingMs`, convertido em segundos apenas no scheduler, e estritamente limitado entre -15ms e +15ms.
- **Preservação de Compasso:** O micro-timing nunca pode produzir timestamp negativo, deslocar um hit para fora do seu compasso ou inverter a ordem cronológica com hits vizinhos.
- **Preservação dos Tempos Fortes:** O swing deve afetar preferencialmente os contratempos (offbeats/passos ímpares), sem deslocar os tempos fortes principais (0, 4, 8, 12) do Kick e Snare.
- **Sidechain (Kick → 808):** O ducking deve ocorrer em todo evento de kick enquanto existir uma voz de 808 sustentada. No Web Audio, usar nó dedicado `Sidechain GainNode` (1.0 → 0.32 → 1.0) separado do `Track GainNode` de volume. No DSP do Worker, aplicar o mesmo envelope amostra a amostra no canal do 808.

## Síntese de Alta Fidelidade e Realismo Acústico
- **Hi-Hats Metálicos (Analogue Modeling):** Os hi-hats devem combinar banco de frequências inarmônicas com envelope de ruído filtrado em passa-altas para reproduzir o timbre metálico característico de pratos físicos/TR-808.
- **Vozes em Unison/Detune:** Camadas de melodia do tipo Lead e Pad devem empregar leve micro-desafinação stereo (detune ±6 a ±12 cents) para ganho de densidade harmônica e espacialidade.
- **Kick & 808 Acoustic Punch:** Kicks devem ter sweep duplo (click transitório de 160-180Hz para impacto + corpo de 45-55Hz). O 808 deve conter pitch dive inicial de 40-50ms com saturação por waveshaping suave.
- **Master Bus Soft-Clipper:** Todo som final passa por DC-blocker e limitador analógico suave com threshold em 0.88, garantindo volume comercial encorpado sem clipping digital estático.
