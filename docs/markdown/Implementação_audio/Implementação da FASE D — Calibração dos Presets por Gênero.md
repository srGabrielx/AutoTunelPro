### Tarefa: Implementação da FASE D — Calibração dos Presets com Organização Estrita por Pastas de Gênero

Você deve organizar e calibrar os presets dentro de `lib/presets/`, garantindo que **cada gênero tenha sua própria subpasta dedicada** e que os arquivos de artistas/estilos fiquem guardados dentro do seu respectivo gênero. O `catalog.ts` deve importar de cada pasta e registrar todos no catálogo central.

#### 1. Estrutura Obrigatória de Pastas:
- `lib/presets/trap/` → `trap-br.ts`, `trap-usa.ts`, `trap-uk.ts`
- `lib/presets/boombap/` → `boombap-default.ts`
- `lib/presets/reggae/` → `reggae-default.ts`
- `lib/presets/funk/` → `funk-default.ts`
- `lib/presets/amapiano/` → `amapiano-default.ts`
- `lib/presets/hiphop/` → `hiphop-default.ts`
- `lib/presets/dubstep/` → `dubstep-default.ts`

#### 2. Calibração Musical dos Presets (Consumindo os campos da Fase C):

- **Reggae (`lib/presets/reggae/reggae-default.ts`)**:
  - `drumProfile`: `snareOn:`, `kickDensity: 4`, `kickSyncopation: 0.1`, `hatRolls: false`, `offbeatEmphasis: true`.
  - `bassProfile`: `type: "sub"`, `slideProbability: 0.05`, `syncWithKick: 0.4`, `restProbability: 0.75`.
  - `synthesisProfile`: `sub: { drive: 0.1, attack: 0.02, release: 0.5 }`.

- **Boom Bap (`lib/presets/boombap/boombap-default.ts`)**:
  - `drumProfile`: `snareOn:`, `kickDensity: 8`, `kickSyncopation: 0.4`, `ghostNoteProbability: 0.35`, `hatRolls: false`.
  - `bassProfile`: `type: "sub"`, `slideProbability: 0.0`, `syncWithKick: 0.95`, `restProbability: 0.85`.
  - `synthesisProfile`: `sub: { drive: 0.15, attack: 0.01, release: 0.45 }`.

- **Trap (`lib/presets/trap/trap-br.ts`, `trap-usa.ts`, `trap-uk.ts`)**:
  - `drumProfile`: `snareOn:`, `kickDensity: 14`, `kickSyncopation: 0.7`, `hatRolls: true`, `favoredRollCount: 4`, `pitchDropProbability: 0.35`.
  - `bassProfile`: `type: "808"`, `slideProbability: 0.35`, `syncWithKick: 0.8`.
  - `synthesisProfile`: `808: { drive: 0.5, attack: 0.01, release: 1.2 }`.

- **Funk (`lib/presets/funk/funk-default.ts`)**:
  - `drumProfile`: `snareOn:`, `kickDensity: 16`, `kickSyncopation: 0.9`, `hatRolls: false`.
  - `bassProfile`: `type: "sub"`, `slideProbability: 0.1`, `syncWithKick: 0.8`.

- **Amapiano (`lib/presets/amapiano/amapiano-default.ts`)**:
  - `drumProfile`: `snareOn:`, `favoredRollCount: 3`, `offbeatEmphasis: true`.
  - `bassProfile`: `type: "log-drum"`, `slideProbability: 0.2`, `syncWithKick: 0.5`.

- **Dubstep (`lib/presets/dubstep/dubstep-default.ts`)**:
  - `drumProfile`: `snareOn:`, `kickDensity: 8`, `kickSyncopation: 0.8`, `hatRolls: false`.
  - `bassProfile`: `type: "synth"`, `slideProbability: 0.5`, `octaveJumpProbability: 0.3`.
  - `synthesisProfile`: `synth: { drive: 0.9, attack: 0.01, release: 1.5 }`.

#### 3. Registro Central (`lib/presets/catalog.ts`):
- O `catalog.ts` deve importar cada preset de sua respectiva pasta de gênero e registrá-lo via `registerPreset()`.
- Nenhuma dependência visual ou de CSS deve ser quebrada.

#### Critérios de Aceite (Gate Fase D):
- `FOLDER_STRUCTURE_CLEAN = PASS` (cada gênero em sua própria pasta em `lib/presets/<genre>/`)
- `PRESET_REGISTRY_COMPLETE = PASS` (`catalog.ts` importa e registra todos os presets por pasta)
- `SUITE_TESTS = PASS` (todos os testes passando)
- `TYPECHECK = PASS` (`npx tsc --noEmit` limpo)