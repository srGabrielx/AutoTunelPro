### Tarefa: Implementação da FASE A — AudioTransport Canônico em Ticks (PPQ = 960)

Você deve refatorar o `lib/music/audio-transport.ts` (e arquivos diretamente dependentes de playback) para que o motor de áudio em tempo real opere sobre a Timeline canônica em Ticks e suporte seleção de escopo por `sectionId`.

#### Requisitos Obrigatórios:
1. **Unidade de Tempo Canônica**:
   - Utilizar `PPQ = 960` e a fórmula `tempoSegundos = (tick / PPQ) * (60 / BPM)`.
   - Remover qualquer premissa fixa de 16 steps como tamanho total do motor. O tamanho total da timeline deve vir de `totalTicks` / `sections`.
2. **Contrato de Seções e Escopo**:
   - Criar/utilizar a interface:
     ```typescript
     export interface TransportSectionBoundary {
       id: string; // Ex: "intro-a", "verse-1"
       startTick: number;
       durationTicks: number;
     }

     export type PlaybackScope = 
       | { mode: "all" }
       | { mode: "section"; sectionId: string };
     ```
   - Implementar `setPlaybackScope(scope: PlaybackScope)` para permitir alternar entre:
     - `mode: "all"`: reprodução contínua da timeline inteira (todas as seções em sequência).
     - `mode: "section"`: loop contínuo restrito à janela `[startTick, startTick + durationTicks]` da seção informada.
3. **Preservação de Síntese e Desempenho**:
   - Manter os nós de áudio, curvas de saturação e sidechain ducking funcionando com agendamento sample-accurate (`ctx.currentTime`).
   - Não inserir nenhuma decisão musical ou regra de gênero dentro do `audio-transport.ts`.

#### Critérios de Aceite (Gate Fase A):
- `TRANSPORT_USES_REAL_TIMELINE = PASS`
- `NO_FIXED_16_STEP_ASSUMPTION = PASS`
- `SECTION_BY_ID = PASS`
- `FULL_ARRANGEMENT_PLAYBACK = PASS`
- `SECTION_LOOP_PLAYBACK = PASS`
- `TYPECHECK = PASS` (sem erros de TypeScript no build)