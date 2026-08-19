# AutoTunelPro — Auditoria Forense, Correção do Motor Musical e Garantia de Qualidade

## Instrução principal

Atue como engenheiro principal de sistemas musicais generativos, especialista em TypeScript, Next.js, Web Audio, MIDI, DSP, geração procedural determinística e arquitetura orientada a eventos.

Use o maior nível de raciocínio e investigação disponível. Gaste o orçamento de contexto em leitura real do repositório, rastreamento de chamadas, comparação de estados, execução de testes, análise de artefatos e validação das correções. Não desperdice a execução repetindo este documento ou produzindo teoria sem evidência.

Sua tarefa não termina em uma revisão superficial. Você deve:

1. reproduzir ou isolar os problemas;
2. provar a causa raiz com caminhos de execução e estado;
3. implementar as correções no projeto existente;
4. criar testes que impeçam a regressão;
5. executar todas as validações disponíveis;
6. entregar um relatório final com evidências, limitações restantes e arquivos alterados.

Não afirme que algo está corrigido apenas porque o código compila. O critério final inclui comportamento musical, determinismo, variedade, sincronização, duração, reprodução e exportação.

---

## 1. Verdade do produto

O AutoTunelPro não é um montador de loops independentes. Ele é um compositor procedural capaz de gerar um beat completo, coerente, expressivo, variável e pronto para reprodução e exportação.

Ao clicar em **Gerar padrão** ou **Gerar completo**, o sistema deve compor uma unidade musical completa usando, de forma coordenada:

- gênero e identidade do preset;
- BPM;
- tom e escala;
- harmonia e progressão;
- motivos e fraseamento;
- bateria;
- kick, snare, clap, hi-hat, rolls e fills;
- groove, swing e microtiming;
- 808/baixo coordenado com kick e harmonia;
- timbres e funções das faixas;
- intensidade;
- temperatura/criatividade;
- complexidade;
- curva de energia;
- seções e transições;
- sonoridade final;
- timeline comum para player, WAV, MIDI e stems.

O usuário pode controlar parâmetros, mas o resultado de um único clique já deve soar como uma decisão musical completa, não como notas aleatórias colocadas sobre loops genéricos.

### Regra central

O motor superior gera a música inteira. Melody, Harmony, Bass, Drums, Arrangement, Synthesis, Audio e Export podem continuar modulares internamente, mas precisam compartilhar o mesmo contexto e servir à mesma composição.

Modularidade de software não pode significar isolamento musical.

---

## 2. Correção conceitual obrigatória sobre arranjo

Não implemente o arranjo como um pós-processador mecânico que recebe um loop pronto, corta em pedaços, duplica blocos, silencia faixas e chama isso de música.

O arranjo deve participar do plano global da composição desde o início. Intro, verso, ponte, build, drop e outro devem nascer do mesmo DNA musical, com conhecimento das seções anteriores e seguintes.

O arranjo pode determinar ou solicitar transformações musicais, por exemplo:

- redução ou aumento de densidade;
- entrada e saída intencional de instrumentos;
- variação de motivos;
- mudança de oitava ou registro;
- inversão ou extensão harmônica;
- ghost notes;
- antecipações;
- fills e rolls de transição;
- call and response;
- variação do 808;
- mudança de articulação;
- automação de energia;
- silêncio intencional;
- desenvolvimento A, A', B e retorno transformado.

Essas transformações devem ser realizadas dentro do contexto do compositor e das engines responsáveis. Não devem ser obtidas fragmentando eventos sem consciência musical.

### Resultado esperado

- As seções mantêm identidade comum.
- Há contraste perceptível entre seções.
- Motivos e groove evoluem em vez de simplesmente repetir.
- Trocar Intro/Verso/Drop na interface não restaura estado antigo.
- Regenerar uma seção não destrói as demais.
- Player e exportadores executam o mesmo arranjo persistido.

---

## 3. Significado correto dos presets

Preset não é uma música congelada e não pode devolver sempre o mesmo padrão.

### 3.1 Preset de gênero/estilo

É uma definição de identidade musical e um conjunto de distribuições, limites e preferências. Pode influenciar:

- faixas de BPM;
- escalas e comportamento harmônico;
- progressões preferenciais;
- síncope;
- swing;
- densidade rítmica;
- colocação de kick/snare;
- linguagem de hi-hat e rolls;
- comportamento do 808;
- contorno melódico;
- tensão e resolução;
- duração de frases;
- curvas de energia;
- tipos de transição;
- instrumentação;
- síntese e mixagem.

### 3.2 Preset de faixa/instrumento

Determina função musical e comportamento da faixa, incluindo:

- papel: lead, harmony, counter melody, bass, 808, kick, snare, hats etc.;
- timbre;
- registro permitido;
- articulação;
- envelope;
- polyphony;
- velocity;
- densidade;
- relação com outras faixas;
- canal e roteamento.

### 3.3 Regra de variação

O preset limita e orienta o espaço de busca, mas não contém uma sequência fixa. Duas gerações com seed/variationIndex diferentes devem produzir estruturas perceptivelmente diferentes sem perder a identidade do estilo.

Presets de gêneros diferentes precisam gerar diferenças perceptíveis não apenas no timbre, mas também em ritmo, harmonia, melodia, 808, groove, densidade e arranjo.

---

## 4. Arquitetura existente que deve ser preservada

Trabalhe sobre o projeto TypeScript/Next.js/React atual. Não reescreva em Python. Não comece outro projeto. Não substitua a interface aprovada. Não remova contratos públicos sem demonstrar necessidade e impacto.

Áreas conhecidas que devem ser localizadas e verificadas no repositório atual:

- `components/BeatStudio.tsx` — interface, estado e comandos;
- `lib/music/styles.ts` — estilos/categorias;
- `lib/music/composition-plan.ts` — plano de composição, se existir nesse caminho;
- `lib/music/groove-plan.ts` — plano compartilhado de groove, se existir;
- `lib/engines/*` — melody, harmony, bass, drums, arrangement e engines relacionadas;
- `lib/audio/audio-transport.ts` ou equivalente — scheduler/player;
- `lib/audio/dsp-renderer.ts` ou equivalente — renderização WAV/DSP;
- `lib/export/midi.ts`, `lib/midi.ts` ou equivalente — exportação MIDI;
- workers de geração, reprodução e exportação;
- contratos de `GenerationIdentity`, `CompositionState`, `MusicalEvent` e `EventId`;
- persistência, cache e schemas;
- testes e golden seeds.

Esses caminhos são pistas, não licença para presumir a arquitetura. Localize os arquivos reais usando busca no repositório e prove o fluxo atual antes de editar.

### Contratos já planejados ou implementados que não devem ser destruídos

Verifique no código a existência e integração real de:

- PPQ/ticks canônicos;
- eventos musicais serializáveis;
- IDs determinísticos;
- schemas versionados;
- `GenerationIdentity`;
- seeds derivadas por namespace;
- `CompositionState` persistente;
- golden seeds;
- `buildGrooveEventPlan()` ou fonte única equivalente;
- scheduler único;
- sidechain Kick→808 separado do ganho manual;
- regeneração seletiva;
- versões de preset/engine/schema.

Não confie em documentos dizendo que um lote foi concluído. O código executado, os imports reais e os testes são a fonte de verdade. Scaffolds não integrados não contam como implementação.

---

## 5. Sintomas e evidências disponíveis

Trate cada item com o nível correto de certeza.

### 5.1 Relatos que precisam ser reproduzidos ou provados

- Alguns presets continuam produzindo o mesmo padrão ao regenerar.
- A geração ficou mais genérica, previsível e repetitiva depois da introdução do arranjo.
- O beat completo perdeu groove e musicalidade ao ser quebrado em pequenas partes.
- CID/identidade parece voltar para `0` e `1` em situações de geração completa ou restauração.
- Algumas seções podem restaurar o conteúdo original quando o usuário alterna entre Intro/Verso/Drop.
- Há presets que parecem alterar apenas o timbre ou a UI, sem alterar suficientemente a linguagem musical.

Não transforme esses relatos diretamente em causa raiz. Reproduza, instrumente e prove.

