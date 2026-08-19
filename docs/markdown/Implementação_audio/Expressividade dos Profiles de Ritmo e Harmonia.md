### Tarefa: Implementação da FASE C — Expressividade dos Profiles de Ritmo e Harmonia

Você deve enriquecer os contratos de perfis musicais (`lib/music/types.ts` e `presets/schemas/manifest.ts`) e o `ContextResolver`/`GenerationPlanner` para que os dados do perfil consigam expressar todas as nuances rítmicas e tímbricas necessárias (swing, ênfases de contratempo, One-Drop, ghost notes, tipos de grave) sem que os motores precisem de condicionais.

#### Requisitos Obrigatórios:

1. **Atualização Controlada de Schemas (`lib/music/types.ts` & `presets/schemas/`):**
   - Expandir `DrumProfile` para acomodar propriedades expressivas opcionais:
     ```typescript
     export interface DrumProfile {
       hatRolls: boolean;
       hatRollThreshold?: number;
       favoredRollCount?: 2 | 3 | 4 | 6;      // Subdivisão preferida (ex: 3 para Drill/Amapiano, 4 para Trap, 2 para BoomBap)
       pitchDropProbability?: number;        // Probabilidade de pitch drop nos hats
       kickSyncopation: number;
       kickDensity?: number;
       kickGapMin?: number;
       kickGapMax?: number;
       snareOn?: number[];                   // Beats onde a caixa/snare cai (ex: para half-time/reggae, para boom bap)
       snareDensity?: number;
       snareGapMin?: number;
       snareGapMax?: number;
       ghostNoteProbability?: number;        // Ghost notes para grooves cadenciados (Boom Bap / Hip Hop)
       offbeatEmphasis?: boolean;            // Destaque nos contratempos (Reggae / Amapiano)
     }
     ```
   - Expandir `BassProfile` para acomodar tipos e comportamentos:
     ```typescript
     export interface BassProfile {
       type: "808" | "sub" | "synth" | "log-drum" | string;
       slideProbability: number;
       syncWithKick: number;
       restProbability?: number;
       octaveJumpProbability?: number;
       sustainRatio?: number;
     }
     ```

2. **Garantia de Fallbacks e Não-Regressão no `ContextResolver` e `Planner`:**
   - No `director/context/resolver.ts` e `director/planner/index.ts`, garantir que todos os novos campos possuam valores padrão (fallbacks seguros) caso um preset antigo ou mock de teste não os defina.
   - Preservar o isolamento de perfis: `StrictGenerationPlan` deve repassar esses campos consolidados para os motores.

3. **Validação e Adaptação dos Motores (`engines/drums/` e `engines/bass/`):**
   - Garantir que o `DrumsEngine` consuma `plan.drumProfile.favoredRollCount`, `pitchDropProbability`, `ghostNoteProbability` e `snareOn` diretamente do plano.
   - Garantir que o `BassEngine` utilize `plan.bassProfile.octaveJumpProbability` e `type` para ditar o comportamento do baixo.

#### Critérios de Aceite (Gate Fase C):
- `PROFILE_SCHEMA_VALID = PASS` (interfaces e schemas tipados sem conflitos)
- `PROFILE_ISOLATION = PASS` (nenhum motor lê presets diretamente; tudo vem via StrictGenerationPlan)
- `FALLBACKS_ROBUST = PASS` (presets sem os novos campos continuam funcionando 100%)
- `SUITE_TESTS = PASS` (todos os testes de arquitetura e L0-L10 continuam passando)
- `TYPECHECK = PASS` (`npx tsc --noEmit` limpo)