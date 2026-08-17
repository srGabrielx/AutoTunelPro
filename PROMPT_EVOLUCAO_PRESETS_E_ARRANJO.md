# Prompt Mestre — Evolução dos Presets, Seeds e Arranjo do AutoTunelPro

## Papel

Atue como arquiteto sênior de software musical e engenheiro de áudio especializado em TypeScript, Next.js, Web Audio API, Web Workers, MIDI, DSP e geração procedural.

Trabalhe sobre o código atual do AutoTunelPro. O objetivo é transformar os presets existentes em resultados musicalmente coerentes, distintos por gênero e úteis em uma produção real, preservando a lógica que já funciona.

Não reescreva o projeto do zero. Não apague CSS, componentes, presets aprovados ou contratos públicos. Antes de editar, inspecione o código real e execute o baseline.

## Resultado esperado

O sistema deverá:

1. Preservar os presets que já produzem bons resultados.
2. Corrigir ou substituir apenas configurações comprovadamente fracas.
3. Produzir variações perceptivelmente diferentes para seeds diferentes.
4. Reproduzir exatamente o mesmo resultado quando a mesma seed for bloqueada e reutilizada.
5. Manter a identidade do preset mesmo com variações.
6. Gerar Intro, Verso e Drop persistentes, sem voltar ao conteúdo original ao alternar blocos.
7. Permitir regenerar uma faixa, um bloco ou o arranjo completo sem sobrescrever conteúdo fora do alvo.
8. Manter player, MIDI e WAV sincronizados pela mesma timeline.
9. Melhorar timbres de 808 e hats sem esconder clipping apenas diminuindo o master.
10. Continuar leve, testável e preparado para novos gêneros.

---

## 1. Auditoria obrigatória

Antes de qualquer alteração:

- Execute `git status` e `git log --oneline -15`.
- Confirme o commit e branch usados como base.
- Leia `GEMINI.md`, quando existir.
- Execute `npm ci`, TypeScript, lint, testes e build.
- Registre falhas existentes antes de editar.
- Mapeie presets, motores, composition plan, groove plan, transporte, DSP, MIDI, workers e estado do arranjo.
- Identifique quais presets são bons, aceitáveis ou fracos sem aplicar mudança global às cegas.

Arquivos esperados devem ser confirmados no repositório; não invente caminhos. Verifique especialmente:

- `components/BeatStudio.tsx`
- `lib/music/styles.ts`
- `lib/music/composition-plan.ts`
- `lib/music/groove-plan.ts`
- `lib/music/audio-transport.ts`
- `lib/music/synthesis-presets.ts`
- `lib/engines/melody.ts`
- `lib/engines/melody-pipeline.ts`
- `lib/engines/bass.ts`
- `lib/engines/drums.ts`
- `lib/export/dsp-renderer.ts`
- `lib/export/midi.ts`
- workers e testes relacionados

Não faça alterações visuais nesta tarefa, salvo o mínimo necessário para os controles de geração e seleção de presets.

---

## 2. Catálogo modular de presets

Organize os presets por gênero sem duplicar motores:

```text
lib/music/presets/
  types.ts
  catalog.ts
  trap-br.ts
  trap-usa.ts
  uk-drill.ts
  hip-hop.ts
  funk.ts
  amapiano.ts
```

`catalog.ts` deve ser a única porta pública do catálogo. A estrutura exata pode ser adaptada ao projeto, mas os presets não devem permanecer concentrados em um arquivo monolítico.

Cada preset deve separar claramente:

- Identidade musical.
- Harmonia e escala.
- Ritmo e sensação de tempo.
- Regras de melodia.
- Regras de 808.
- Regras de bateria.
- Síntese e mixagem.
- Arranjo e curva de energia.

Use um contrato tipado semelhante a:

```ts
interface PresetDefinition {
  id: string;
  version: number;
  label: string;
  genre: StyleId;
  tags: string[];
  bpmRange: [number, number];
  defaultBpm: number;
  rhythmicFeel: "half-time" | "normal" | "double-time";
  harmonicProfile: HarmonicProfile;
  melodyProfile: MelodyProfile;
  bassProfile: BassProfile;
  drumProfile: DrumProfile;
  synthesisProfile: SynthesisProfile;
  arrangementProfile: ArrangementProfile;
}
```

Não copie músicas ou melodias existentes. Presets associados a referências artísticas devem representar características gerais de produção e gênero, sem reproduzir material protegido.

---

## 3. Seeds diferentes com identidade preservada

### Contrato obrigatório

- Mesma seed + mesmo preset + mesmas opções = mesmo plano de eventos.
- Seed diferente = variação estrutural perceptível na maioria das gerações.
- Seed diferente não pode destruir a identidade do gênero.
- A seed não substitui as regras musicais; ela decide entre escolhas válidas.

Ao clicar em “Nova variação”, gere uma nova root seed com `crypto.getRandomValues`. Não use somente `Date.now()` e não use `Math.random()` dentro dos motores.

Derive sub-seeds estáveis por hash:

```text
rootSeed
  + presetId
  + presetVersion
  + sectionId
  + trackId
  + generationIndex
  + attempt
```

Cada instrumento recebe sua própria sub-seed, mas todos compartilham o mesmo `CompositionPlan`. Assim, melodia, 808 e bateria variam sem perder coordenação.

### Validador de novidade

Crie fingerprints normalizados para evitar que seeds diferentes retornem quase o mesmo material:

- Melodia: intervalos, ritmo, duração, pausas e contorno; ignore transposição absoluta no fingerprint estrutural.
- Bateria: instrumento, posição relativa, rolls, acentos e microtiming.
- 808: graus, ataques, durações, slides e relação com o kick.

Compare o resultado novo com um histórico curto das últimas gerações do mesmo preset. Se a similaridade ultrapassar o limite definido, gere novamente usando `attempt + 1`, com no máximo quatro tentativas determinísticas.

O histórico serve somente para rejeitar cópias quase idênticas. Não armazene áudio bruto para isso.

Inclua opção “Bloquear seed”. Quando ativa, regenerar deve reproduzir exatamente o mesmo resultado. Quando desativada, “Nova variação” deve criar outra root seed.

---

## 4. Qualidade musical dos presets

Não aumente qualidade apenas adicionando mais notas ou hits. Cada preset deve definir espaços e relações musicais.

### Melodia

Validar e controlar:

- Progressão harmônica e velocidade de troca de acordes.
- Motivo principal e variações reconhecíveis.
- Frases com começo, tensão, respiro e resolução.
- Notas do acorde em pontos estruturais.
- Notas de passagem com destino e resolução explícitos.
- Tessitura por instrumento.
- Contorno e limite de saltos.
- Densidade de acordo com BPM, seção e gênero.
- Contraste entre Intro, Verso e Drop.

O random não deve escolher qualquer nota da escala. Ele deve escolher entre candidatos pontuados pelo contexto harmônico, motivo, registro, direção e função da frase.

### Bateria

Validar e controlar:

- Kick e backbeat característicos do gênero.
- Groove base estável com variações controladas.
- Hats, ghost notes e rolls dependentes do perfil.
- Fills concentrados em transições.
- Velocity e microtiming determinísticos.
- `rhythmicFeel` separado do BPM.
- Limite de densidade para não transformar todo preset em double-time.

### 808

Validar e controlar:

- Fundamental afinada à nota MIDI.
- Relação com kick e harmonia.
- Duração e slides por gênero.
- Espaço entre ataques.
- Saturação paralela com compensação de ganho.
- Sidechain suave e previsível.
- Registro seguro para reprodução em celulares e caixas comuns.

Não force todos os ataques do 808 a coincidirem com o kick. Use faixas de alinhamento definidas por gênero.

---

## 5. Timbres mais realistas

Separe “preset musical” de “preset de síntese”. Não altere todos os presets ao mudar um oscilador ou filtro.

Para timbres acústicos ou instrumentais realistas, reconheça que osciladores simples possuem limite. Utilize apenas samples próprios, originais ou licenciados, carregados por `AudioBuffer`, com fallback de síntese procedural. Não inclua material protegido sem licença.

### Hi-hats

- Criar bus próprio de hats.
- Pré-alocar fontes de ruído ou reutilizar buffers determinísticos.
- Suavizar envelopes para evitar clicks digitais.
- Band-limitar regiões agressivas.
- Limitar ganho e velocity antes do master.
- Implementar choke entre open-hat e closed-hat.
- Limitar sobreposição em rolls.
- Aplicar panorama sutil e determinístico quando o preset permitir.

Não “corrija” hats reduzindo o volume do projeto inteiro.

### 808

- Separar subgrave limpo e camada de saturação.
- Remover DC offset.
- Manter subgrave mono.
- Compensar ganho após drive.
- Controlar pitch envelope e slides em cents/tempo.
- Usar perfil de 808 diferente por gênero.

### Master

- Cada faixa deve passar por GainNode próprio.
- Hats e 808 devem ter buses próprios.
- Master limiter é proteção final, não solução para mix ruim.
- Playback e DSP offline devem compartilhar parâmetros de síntese e plano de eventos.
- Medir pico por faixa e master nos testes.

---

## 6. Persistência correta de Intro, Verso e Drop

### Bug confirmado

O estado atual carrega `arrangementBlocks[index]` ao alternar seções, mas edições feitas em `melodyLayers`, `bass` e `drums` não são persistidas no bloco ativo. Ao retornar à seção, o snapshot original sobrescreve a edição.

### Modelo correto

`arrangementBlocks` deve ser a fonte única da verdade. Use `activeBlockId` ou índice estável somente para seleção.

Crie operações explícitas:

```ts
patchActiveBlock(patch)
patchTrackInBlock(blockId, trackId, patch)
selectArrangementBlock(blockId)
queueArrangementBlock(blockId)
```

Regras:

- Toda edição manual atualiza imediatamente o bloco ativo.
- Regenerar uma faixa altera somente essa faixa no bloco ativo.
- Regenerar um bloco altera somente o bloco ativo.
- Gerar arranjo completo pode substituir todos os blocos, mas exige ação explícita.
- Alternar de Intro para Drop não salva ou restaura snapshots antigos fora do estado canônico.
- O índice ativo nunca deve voltar para zero por efeito colateral de `setState` ou `useEffect`.
- Resposta obsoleta de worker não pode sobrescrever o bloco mais recente.
- Cada solicitação deve carregar `requestId`, `blockId`, `trackId` e seed.

Durante playback, uma troca de seção deve ser quantizada para o próximo compasso:

1. Usuário seleciona a próxima seção.
2. Salvar `pendingBlockId`.
3. Continuar o compasso atual.
4. No limite exato do compasso, trocar o plano de eventos.
5. Não reiniciar o AudioContext nem criar outro scheduler.

---

## 7. Regeneração com alvo explícito

A interface deve oferecer ações distintas:

- “Nova variação desta faixa”.
- “Regenerar Melodia”.
- “Regenerar 808”.
- “Regenerar Drums”.
- “Regenerar bloco atual”.
- “Gerar arranjo completo”.

Antes de enviar ao worker, monte um comando tipado contendo:

```ts
interface GenerationCommand {
  scope: "track" | "section" | "arrangement";
  blockId: string;
  trackId?: string;
  presetId: string;
  presetVersion: number;
  rootSeed: number;
  lockSeed: boolean;
}
```

Uma ação de faixa não pode alterar seed ou conteúdo das outras faixas. Uma ação de seção não pode alterar outras seções. Uma ação de arranjo completo deve deixar isso claro na interface.

---

## 8. Estratégia para preservar presets bons

Antes de calibrar presets:

1. Escolha seeds de referência dos presets considerados bons.
2. Salve apenas seus planos de eventos e métricas como fixtures de regressão.
3. Classifique cada preset como `approved`, `needs-tuning` ou `experimental`.
4. Não aplique alterações globais que mudem presets `approved` sem atualizar e justificar suas fixtures.
5. Mudanças de síntese devem ser configuráveis por preset.

Não declare qualidade musical com base somente em TypeScript e testes unitários. Registre também uma lista de validação auditiva para diferentes seeds e dispositivos.

---

## 9. Testes obrigatórios

Adicionar testes determinísticos para:

- Mesma seed produz exatamente o mesmo plano.
- Seeds diferentes alcançam taxa mínima de fingerprints distintos.
- Diferentes seeds continuam dentro do perfil do preset.
- Presets diferentes apresentam diferenças mensuráveis de ritmo, densidade, harmonia ou timbre.
- Intro editada continua editada após Intro → Drop → Verso → Intro.
- Drop editado não altera Intro ou Verso.
- Rotação automática não restaura snapshots antigos.
- Regeneração de faixa não altera outras faixas.
- Resposta obsoleta de worker é descartada.
- Troca de seção ocorre na fronteira do compasso.
- BPM real não muda por causa de half-time ou double-time.
- Existe apenas um scheduler.
- Stop encerra fontes agendadas e ativas.
- Hats não ultrapassam o teto de seu bus.
- Master não apresenta clipping.
- WAV, MIDI e playback utilizam a mesma timeline estrutural.

Execute os testes de qualidade sobre um conjunto fixo de pelo menos 32 seeds por preset. Não escreva testes que apenas reproduzam a própria implementação sem validar invariantes musicais.

---

## 10. Ordem de implementação

Implemente em lotes pequenos:

1. Baseline de build, CSS e testes.
2. Correção da persistência Intro/Verso/Drop.
3. Comandos de regeneração por escopo.
4. Contrato de seeds e fingerprint de novidade.
5. Catálogo modular de presets.
6. Preservação dos presets aprovados.
7. Ajuste dos presets fracos.
8. Correção de hats e 808 por bus/perfil.
9. Paridade player/MIDI/WAV.
10. Validação auditiva documentada.

Após cada lote, execute:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Se algum script não existir ou estiver quebrado, corrija a infraestrutura antes de avançar. Não ignore falhas e não altere testes apenas para obter resultado verde.

---

## Restrições finais

- Não apagar ou reconstruir `app/globals.css`.
- Não redesenhar a aplicação.
- Não remover presets bons.
- Não usar `Math.random()` nos motores, scheduler ou DSP.
- Não regenerar conteúdo silenciosamente ao trocar parâmetros.
- Não usar estado React como relógio de áudio.
- Não criar uma segunda implementação paralela dos mesmos motores.
- Não alterar contratos sem adaptadores e testes.
- Não fazer commit, push ou deploy sem autorização explícita.

## Formato da primeira resposta

Antes de editar, apresente:

1. Commit e branch analisados.
2. Baseline de build e testes.
3. Mapa dos arquivos afetados.
4. Presets classificados como bons, ajustáveis ou fracos.
5. Causa comprovada da repetição entre seeds.
6. Causa comprovada da perda de estado entre Intro, Verso e Drop.
7. Plano do primeiro lote com testes.

Aguarde aprovação antes de modificar o código.