### 5.2 Evidência concreta do artefato MIDI/WAV já exportado

Um export analisado apresentou:

- MIDI SMF Format 1 válido, com 4 tracks e divisão de 480 ticks por quarter note;
- tempo próximo de 124 BPM e métrica 4/4;
- faixa de melodia terminando por volta de 5,80 segundos, aproximadamente 3 compassos;
- faixa de bateria terminando por volta de 5,75 segundos, aproximadamente 3 compassos;
- faixa de 808 terminando por volta de 81,28 segundos, aproximadamente 42 compassos;
- 189 eventos redundantes exatos de 808 distribuídos em grupos duplicados;
- 18 eventos exatos duplicados de hi-hat;
- WAV com aproximadamente 12,46 segundos;
- player, WAV e MIDI portanto não representaram claramente a mesma duração/estrutura.

O projeto também possui referência arquitetural a PPQ canônico de 960. Determine se a exportação em 480 é conversão intencional e correta ou se existe divergência de unidade. Não altere PPQ cegamente.

### 5.3 Evidência visual anterior

Foi observado timeout em uma requisição `generate-all`, seguido de sucesso em tentativa posterior. Investigue concorrência, requestId, cancelamento, cache, stragglers e consistência do estado, mas não misture esse problema com a causa musical sem evidência.

### 5.4 Commit visual recente

Um commit recente apenas ampliou abas/filtros em `BeatStudio.tsx` para categorias como Hip Hop/Boom Bap, Reggae e Dubstep, alinhadas a `styles.ts`. Esse commit pode estar visualmente correto e ainda assim não corrigir nenhum problema do motor. Não use consistência entre abas e estilos como prova de saúde da geração.

---

## 6. Invariantes obrigatórios

Implemente e teste estas propriedades.

### 6.1 Identidade, seed e variação

1. Mesma configuração completa + mesma seed + mesmo `variationIndex` + mesmas versões = mesma composição serializada.
2. `variationIndex` diferente = composição musicalmente diferente, mantendo identidade do preset.
3. Seed bloqueada = reprodução determinística.
4. Seed desbloqueada + regenerar = incremento real de variação; não reutilizar resultado em cache.
5. Nenhuma engine musical usa `Math.random()` ou fonte de entropia invisível.
6. Todas as sub-seeds são derivadas deterministicamente do contexto necessário.
7. `attempt` de candidatos diferentes precisa produzir candidatos diferentes.
8. Cache key deve incluir todos os campos que alteram o resultado.
9. Banco/cache persistem estado, mas não escolhem decisões musicais por conta própria.
10. CID/compositionId, seed, generationIndex e attempt não podem ser confundidos entre si.

Uma derivação equivalente a esta deve ser verificada, adaptada ao contrato existente e testada:

```text
rootSeed
+ presetId
+ presetVersion
+ engineVersion
+ parametersHash
+ sectionId
+ trackId
+ generationIndex/variationIndex
+ attempt
→ deterministicSubSeed
```

Não force exatamente esse formato caso o projeto já tenha um contrato equivalente melhor. Preserve compatibilidade e migre estado antigo quando necessário.

### 6.2 Contexto musical compartilhado

Todos os geradores devem receber ou conseguir consultar o mesmo plano global contendo, no mínimo:

- tonalidade e escala;
- mapa harmônico;
- estrutura/seções;
- motivos principais;
- groove DNA;
- curva de energia;
- instrumentação e papéis;
- duração canônica;
- seed/identidade;
- restrições do preset;
- dependências entre faixas.

Melody, harmony, drums e bass não podem gerar quatro músicas independentes e apenas somá-las no final.

### 6.3 Relações entre faixas

- A melodia deve considerar harmonia, motivos, fraseamento, tensão/resolução e registro.
- O baixo/808 deve considerar acordes, notas fundamentais, kick real, espaço rítmico e glide.
- Drums devem considerar seção, energia, groove, fills e espaço para o baixo.
- Kick e 808 não podem colidir por acidente em todos os ataques.
- Rolls precisam ser eventos explícitos e determinísticos.
- Transições devem preparar a seção seguinte.

