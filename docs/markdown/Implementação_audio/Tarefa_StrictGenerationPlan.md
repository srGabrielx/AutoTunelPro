### Tarefa: Implementação da FASE B — Bass & Drums Consumindo StrictGenerationPlan

Você deve refatorar os motores de geração de Baixo e Bateria (`engines/bass/index.ts`, `engines/drums/index.ts` e seus adapters em `engines/`) e o fluxo de geração em `studio.worker.ts` para que consumam exclusivamente o `StrictGenerationPlan` e respeitem a arquitetura determinística L0–L10.

#### Requisitos Obrigatórios:

1. **Eliminação de Decisões Musicais no Worker**:
   - O `workers/studio.worker.ts` NÃO deve conter lógicas condicionais de seção (proibido `if (isIntro)`, `if (isDrop)` para mutar canais ou injetar notas/baterias manuais).
   - O worker deve apenas orquestrar a execução passando o `SectionContext` e o plano de cada seção para os motores, ou delegar a transação ao `Director`.

2. **Engines Agnósticos a Gênero (Zero Branches de Estilo)**:
   - Proibido qualquer condicional por nome de gênero dentro dos motores (ex: `if (style === "reggae")`, `if (isTrap)`).
   - O `DrumsEngine` deve derivar o ritmo puramente a partir de `plan.drumProfile` (`snareOn`, `kickDensity`, `kickSyncopation`, `hatRolls`, `hatRollThreshold`, `snareGapMin`, etc.) e das restrições (`plan.constraints.rhythmDensity`, `plan.energy`).
   - O `BassEngine` deve derivar as notas estritamente a partir dos blocos de harmonia existentes (`state.layers.harmony.blocks`) e do `plan.bassProfile` (`syncWithKick`, `restProbability`, `slideProbability`).

3. **Derivação Determinística de Sementes com Namespaces**:
   - Proibido usar `Date.now()` ou somas manuais (`seed + 100`) no pipeline de composição.
   - Utilizar a derivação hierárquica por namespace via `deriveSeed`:
     - Baixo: `deriveSeed(sectionSeed, `bass:${variationIndex}`)`
     - Bateria: `deriveSeed(sectionSeed, `drums:${variationIndex}`)`, subdividindo isoladamente em `drums:kick`, `drums:snare` e `drums:hats`.

#### Arquivos Envolvidos:
- `engines/bass/index.ts` (e `engines/bass.ts`)
- `engines/drums/index.ts` (e `engines/drums.ts`)
- `workers/studio.worker.ts` (limpeza de regras hardcoded)
- `director/transactions/generation-transaction.ts` (garantir cascade Harmonia → Baixo → Bateria)

#### Critérios de Aceite (Gate Fase B):
- `WORKER_MUSICAL_LOGIC = ZERO` (sem notas ou mutações hardcoded no worker)
- `ENGINE_GENRE_BRANCHES = ZERO` (nenhum if por nome de estilo nos motores)
- `DETERMINISTIC_SEEDS = PASS` (todas as sementes derivadas por namespace)
- `BASS_USES_GENERATION_PLAN = PASS` (baixo consome harmonia e bassProfile)
- `DRUMS_USES_GENERATION_PLAN = PASS` (bateria consome drumProfile e constraints)
- `TYPECHECK = PASS` (zero erros de TypeScript no build)