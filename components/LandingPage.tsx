"use client";

import React, { useState, useRef, useEffect } from "react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"desktop" | "mobile">("desktop");
  const [playingGenre, setPlayingGenre] = useState<string | null>(null);
  const [detectedOS, setDetectedOS] = useState<"windows" | "mac" | "linux" | "mobile">("windows");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNodesRef = useRef<{ stop: () => void }[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod|android/.test(userAgent)) {
        setDetectedOS("mobile");
      } else if (/macintosh|mac os x/.test(userAgent)) {
        setDetectedOS("mac");
      } else if (/linux/.test(userAgent)) {
        setDetectedOS("linux");
      } else {
        setDetectedOS("windows");
      }
    }
  }, []);

  const genres = [
    {
      id: "trap-br",
      title: "Trap Brasileiro",
      bpm: "140 BPM",
      scale: "C Menor Natural",
      desc: "Subgraves 808 pesados e afinados na tônica, hi-hat rolls em 1/32 e ambiência rica de Pads harmônicos.",
      accent: "#06b6d4",
      bgGlow: "rgba(6, 182, 212, 0.15)",
      notes: [60, 63, 67, 70, 72, 67, 63, 60],
      bassFreq: 48,
    },
    {
      id: "trap-usa",
      title: "Trap USA / Dark",
      bpm: "130 BPM",
      scale: "F# Menor Harmônica",
      desc: "Progressões sombrias com Leads expressivos, caixa punchy, 7ª maior e slides agressivos de 808.",
      accent: "#a855f7",
      bgGlow: "rgba(168, 85, 247, 0.15)",
      notes: [66, 69, 73, 77, 73, 69, 66, 65],
      bassFreq: 46,
    },
    {
      id: "uk-drill",
      title: "UK / NY Drill",
      bpm: "142 BPM",
      scale: "A Menor",
      desc: "Hi-hats sincopados em tercinas, slides de 808 em oitavas altas e clima tenso cinematográfico.",
      accent: "#38bdf8",
      bgGlow: "rgba(56, 189, 248, 0.15)",
      notes: [69, 72, 76, 79, 76, 72, 69, 71],
      bassFreq: 55,
    },
    {
      id: "boom-bap",
      title: "Boom Bap / Hip-Hop",
      bpm: "90 BPM",
      scale: "E Menor Dórico",
      desc: "Bateria orgânica com microtiming humanizado, linha de baixo melódica e acordes quentes com 7ª.",
      accent: "#f59e0b",
      bgGlow: "rgba(245, 158, 11, 0.15)",
      notes: [64, 67, 71, 74, 71, 67, 64, 62],
      bassFreq: 60,
    },
  ];

  const stopAudioPreview = () => {
    activeNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch {}
    });
    activeNodesRef.current = [];
    setPlayingGenre(null);
  };

  const playGenrePreview = (genreId: string) => {
    if (playingGenre === genreId) {
      stopAudioPreview();
      return;
    }

    stopAudioPreview();

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const selected = genres.find((g) => g.id === genreId);
      if (!selected) return;

      setPlayingGenre(genreId);
      const now = ctx.currentTime;
      const bpm = parseInt(selected.bpm) || 130;
      const stepDuration = 60 / bpm / 4;
      const totalSteps = 32;

      // Master Gain
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.35, now);
      master.connect(ctx.destination);

      // Play 808 Sub-Bass
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(selected.bassFreq, now);

      // Bass envelope
      bassGain.gain.setValueAtTime(0.001, now);
      for (let bar = 0; bar < 2; bar++) {
        const barStart = now + bar * 16 * stepDuration;
        bassGain.gain.setValueAtTime(0.7, barStart);
        bassGain.gain.exponentialRampToValueAtTime(0.2, barStart + 6 * stepDuration);
        bassGain.gain.setValueAtTime(0.6, barStart + 8 * stepDuration);
        bassGain.gain.exponentialRampToValueAtTime(0.001, barStart + 15 * stepDuration);
      }
      bassOsc.connect(bassGain);
      bassGain.connect(master);
      bassOsc.start(now);
      bassOsc.stop(now + totalSteps * stepDuration);
      activeNodesRef.current.push(bassOsc);

      // Play Drums (Kick & Snare pulses)
      for (let s = 0; s < totalSteps; s++) {
        const time = now + s * stepDuration;
        // Kick on 0, 8, 14
        if (s % 16 === 0 || s % 16 === 8 || s % 16 === 14) {
          const kickOsc = ctx.createOscillator();
          const kickGain = ctx.createGain();
          kickOsc.frequency.setValueAtTime(140, time);
          kickOsc.frequency.exponentialRampToValueAtTime(45, time + 0.08);
          kickGain.gain.setValueAtTime(0.8, time);
          kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
          kickOsc.connect(kickGain);
          kickGain.connect(master);
          kickOsc.start(time);
          kickOsc.stop(time + 0.14);
          activeNodesRef.current.push(kickOsc);
        }
        // Snare/Clap on 4, 12
        if (s % 16 === 4 || s % 16 === 12) {
          const noiseOsc = ctx.createOscillator();
          const noiseGain = ctx.createGain();
          noiseOsc.type = "triangle";
          noiseOsc.frequency.setValueAtTime(220, time);
          noiseGain.gain.setValueAtTime(0.5, time);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          noiseOsc.connect(noiseGain);
          noiseGain.connect(master);
          noiseOsc.start(time);
          noiseOsc.stop(time + 0.12);
          activeNodesRef.current.push(noiseOsc);
        }
        // Hi-Hats on even steps + rolls
        if (s % 2 === 0 || (s >= 12 && s < 16)) {
          const hatOsc = ctx.createOscillator();
          const hatGain = ctx.createGain();
          hatOsc.type = "square";
          hatOsc.frequency.setValueAtTime(8000, time);
          hatGain.gain.setValueAtTime(0.08, time);
          hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
          hatOsc.connect(hatGain);
          hatGain.connect(master);
          hatOsc.start(time);
          hatOsc.stop(time + 0.04);
          activeNodesRef.current.push(hatOsc);
        }
      }

      // Play Melodic Line
      selected.notes.forEach((midi, idx) => {
        const time = now + idx * 4 * stepDuration;
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const melOsc = ctx.createOscillator();
        const melGain = ctx.createGain();
        melOsc.type = "sawtooth";
        melOsc.frequency.setValueAtTime(freq, time);
        melGain.gain.setValueAtTime(0.001, time);
        melGain.gain.linearRampToValueAtTime(0.22, time + 0.02);
        melGain.gain.exponentialRampToValueAtTime(0.001, time + 3.8 * stepDuration);
        melOsc.connect(melGain);
        melGain.connect(master);
        melOsc.start(time);
        melOsc.stop(time + 4 * stepDuration);
        activeNodesRef.current.push(melOsc);
      });

      // Auto stop after sample completes
      setTimeout(() => {
        setPlayingGenre((current) => (current === genreId ? null : current));
      }, totalSteps * stepDuration * 1000);
    } catch {
      setPlayingGenre(null);
    }
  };

  const handlePwaInstall = () => {
    if (typeof window !== "undefined" && window.deferredPWAInstallPrompt) {
      window.deferredPWAInstallPrompt.prompt().then(() => {
        window.deferredPWAInstallPrompt = undefined;
      });
    } else {
      alert("Para instalar no celular: toque no menu do seu navegador (três pontinhos no Chrome ou botão de compartilhar no Safari) e selecione 'Adicionar à tela inicial'!");
    }
  };

  const scrollToDesktop = () => {
    setActiveTab("desktop");
    const el = document.getElementById("downloads");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMobile = () => {
    setActiveTab("mobile");
    const el = document.getElementById("downloads");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-wrapper">
      {/* BACKGROUND GLOWS */}
      <div className="landing-glow landing-glow-top" />
      <div className="landing-glow landing-glow-center" />

      {/* HEADER / NAVBAR */}
      <header className="landing-header">
        <div className="landing-container landing-nav-inner">
          <a href="/" className="landing-logo">
            <span className="landing-logo-icon">🎛️</span>
            <span className="landing-logo-text">
              AutoTunel<span className="landing-logo-badge">PRO</span>
            </span>
          </a>

          <nav className="landing-nav-links">
            <a href="#demonstracao">Ouvir Prévias</a>
            <a href="#recursos">Recursos</a>
            <a href="#downloads">Downloads</a>
            <a href="#comparativo">Comparativo</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="landing-nav-actions">
            <a href="#downloads" className="btn-landing-primary">
              Baixar App Grátis 📥
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="landing-hero">
        <div className="landing-container text-center">
          <div className="landing-badge-pill">
            <span className="badge-dot" />
            Processamento 100% Local no seu Computador e Celular • 0ms de Latência
          </div>

          <h1 className="landing-hero-title">
            Produza Beats e Melodias Perfeitas{" "}
            <span className="gradient-text">Direto no seu Hardware</span>
          </h1>

          <p className="landing-hero-subtitle">
            A primeira DAW procedural inteligente desenvolvida para rodar <strong>100% offline</strong> no seu computador e celular.
            Sem assinaturas caras, sem atrasos na nuvem e com exportação multitrack <strong>MIDI</strong> e <strong>WAV 24-bit</strong> direto para sua DAW favorita.
          </p>

          {/* PRIMARY HERO CTAS */}
          <div className="landing-hero-ctas">
            <button onClick={scrollToDesktop} className="btn-hero-download">
              <span className="btn-icon">💻</span>
              <div className="btn-text-group">
                <span className="btn-main-text">
                  Baixar para {detectedOS === "mac" ? "macOS (.dmg)" : detectedOS === "linux" ? "Linux (.AppImage)" : "Windows (.exe)"}
                </span>
                <span className="btn-sub-text">Versão 1.0.0 Pro • ~14 MB • Instalação Rápida</span>
              </div>
            </button>

            <button onClick={scrollToMobile} className="btn-hero-studio">
              <span className="btn-icon">📱</span>
              <div className="btn-text-group">
                <span className="btn-main-text">Instalar no Celular</span>
                <span className="btn-sub-text">Android & iPhone • PWA / APK Offline</span>
              </div>
            </button>
          </div>

          {/* TRUST BADGES BAR */}
          <div className="trust-badges-bar">
            <div className="trust-badge-item">
              <span className="trust-icon">🛡️</span>
              <span>100% Livre de Vírus</span>
            </div>
            <div className="trust-badge-item">
              <span className="trust-icon">⚡</span>
              <span>Inicializa em &lt; 1 segundo</span>
            </div>
            <div className="trust-badge-item">
              <span className="trust-icon">🔒</span>
              <span>100% Privado &amp; Offline</span>
            </div>
            <div className="trust-badge-item">
              <span className="trust-icon">🎹</span>
              <span>Compatível com FL Studio, Ableton &amp; Logic</span>
            </div>
          </div>

          {/* PLATFORM PILLS */}
          <div className="landing-platforms">
            <span className={`platform-tag ${detectedOS === "windows" ? "platform-highlight" : ""}`}>
              🪟 Windows 10/11 (.exe)
            </span>
            <span className={`platform-tag ${detectedOS === "mac" ? "platform-highlight" : ""}`}>
              🍏 macOS Universal (.dmg)
            </span>
            <span className={`platform-tag ${detectedOS === "linux" ? "platform-highlight" : ""}`}>
              🐧 Linux Portable (.AppImage)
            </span>
            <span className={`platform-tag ${detectedOS === "mobile" ? "platform-highlight" : ""}`}>
              📱 Android APK &amp; iOS PWA
            </span>
          </div>

          {/* STUDIO PREVIEW HERO CARD */}
          <div className="landing-hero-preview">
            <div className="preview-header">
              <div className="preview-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <span className="preview-title">AutoTunel Studio — DAW Procedural de Alta Performance</span>
              <span className="preview-status">🟢 Execução 100% Local</span>
            </div>
            <div className="preview-content">
              <div className="preview-grid">
                <div className="preview-track">
                  <div className="track-header-mini">
                    <div className="track-tag track-lead">🎹 LEAD</div>
                    <span className="track-vol">VOL 95%</span>
                  </div>
                  <div className="track-waveform wave-lead" />
                  <div className="track-status">Harmonia Estrita • F# Menor • 7th Voicing</div>
                </div>
                <div className="preview-track">
                  <div className="track-header-mini">
                    <div className="track-tag track-pad">🌌 PAD</div>
                    <span className="track-vol">VOL 85%</span>
                  </div>
                  <div className="track-waveform wave-pad" />
                  <div className="track-status">Warm Chords • i - VI - III - VII</div>
                </div>
                <div className="preview-track">
                  <div className="track-header-mini">
                    <div className="track-tag track-drums">🥁 DRUMS</div>
                    <span className="track-vol">VOL 100%</span>
                  </div>
                  <div className="track-waveform wave-drums" />
                  <div className="track-status">Hi-Hat Rolls 1/32 • Snare Snap • Microtiming</div>
                </div>
                <div className="preview-track">
                  <div className="track-header-mini">
                    <div className="track-tag track-bass">🔊 808 SUB</div>
                    <span className="track-vol">VOL 100%</span>
                  </div>
                  <div className="track-waveform wave-bass" />
                  <div className="track-status">Subgrave em 45Hz • Sidechain Ducking Ativo</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIO SHOWCASE / DEMONSTRAÇÃO INTERATIVA */}
      <section id="demonstracao" className="landing-section">
        <div className="landing-container">
          <div className="section-header text-center">
            <div className="landing-badge-pill">Demonstração Interativa</div>
            <h2 className="section-title">Ouça a Qualidade Gerada Pelo Motor</h2>
            <p className="section-subtitle">
              Clique para ouvir prévias geradas em tempo real com afinação harmônica e síntese analógica.
            </p>
          </div>

          <div className="genre-cards-grid">
            {genres.map((genre) => {
              const isPlaying = playingGenre === genre.id;
              return (
                <div
                  key={genre.id}
                  className={`genre-card ${isPlaying ? "genre-card-playing" : ""}`}
                  style={{
                    borderColor: isPlaying ? genre.accent : undefined,
                    boxShadow: isPlaying ? `0 8px 30px ${genre.bgGlow}` : undefined,
                  }}
                >
                  <div className="genre-card-header">
                    <div className="genre-title-box">
                      <h3 className="genre-name">{genre.title}</h3>
                      <div className="genre-meta">
                        <span className="meta-badge">{genre.bpm}</span>
                        <span className="meta-badge">{genre.scale}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => playGenrePreview(genre.id)}
                      className={`genre-play-btn ${isPlaying ? "playing" : ""}`}
                      style={{ background: isPlaying ? "#ef4444" : undefined }}
                      title={isPlaying ? "Parar prévia" : `Ouvir ${genre.title}`}
                    >
                      {isPlaying ? "⏹" : "▶"}
                    </button>
                  </div>

                  <p className="genre-desc">{genre.desc}</p>

                  {/* MINI EQ VISUALIZER */}
                  <div className={`genre-eq-bars ${isPlaying ? "active" : ""}`}>
                    <span className="eq-bar eq-1" />
                    <span className="eq-bar eq-2" />
                    <span className="eq-bar eq-3" />
                    <span className="eq-bar eq-4" />
                    <span className="eq-bar eq-5" />
                    <span className="eq-bar eq-6" />
                    <span className="eq-bar eq-7" />
                    <span className="eq-bar eq-8" />
                  </div>

                  <div className="genre-footer">
                    <button onClick={scrollToDesktop} className="genre-download-hint">
                      {isPlaying ? "Tocando prévia... Baixar App ↓" : "Disponível no App Instalado →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RECURSOS / FEATURES */}
      <section id="recursos" className="landing-section bg-surface-alt">
        <div className="landing-container">
          <div className="section-header text-center">
            <h2 className="section-title">Por Que o AutoTunel Supera Plugins Antigos?</h2>
            <p className="section-subtitle">
              Projetado para produtores, beatmakers e compositores que precisam de velocidade sem abrir mão da qualidade.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔊</div>
              <h3 className="feature-title">808 Sub-Bass Sempre no Tom</h3>
              <p className="feature-text">
                O motor converte graus harmônicos diretamente na escala da música, garantindo que o subgrave (33-50 MIDI) nunca desafine e converse perfeitamente com a tônica e o kick.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🥁</div>
              <h3 className="feature-title">Hi-Hat Rolls &amp; Grooves Humanizados</h3>
              <p className="feature-text">
                Subdivisões expressivas de $1/32$, tercinas e microtiming orgânico ($\pm 15$ms) para ritmos vivos que não soam como loops estáticos e repetitivos.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎹</div>
              <h3 className="feature-title">4 Camadas Melódicas Independentes</h3>
              <p className="feature-text">
                Timbragem diferenciada para <strong>Pads</strong> (acordes ricos), <strong>Arps</strong> (arpejos em semicolcheias), <strong>Plucks</strong> (sinos sincopados) e <strong>Leads</strong> principais com condução de vozes.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📦</div>
              <h3 className="feature-title">Exportação MIDI &amp; WAV 24-bit</h3>
              <p className="feature-text">
                Exporte trilhas separadas em MIDI e áudio WAV masterizado com 1 clique. Arraste e solte direto no FL Studio, Ableton Live, Logic Pro ou Reaper.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3 className="feature-title">100% Local, Privado &amp; Seguro</h3>
              <p className="feature-text">
                Todo o processamento acontece no seu hardware. Suas ideias, arranjos e composições nunca saem do seu computador nem passam por servidores externos.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Super Leve (Menos de 15 MB)</h3>
              <p className="feature-text">
                Construído em Rust (Tauri) de última geração. Inicializa em menos de 1 segundo e não consome gigabytes de memória nem de armazenamento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DOWNLOADS HUB SECTION */}
      <section id="downloads" className="landing-section">
        <div className="landing-container">
          <div className="section-header text-center">
            <div className="landing-badge-pill">Central de Downloads</div>
            <h2 className="section-title">Baixe o AutoTunel para Seu Dispositivo</h2>
            <p className="section-subtitle">
              Escolha seu sistema operacional abaixo para instalar e começar a produzir beats offline.
            </p>
          </div>

          {/* DOWNLOAD TABS */}
          <div className="download-tabs-nav">
            <button
              className={`download-tab-btn ${activeTab === "desktop" ? "active" : ""}`}
              onClick={() => setActiveTab("desktop")}
            >
              💻 Computador (Windows / macOS / Linux)
            </button>
            <button
              className={`download-tab-btn ${activeTab === "mobile" ? "active" : ""}`}
              onClick={() => setActiveTab("mobile")}
            >
              📱 Celular (Android APK / PWA)
            </button>
          </div>

          <div className="download-tabs-content">
            {activeTab === "desktop" && (
              <div className="download-cards-grid">
                {/* WINDOWS */}
                <div className={`download-card ${detectedOS === "windows" ? "recommended-card" : ""}`}>
                  {detectedOS === "windows" && <div className="card-badge">SEU SISTEMA DETECTADO</div>}
                  <div className="download-card-icon">🪟</div>
                  <h3 className="download-card-title">Windows</h3>
                  <p className="download-card-desc">Windows 10 / 11 (64-bit)</p>
                  <ul className="download-features-list">
                    <li>✓ Instalador nativo (.exe) ultraleve</li>
                    <li>✓ Baixo consumo de RAM e processador</li>
                    <li>✓ Exportação direta para pastas locais</li>
                    <li>✓ Suporte a drivers ASIO / DirectSound</li>
                  </ul>
                  <a href="/downloads/AutoTunel-Setup.exe" className="btn-download-action">
                    <span>Baixar para Windows (.exe)</span>
                    <span className="btn-arrow">↓</span>
                  </a>
                  <span className="download-meta">Versão 1.0.0 Pro • ~14.2 MB • 64-bit</span>
                </div>

                {/* MACOS */}
                <div className={`download-card ${detectedOS === "mac" ? "recommended-card" : ""}`}>
                  {detectedOS === "mac" && <div className="card-badge">SEU SISTEMA DETECTADO</div>}
                  <div className="download-card-icon">🍏</div>
                  <h3 className="download-card-title">macOS</h3>
                  <p className="download-card-desc">Apple Silicon (M1/M2/M3/M4) &amp; Intel</p>
                  <ul className="download-features-list">
                    <li>✓ Pacote Universal DMG (ARM64 &amp; x64)</li>
                    <li>✓ Otimizado para Metal &amp; CoreAudio</li>
                    <li>✓ Latência ultrabaixa em 96kHz</li>
                    <li>✓ Integração perfeita com Logic e Ableton</li>
                  </ul>
                  <a href="/downloads/AutoTunel.dmg" className="btn-download-action">
                    <span>Baixar para macOS (.dmg)</span>
                    <span className="btn-arrow">↓</span>
                  </a>
                  <span className="download-meta">Versão 1.0.0 Pro • ~16.8 MB • Universal</span>
                </div>

                {/* LINUX */}
                <div className={`download-card ${detectedOS === "linux" ? "recommended-card" : ""}`}>
                  {detectedOS === "linux" && <div className="card-badge">SEU SISTEMA DETECTADO</div>}
                  <div className="download-card-icon">🐧</div>
                  <h3 className="download-card-title">Linux</h3>
                  <p className="download-card-desc">Ubuntu, Debian, Fedora, Arch, Pop!_OS</p>
                  <ul className="download-features-list">
                    <li>✓ Pacote portátil AppImage &amp; .deb</li>
                    <li>✓ Suporte nativo a PipeWire &amp; PulseAudio</li>
                    <li>✓ 100% Livre de dependências pesadas</li>
                    <li>✓ Execução instantânea sem instalação</li>
                  </ul>
                  <a href="/downloads/AutoTunel.AppImage" className="btn-download-action">
                    <span>Baixar para Linux (.AppImage)</span>
                    <span className="btn-arrow">↓</span>
                  </a>
                  <span className="download-meta">Versão 1.0.0 Pro • ~15.1 MB • x86_64</span>
                </div>
              </div>
            )}

            {activeTab === "mobile" && (
              <div className="download-mobile-box">
                <div className="mobile-pwa-banner">
                  <div className="pwa-icon">📱</div>
                  <div className="pwa-text">
                    <h3>Instale no Celular com 1 Toque</h3>
                    <p>
                      O AutoTunel conta com tecnologia <strong>PWA (Progressive Web App)</strong> e aplicativo <strong>APK</strong>. Você pode instalar o app direto na tela inicial do seu celular e usá-lo 100% offline.
                    </p>
                    <div className="pwa-actions">
                      <button onClick={handlePwaInstall} className="btn-install-pwa">
                        📲 Adicionar à Tela Inicial
                      </button>
                      <a href="/downloads/AutoTunel.apk" className="btn-download-apk">
                        Baixar APK Android (.apk)
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mobile-steps-grid">
                  <div className="step-item">
                    <span className="step-num">1</span>
                    <strong>No Android (Chrome):</strong>
                    <p>Toque no botão "Adicionar à Tela Inicial" acima ou abra o menu do Chrome (3 pontinhos) e selecione "Instalar aplicativo".</p>
                  </div>
                  <div className="step-item">
                    <span className="step-num">2</span>
                    <strong>No iPhone (Safari):</strong>
                    <p>Toque no botão Compartilhar (quadrado com seta para cima) na barra inferior e toque em "Adicionar à Tela de Início".</p>
                  </div>
                  <div className="step-item">
                    <span className="step-num">3</span>
                    <strong>Pronto para Criar:</strong>
                    <p>O ícone do AutoTunel abrirá em tela cheia como um app nativo, funcionando instantaneamente offline.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section id="comparativo" className="landing-section bg-surface-alt">
        <div className="landing-container">
          <div className="section-header text-center">
            <h2 className="section-title">Por Que o AutoTunel Pro é Diferente?</h2>
            <p className="section-subtitle">Veja a comparação real com serviços em nuvem e plugins pesados tradicionais.</p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Recursos &amp; Vantagens</th>
                  <th className="highlight-col">AutoTunel Pro (Local)</th>
                  <th>Sites de IA em Nuvem</th>
                  <th>Plugins VST Antigos</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Execução 100% Local &amp; Offline</strong></td>
                  <td className="highlight-col">✅ Sim (roda no seu processador)</td>
                  <td>❌ Requer internet constante</td>
                  <td>✅ Sim</td>
                </tr>
                <tr>
                  <td><strong>Latência de Resposta</strong></td>
                  <td className="highlight-col">⚡ 0ms (Tempo Real Instantâneo)</td>
                  <td>⏳ 30-90s (filas em servidores)</td>
                  <td>⚡ Rápida</td>
                </tr>
                <tr>
                  <td><strong>Afinação de 808 por Escala</strong></td>
                  <td className="highlight-col">✅ Afinação precisa por grau musical</td>
                  <td>⚠️ Imprevisível</td>
                  <td>❌ Ajuste manual</td>
                </tr>
                <tr>
                  <td><strong>Exportação MIDI Multitrack</strong></td>
                  <td className="highlight-col">✅ Ilimitada (canais separados)</td>
                  <td>⚠️ Cobrada por download</td>
                  <td>✅ Sim</td>
                </tr>
                <tr>
                  <td><strong>Tamanho do Instalador</strong></td>
                  <td className="highlight-col">🚀 Apenas ~14 MB (Tauri Rust)</td>
                  <td>⚠️ Pesado no browser</td>
                  <td>❌ 5 a 20 GB de samples</td>
                </tr>
                <tr>
                  <td><strong>Privacidade Total das Composições</strong></td>
                  <td className="highlight-col">✅ 100% Privado (nada sai da sua máquina)</td>
                  <td>❌ Armazenado em servidores</td>
                  <td>✅ Privado</td>
                </tr>
                <tr>
                  <td><strong>Direitos Comerciais (Spotify / YouTube)</strong></td>
                  <td className="highlight-col">✅ 100% Royalty Free</td>
                  <td>⚠️ Termos restritivos</td>
                  <td>✅ Royalty Free</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="landing-section">
        <div className="landing-container">
          <div className="section-header text-center">
            <h2 className="section-title">Perguntas Frequentes</h2>
            <p className="section-subtitle">Tire suas dúvidas antes de baixar o AutoTunel.</p>
          </div>

          <div className="faq-grid">
            <div className="faq-item">
              <h4 className="faq-question">O AutoTunel precisa de internet para funcionar?</h4>
              <p className="faq-answer">
                Não! Após baixar e instalar o aplicativo, todo o motor procedural, síntese de subgraves e baterias funcionam 100% offline direto no processador da sua máquina.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Posso usar as batidas comercialmente e monetizar?</h4>
              <p className="faq-answer">
                Sim! Todas as melodias, baterias e arquivos MIDI/WAV gerados são 100% seus e Royalty Free para lançamentos no Spotify, YouTube, Beatstars e qualquer plataforma.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Como levo o som gerado para a minha DAW favorita?</h4>
              <p className="faq-answer">
                Basta clicar em <strong>Exportar MIDI Stems (.zip)</strong> ou <strong>Exportar WAV (.wav)</strong> no aplicativo e arrastar os arquivos diretamente para as pistas do FL Studio, Ableton Live, Logic Pro, Reaper ou Pro Tools.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Qual a configuração mínima necessária para rodar?</h4>
              <p className="faq-answer">
                Como o AutoTunel foi programado de forma ultra-otimizada com Rust e WebAssembly, ele roda com extrema fluidez em qualquer computador Windows (7/10/11), Mac ou Linux com pelo menos 2 GB de RAM.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FOOTER BANNER */}
      <section className="landing-cta-banner">
        <div className="landing-container text-center">
          <h2 className="cta-banner-title">Pronto para Criar Seus Melhores Beats?</h2>
          <p className="cta-banner-subtitle">
            Baixe o AutoTunel Pro agora mesmo e tenha um motor de composição com 0ms de latência no seu hardware.
          </p>
          <div className="cta-banner-actions">
            <button onClick={scrollToDesktop} className="btn-banner-studio">
              Baixar para Computador (Windows / Mac) 💻
            </button>
            <button onClick={scrollToMobile} className="btn-banner-download">
              Instalar no Celular (Android / iOS) 📱
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">🎛️ AutoTunel Pro</span>
            <p className="footer-text">DAW Procedural de Áudio com Execução 100% Local no seu Dispositivo.</p>
          </div>
          <div className="footer-links">
            <a href="#demonstracao">Demonstração</a>
            <a href="#downloads">Downloads</a>
            <a href="#recursos">Recursos</a>
            <a href="#comparativo">Comparativo</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-copy">
            &copy; {new Date().getFullYear()} AutoTunel Studio. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