### 6.4 Timeline e exportação

- Player, WAV, MIDI, stems e futura saída MIDI ao vivo consomem a mesma composição/timeline canônica.
- Exportadores não podem reconstruir ou reinterpretar o arranjo.
- Toda track deve respeitar `arrangementEndTick` ou equivalente.
- Tail de reverb/delay pode estender áudio, mas não deve multiplicar eventos MIDI.
- Nenhum evento MIDI exato pode ser duplicado sem intenção explicitamente representada.
- 808 deve ser monofônico por padrão, exceto sobreposição curta e intencional para glide.
- Conversões entre ticks, steps, beats, bars, segundos e samples devem ficar centralizadas e testadas.

### 6.5 Estado e concorrência

- Um resultado antigo não pode sobrescrever geração mais recente.
- `requestId` deve identificar a requisição vencedora.
- Abort/cancelamento não pode deixar estado parcial.
- Gerar uma faixa não deve regenerar silenciosamente todas as demais.
- Gerar a composição completa deve produzir um snapshot atômico.
- Alternar seção não deve substituir o conteúdo persistido.

---

## 7. Pipeline musical desejado

Preserve componentes equivalentes já existentes e corrija apenas o necessário para alcançar semanticamente este fluxo:

```text
UI + comandos
  ↓
Snapshot imutável dos parâmetros
  ↓
ResolvedGenerationContext
  - gênero/preset
  - presets de faixas
  - BPM/tom/escala
  - intensidade/temperatura/complexidade
  - seed/variationIndex/versões
  ↓
CompositionPlan global
  - harmonia
  - motivos
  - groove DNA
  - energia
  - estrutura e transições
  - instrumentação
  ↓
Geração coordenada das faixas
  - drums/harmony/melody/bass conhecem o mesmo plano
  - dependências explícitas entre kick e 808
  ↓
Arrangement-aware development
  - variações e transformações do mesmo DNA
  ↓
Validator + Repair controlado
  - repara violações sem achatar toda novidade
  ↓
Candidate scoring/selection
  ↓
CompositionState serializável
  ↓
Timeline canônica única
  ↓
Player | WAV | MIDI | stems | saída MIDI ao vivo
```

O nome das classes não importa. As responsabilidades e invariantes importam.

---

## 8. Qualidade: geração de candidatos e seleção

Uma única sequência aleatória não garante um beat excelente. Se a arquitetura atual permitir, gere múltiplos candidatos determinísticos por clique usando `attempt` namespaced e escolha o melhor por métricas musicais.

Comece com um número pequeno e configurável de candidatos para não destruir a latência. Permita modo de alta qualidade com mais tentativas.

O avaliador deve considerar, sem fingir que métricas substituem audição humana:

- validade de escala/harmonia;
- voice leading;
- força e estabilidade do motivo;
- fraseamento;
- tensão e resolução;
- densidade adequada ao gênero/seção;
- groove e síncope;
- equilíbrio entre repetição e novidade;
- coordenação kick↔808;
- colisões rítmicas;
- contraste e continuidade entre seções;
- qualidade das transições;
- amplitude/velocity fora de limites;
- repetição mecânica de compassos;
- identidade do preset;
- diferença em relação às últimas gerações/fingerprints.

### Cuidado com o Repair

Audite se o validator/repair está convertendo candidatos diferentes no mesmo padrão seguro. Compare fingerprints antes e depois do repair. Uma correção excessiva pode ser a causa oculta da repetição.

### Cuidado com fallback

Fallback não pode retornar silenciosamente sempre o mesmo motivo ou loop. Se um fallback for inevitável:

- ele deve ser determinístico pela identidade completa;
- preservar gênero e contexto;
- gerar variação válida;
- registrar telemetria estruturada em desenvolvimento/teste;
- nunca mascarar erro recorrente do pipeline.

---

## 9. Protocolo obrigatório de execução

### Fase 0 — Preservação e baseline

Antes de editar:

1. Execute `git status --short`.
2. Execute `git log --oneline -15`.
3. Leia `GEMINI.md`, `AGENTS.md`, regras locais e documentação arquitetural aplicável.
4. Identifique o package manager pelo lockfile.
5. Leia `package.json` e liste scripts reais.
6. Instale dependências apenas pelo fluxo já usado pelo projeto.
7. Rode typecheck, lint, testes e build existentes.
8. Registre falhas preexistentes separadamente.
9. Não reverta mudanças do usuário.
10. Não faça commit, push, reset destrutivo ou alteração de infraestrutura externa sem autorização explícita.

### Fase 1 — Mapa forense do fluxo real

Produza um mapa baseado em imports e chamadas reais:

```text
botão/comando
→ handler
→ snapshot de parâmetros
→ resolução do preset
→ criação de identidade/seed/CID
→ cache/banco
→ worker/API
→ planner/director
→ engines
→ validator/repair
→ estado
→ timeline
→ player/WAV/MIDI
```

Para cada etapa, informe:

- arquivo e símbolo;
- entrada;
- saída;
- campos perdidos ou sobrescritos;
- fonte de aleatoriedade;
- unidade temporal;
- cache/persistência;
- possibilidade de fallback;
- testes existentes.

Não pare após produzir o mapa. Use-o para corrigir.

### Fase 2 — Reprodução e instrumentação

Crie testes ou scripts temporários seguros para capturar, por geração:

- configuração resolvida;
- presetId/presetVersion;
- compositionId/CID;
- masterSeed;
- variationIndex/generationIndex;
- parametersHash;
- sub-seeds por engine;
- attempt;
- fingerprint antes/depois do repair;
- número de eventos por track/seção;
- firstTick/lastTick;
- arrangementEndTick;
- quantidade de eventos duplicados;
- hashes do CompositionPlan e CompositionState.

Não deixe logs ruidosos ou dados sensíveis em produção. Prefira ferramentas de teste ou debug condicionadas ao ambiente.

Reproduza no mínimo:

1. mesma seed e parâmetros duas vezes;
2. seed diferente;
3. mesmo preset com dez regenerações;
4. presets de gêneros diferentes;
5. gerar somente uma faixa;
6. gerar tudo;
7. alternar Intro/Verso/Drop repetidamente;
8. salvar/recarregar estado;
9. exportar WAV e MIDI do mesmo snapshot;
10. duas gerações concorrentes onde a segunda deve vencer.

### Fase 3 — Classificação das causas

Classifique cada achado como:

- causa raiz comprovada;
- fator contribuinte;
- regressão;
- dívida arquitetural;
- problema de qualidade musical;
- problema de exportação;
- problema de UI sem relação causal;
- hipótese descartada.

Para declarar causa raiz, inclua:

- caminho de execução;
- estado/valor incorreto;
- comportamento esperado;
- reprodução mínima;
- teste que falha antes do patch.

### Fase 4 — Implementação incremental

Corrija na seguinte ordem, ajustando apenas quando a evidência exigir:

1. identidade, CID, variationIndex, seeds e cache;
2. perda de parâmetros entre UI, worker/API e engines;
3. contexto/CompositionPlan global compartilhado;
4. integração musical do arranjo;
5. relações melody↔harmony e kick↔808;
6. persistência de seções e regeneração seletiva;
7. timeline única e duração canônica;
8. duplicatas e conversões MIDI;
9. candidate scoring/novelty guard;
10. timeout/concorrência de `generate-all`;
11. ajustes mínimos de UI necessários para expor o estado correto.

Depois de cada grupo:

- rode os testes diretamente afetados;
- examine o diff;
- confirme que não introduziu caminho paralelo;
- confirme que a UI existente continua funcional.

### Fase 5 — Validação ampla

Execute, quando existirem no projeto:

- typecheck;
- lint;
- unit tests;
- integration tests;
- golden tests;
- build de produção;
- testes de worker;
- testes de exportação;
- teste visual/responsivo mínimo da UI.

Use os scripts reais do `package.json`; não invente comandos que o projeto não possui.

---

## 10. Testes obrigatórios de regressão

Adicione testes equivalentes aos seguintes, adaptando nomes e framework existentes.

### 10.1 Determinismo

