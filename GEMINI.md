# AutoTunelPro — Regras de Arquitetura e Comportamento

## Playback Contínuo
- Alterar BPM, Tom (Key), Escala ou Complexidade durante a reprodução **NÃO PODE** parar ou reiniciar o áudio.
- Use `updateLiveParams()` no `SampleAccurateAudioEngine` para sincronizar parâmetros ao vivo.
- Nunca coloque `generateFullBeat` ou funções de geração em arrays de dependência de `useEffect` sem guard.

## Web Audio API
- Nunca recrie o `AudioContext` a cada alteração de parâmetro.
- Cada faixa deve ter seu próprio `GainNode` persistente. Nunca crie um `GainNode` por step.
- Use `setTargetAtTime(value, ctx.currentTime, 0.015)` para transições suaves de volume.
- Mute deve zerar o gain sem destruir o valor de volume salvo pelo usuário.

## Estado React vs. Áudio
- Nunca use estado React (`useState`, `useEffect`) como relógio de áudio.
- O scheduler sample-accurate (`setInterval` de 25ms + lookahead de 120ms) é a única fonte de tempo.
- `useEffect` com `[]` vazio para geração no mount. Parâmetros musicais em deps causam re-geração indesejada.

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
- O Service Worker deve usar `skipWaiting()` + `clients.claim()` para ativação imediata.

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
