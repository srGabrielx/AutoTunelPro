# Decisões Técnicas & Arquitetura — AutoTunel PRO

## 1. Execução 100% Local vs Servidores na Nuvem
- **Decisão:** A DAW (`BeatStudio`) e os motores de geração e síntese de áudio rodam **100% no hardware do usuário** (Desktop via Tauri/Rust ou Celular via PWA/APK).
- **Justificativa:** Elimina latência de rede (0ms), zera custos de infraestrutura de servidores com GPU/CPU pesada e garante 100% de privacidade para as composições dos produtores.
- **Função da Web:** O site público atua como Landing Page de demonstração interativa e Hub de Downloads diretos (.exe, .dmg, .AppImage, .apk).

## 2. Geração Procedural Determinística com Single Source of Truth
- **Decisão:** Unificar a geração de eventos rítmicos e melódicos em planos puros (`buildGrooveEventPlan` e `buildCanonicalTimeline`).
- **Justificativa:** Garante equivalência perceptual exata entre o playback do Web Audio no navegador e a renderização do áudio WAV exportado no Web Worker.

## 3. Calibração Harmônica & Temperatura (Harmonic Temperature)
- **Decisão:** Integrar o conceito de `harmonicTemperature` ($0.1 \rightarrow 1.0$) derivado da complexidade musical.
- **Justificativa:** Em temperaturas baixas, notas em tempos fortes cravam estritamente em notas do acorde (Fundamental, 3ª, 5ª). Em temperaturas mais altas, extensões modais (7ª, 9ª, notas de passagem) são liberadas mantendo coerência tonal.

## 4. Engenharia de Áudio & Isolamento de Barramentos
- **Sidechain Ducking:** Nó de ganho dedicado (`Sidechain GainNode`) separado do volume da faixa, atenuando o 808 em 10 dB no ataque do Kick para eliminar embolamento em subwoofers.
- **Isolamento Espectral:** Filtros passa-alta cortando frequências inferiores a 120 Hz em melodias e 250 Hz em reverberação para manter a faixa de 33-55 Hz limpa.
- **Limiter de Pico:** Teto calibrado em -1.0 dBFS no master para prevenir inter-sample peaks em conversores DAC.

## 5. Camada Minimalista de Perfil Offline
- **Decisão:** Persistência de configurações e preferências de produção no `localStorage` do dispositivo.
- **Justificativa:** Permite ao produtor salvar sua DAW padrão, afinação favorita e nome de produtor sem requisições desnecessárias a banco de dados.