```text
generate(config, seed=X, variation=0)
===
generate(config, seed=X, variation=0)
```

Compare o estado musical normalizado, não timestamps/logs.

### 10.2 Novidade controlada

```text
generate(config, seed=X, variation=0)
!== musicalmente
generate(config, seed=X, variation=1)
```

Defina fingerprint por ritmo, pitch intervals, duração, onset e estrutura. Não aceite como “diferente” apenas mudança de IDs ou velocities irrelevantes.

### 10.3 Identidade de preset

Para cada preset `approved`, teste no mínimo 32 seeds:

- todas válidas;
- sem fallback constante;
- diversidade mínima interna;
- características principais dentro do perfil;
- diferença estatística entre gêneros representativos.

Evite snapshots gigantes frágeis. Use golden seeds selecionadas e métricas explicáveis.

### 10.4 Persistência e regeneração seletiva

- alternar seção preserva conteúdo;
- regenerar melodia não altera drums/808 sem dependência declarada;
- regenerar arranjo preserva identidade global;
- salvar/recarregar mantém hashes e eventos.

### 10.5 Coordenação musical

- 808 usa kicks realmente gerados, não steps hardcoded;
- notas fortes respeitam harmonia configurada;
- transições possuem preparação quando o preset exige;
- nenhuma seção fica acidentalmente vazia;
- densidade acompanha energia/intensidade.

### 10.6 Timeline e exportação

- `max(event.endTick) <= arrangementEndTick`, exceto tail explicitamente modelada;
- todas as tracks MIDI terminam no final esperado;
- WAV, MIDI e player derivam do mesmo state/timeline hash;
- conversão PPQ preserva posições musicais;
- não existem duplicatas exatas não intencionais;
- não existe drift acumulado;
- rolls preservam subdivision e `subIndex`;
- duração em segundos corresponde a BPM, ticks e compassos.

### 10.7 Concorrência

- resposta atrasada de requisição antiga não sobrescreve a nova;
- cancelamento não publica estado incompleto;
- timeout identifica engine/etapa responsável;
- retry não reutiliza acidentalmente estado parcial.

---

## 11. Critérios de aceite musical e técnico

A tarefa só pode ser considerada concluída quando houver evidência de que:

1. O mesmo preset gera variações reais quando a seed não está bloqueada.
2. A mesma identidade completa reproduz exatamente a mesma composição.
3. Gêneros diferentes apresentam linguagem musical perceptivelmente diferente.
4. O arranjo desenvolve uma composição global e não fragmenta loops independentes.
5. Melody, harmony, drums e bass compartilham contexto suficiente.
6. Kick e 808 estão coordenados.
7. Seções persistem ao alternar na interface.
8. Regeneração seletiva respeita seu escopo.
9. Player, WAV e MIDI representam a mesma timeline.
10. Nenhuma faixa MIDI excede indevidamente o fim do arranjo.
11. Duplicatas exatas são removidas ou justificadas por intenção musical explícita.
12. Testes de determinismo, novidade, persistência, coordenação e exportação passam.
13. Typecheck, testes e build passam ou falhas preexistentes são documentadas com prova.
14. A interface aprovada permanece funcional e responsiva.
15. Não existe nova fonte de aleatoriedade fora do contrato de seed.

### Avaliação auditiva

Além de testes automáticos, gere uma grade de escuta A/B com seeds registradas:

- pelo menos 3 presets de gêneros distintos;
- pelo menos 5 variações por preset;
- Intro/Verso/Drop;
- player e WAV do mesmo snapshot;
- comparação antes/depois quando o baseline puder ser preservado.

Forneça os CIDs/seeds/configurações usados. Não declare “qualidade profissional” ou “perfeito” sem avaliação humana. O objetivo é maximizar coerência, identidade e variedade com evidência reproduzível.

---

## 12. Conectar e enviar para instrumentos MIDI

Essa função faz parte do produto, mas não pode desviar a correção do motor. Implemente-a somente depois que os gates principais de geração e timeline passarem, ou prepare interfaces sem ativar comportamento incompleto.

### Comportamento desejado

