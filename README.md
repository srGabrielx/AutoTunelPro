# AutoTunel PRO — DAW Procedural de Áudio & Hub de Downloads

O **AutoTunel PRO** é uma estação de trabalho de áudio digital (DAW) procedural de alta performance desenvolvida para rodar **100% offline no hardware do usuário** (Desktop Windows/Mac/Linux e Celular via PWA/APK), acompanhada por uma **Landing Page de Alta Conversão** com prévias sintetizadas em tempo real.

---

## 🚀 Principais Recursos

- **3 Motores Procedurais Independentes:**
  - **Melodia (Lead, Pad, Pluck, Arp):** Condução de vozes, tétrades harmônicas, arpejos sincopados e afinação por escala.
  - **808 Sub-Bass:** Afinação exata pela tônica, slides em oitavas altas, saturação paralela e *sidechain ducking* automático sob o bumbo.
  - **Baterias & Percussão:** Microtiming humanizado ($\pm 15$ms), *rolls* de hi-hat em $1/32$ e tercinas com curvas de velocidade dinâmicas.
- **Arranjos Completos Multi-Seção:** Estrutura dinâmica de Intro, Verso, Drop e Outro com variação determinística.
- **16 Presets de Artistas & 6 Gêneros Musicais:** Trap Brasileiro, Trap USA, UK Drill, Boom Bap, Funk Brasileiro e Amapiano.
- **Mixagem & Masterização DSP Profissional:**
  - Isolamento espectral (High-pass em melodias e reverbs para liberar espaço de sub-bass).
  - True Peak Limiter a -1.0 dBFS para evitar distorção inter-amostras em fones e caixas.
  - Saturação analógica com harmônicos audíveis em celulares e notebooks.
- **Exportação Multitrack de Alta Fidelidade:**
  - Arquivos **MIDI Stems (.zip)** com canais individuais para FL Studio, Ableton Live, Logic Pro e Reaper.
  - Áudio **WAV 24-bit PCM** renderizado offline via Web Worker dedicado sem congelar a interface.
- **Camada de Perfil Minimalista:** Gestão offline de preferências de produção (DAW favorita, BPM inicial, afinação 440Hz/432Hz e nome artístico).
- **Segurança & Invulnerabilidade:** Sanitização rigorosa de tipos, prevenção contra injeção de protótipos e tolerância total a falhas de rede.

---

## 🛠️ Stack Tecnológica

- **Frontend / Framework:** Next.js 15+ (App Router), React 19, TypeScript
- **Motor de Áudio & DSP:** Web Audio API (agendamento *sample-accurate* com lookahead) + WebAssembly / Web Workers
- **Estilos & UI:** Vanilla CSS Modular com design system Dark Glassmorphic, Neon Accents e responsividade completa
- **Testes & Validação:** Suíte de 98 testes unitários, forenses e de integração em Node.js nativo

---

## 💻 Como Rodar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor local
npm run dev

# 3. Executar validação de tipagem
npx tsc --noEmit

# 4. Executar suíte de testes (98 testes automatizados)
npm test
```

---

## 📁 Estrutura do Projeto

```text
app/                     Landing Page, layout global, estilos e rotas de API
components/              Componentes interativos (BeatStudio, LandingPage, UserProfileModal, etc.)
lib/
  ├── audio/             Mixer, VoiceManager e Playback Orchestrator
  ├── core/              Gerenciador de seeds, transações, timeline e contratos
  ├── engines/           Motores procedurais (Melody, Bass, Drums, Validator)
  ├── export/            Renderizador DSP WAV e gerador de arquivos MIDI
  ├── music/             Presets de síntese, estilos, escalas, types e AudioTransport
  └── workers/           Web Workers para isolamento de cálculos e exportação
docs/                    Documentação de decisões técnicas, roadmap e guias
tests/                   Suíte completa de testes automatizados e contratos
```

---

## 🔒 Privacidade & Licença

- **100% Offline & Privado:** Nenhuma composição ou áudio gerado sai do hardware do usuário.
- **100% Royalty Free:** Todas as melodias, baterias e stems exportados têm uso comercial livre para lançamentos no Spotify, YouTube, Beatstars e serviços de streaming.
