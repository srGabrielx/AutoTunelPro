# Roadmap do AutoTunel PRO

## Fase 1 — Concluída (Fundação & Motores Base)
- Três motores procedurais independentes (Melodia, 808 Sub-Bass e Baterias).
- 6 Gêneros musicais calibrados (Trap BR, Trap USA, UK Drill, Boom Bap, Funk e Amapiano).
- Seeds determinísticas reproduzíveis e isolamento de estado por camada.
- Interface escura responsiva (DAW BeatStudio e Landing Page).

## Fase 2 — Concluída (Fidelidade DSP, Mixagem & Exportação)
- Exportação multitrack MIDI real (.zip com tracks separadas).
- Renderização offline de áudio WAV 24-bit PCM via Web Worker dedicado.
- SampleAccurateAudioEngine com agendamento lookahead e 0ms de drift.
- Sidechain ducking automático (Kick → 808) e saturação harmônica paralela.
- 16 Artist Presets com perfis harmônicos e de ritmo customizados.
- Camada minimalista de perfil de usuário com persistência offline (`localStorage`).
- Landing Page com demonstração interativa alimentada pelos motores procedurais reais.
- Suíte completa de 98 testes automatizados (unitários, forenses e de integração).

## Fase 3 — Em Desenvolvimento / Próximos Passos
- Integração de modelos de IA / Machine Learning locais via ONNX/WebAssembly.
- Suporte a plugins VST/CLAP no aplicativo Desktop nativo (Rust/Tauri).
- Pack de micro-samples analógicos embutidos de alta resolução.
- Histórico de versões e snapshot de composições com tags na nuvem.