- **Conectar**: solicitar permissão MIDI, listar entradas/saídas disponíveis e permitir seleção explícita.
- **Enviar/Tocar**: transmitir a faixa selecionada usando a timeline canônica, com Note On/Off, velocity, canal, tempo e transporte corretos.
- Permitir roteamento por faixa para dispositivos/canais diferentes.
- Permitir associação de melodia a piano, harmony a synth, bass a módulo de baixo e drums a drum machine.
- Usar nome/fabricante/perfil do dispositivo apenas como sugestão.
- Não presumir que MIDI sempre informa que o dispositivo é um piano.
- Quando o tipo não puder ser identificado, pedir seleção do usuário.
- Prever program change somente quando compatível e autorizado.
- Implementar panic/all-notes-off e limpeza ao desconectar/parar.
- Não deixar notas presas.
- Não criar uma timeline paralela para MIDI ao vivo.

### Arquitetura de integração

Crie ou preserve uma interface de saída equivalente a:

```text
CanonicalTimeline
→ PlaybackTarget
   ├─ WebAudioTarget
   ├─ MidiFileTarget
   ├─ WavRenderTarget
   └─ LiveMidiTarget
```

Adapte ao projeto existente. Não force esses nomes se já houver abstrações melhores.

---

## 13. Proibições

Não faça nenhuma destas ações:

- concluir que não há problema olhando apenas um commit de UI;
- reescrever o projeto do zero;
- substituir TypeScript/Next.js por outra stack;
- remover presets, CSS ou componentes aprovados sem prova;
- criar segunda timeline para exportação;
- usar `Math.random()` na geração musical;
- esconder falhas com fallback fixo;
- consertar repetição apenas aumentando randomness;
- alterar timbre e chamar isso de variação musical;
- gerar seções isoladas sem memória global;
- hardcodar kicks dentro do bass engine;
- duplicar eventos para aumentar volume;
- normalizar IDs/timestamps e confundir isso com novidade;
- declarar sucesso sem executar testes;
- modificar dezenas de arquivos antes de provar a causa;
- fazer push/deploy sem autorização;
- apagar mudanças locais do usuário;
- adicionar dependência pesada sem justificar custo, bundle e manutenção.

---

## 14. Formato obrigatório da resposta final

Entregue o relatório nesta ordem:

### A. Resumo executivo

- O que realmente estava quebrado.
- Qual era a causa raiz.
- O que foi corrigido.
- O que ainda permanece.

### B. Mapa do fluxo real

Inclua arquivos, símbolos e conexões efetivamente encontrados.

### C. Evidências

Para cada problema:

| Problema | Evidência | Causa raiz | Arquivos | Teste de regressão |
|---|---|---|---|---|

### D. Alterações implementadas

Liste arquivo por arquivo e explique a razão. Não cole arquivos inteiros.

### E. Resultados dos testes

| Comando | Resultado | Observações |
|---|---|---|

### F. Métricas antes/depois

Inclua, quando mensurável:

- fingerprints únicos;
- taxa de duplicatas;
- duração por track;
- hashes determinísticos;
- diversidade entre variations;
- alinhamento kick/808;
- latência de geração;
- número de fallbacks/repairs.

### G. Validação auditiva

Forneça seeds/CIDs/configurações da grade A/B e indique o que precisa de decisão humana.

### H. Riscos restantes

Seja específico. Não use “pode haver bugs” como descrição.

### I. Próximo passo mínimo

Informe apenas o próximo passo com maior impacto, caso algo fique pendente.

---

## 15. Comando final

Comece agora pela preservação do baseline e pelo rastreamento completo do fluxo de geração. Não pare em análise de UI. Não aplique uma arquitetura imaginada apenas porque este documento a descreve: confronte cada hipótese com o código real.

Depois de provar as causas, implemente os patches mínimos necessários, crie os testes, execute a validação ampla e continue até que os critérios de aceite estejam atendidos ou exista um bloqueio técnico objetivo e documentado.

O resultado esperado não é “mais aleatório”. É um compositor procedural determinístico, musicalmente coordenado, capaz de gerar beats completos, diferentes e coerentes, com uma única fonte de verdade para reprodução e exportação.
