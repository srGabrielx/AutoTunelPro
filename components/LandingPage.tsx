"use client";

import React, { useState } from "react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"desktop" | "mobile" | "web">("desktop");
  const [playingGenre, setPlayingGenre] = useState<string | null>(null);

  const genres = [
    {
      id: "trap-br",
      title: "Trap Brasileiro",
      bpm: "140 BPM",
      scale: "C Menor Natural",
      desc: "Subgraves 808 pesados e afinados, hi-hat rolls rápidos e ambiência de Pads melódicos.",
      color: "from-emerald-500/20 to-cyan-500/20",
      border: "border-cyan-500/30",
    },
    {
      id: "trap-usa",
      title: "Trap USA / Dark",
      bpm: "130 BPM",
      scale: "F# Menor Harmônica",
      desc: "Progressões sombrias com Leads expressivos, caixa punchy e slides agressivos de 808.",
      color: "from-purple-500/20 to-indigo-500/20",
      border: "border-purple-500/30",
    },
    {
      id: "uk-drill",
      title: "UK / NY Drill",
      bpm: "142 BPM",
      scale: "A Menor",
      desc: "Hi-hats com tercinas sincopadas, slides de 808 em oitavas altas e clima tenso.",
      color: "from-blue-500/20 to-sky-500/20",
      border: "border-blue-500/30",
    },
    {
      id: "boom-bap",
      title: "Boom Bap / Hip-Hop",
      bpm: "90 BPM",
      scale: "E Menor Dórico",
      desc: "Bateria orgânica com microtiming humanizado, linha de baixo melódica e acordes com 7ª.",
      color: "from-amber-500/20 to-orange-500/20",
      border: "border-amber-500/30",
    },
  ];

  const handlePwaInstall = () => {
    if (typeof window !== "undefined" && window.deferredPWAInstallPrompt) {
      window.deferredPWAInstallPrompt.prompt().then(() => {
        window.deferredPWAInstallPrompt = undefined;
      });
    } else {
      alert("Para instalar no celular: toque no menu do seu navegador (três pontinhos ou botão de compartilhar) e selecione 'Adicionar à tela inicial'!");
    }
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
            <a href="#recursos">Recursos</a>
            <a href="#demonstracao">Demonstração</a>
            <a href="#downloads">Downloads</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="landing-nav-actions">
            <a href="/studio" className="btn-landing-primary">
              Abrir Studio Web ⚡
            </a>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="landing-hero">
        <div className="landing-container text-center">
          <div className="landing-badge-pill">
            <span className="badge-dot" />
            100% Processamento Local & Offline • 0ms de Latência
          </div>

          <h1 className="landing-hero-title">
            Crie Melodias, Baterias e 808s Profissionais{" "}
            <span className="gradient-text">Direto no seu Dispositivo</span>
          </h1>

          <p className="landing-hero-subtitle">
            A primeira DAW procedural inteligente projetada para rodar localmente no seu computador e celular.
            Sem assinaturas pesadas, sem fila na nuvem, com exportação instantânea em <strong>MIDI multitrack</strong> e <strong>WAV 24-bit</strong>.
          </p>

          <div className="landing-hero-ctas">
            <a href="#downloads" className="btn-hero-download">
              <span className="btn-icon">📥</span>
              <div className="btn-text-group">
                <span className="btn-main-text">Baixar App Grátis</span>
                <span className="btn-sub-text">Windows • Mac • Celular</span>
              </div>
            </a>

            <a href="/studio" className="btn-hero-studio">
              <span className="btn-icon">🚀</span>
              <div className="btn-text-group">
                <span className="btn-main-text">Testar no Navegador</span>
                <span className="btn-sub-text">Sem instalação imediata</span>
              </div>
            </a>
          </div>

          {/* PLATFORM PILLS */}
          <div className="landing-platforms">
            <span className="platform-tag">🪟 Windows 10/11</span>
            <span className="platform-tag">🍏 macOS (M1/M2/M3 & Intel)</span>
            <span className="platform-tag">🐧 Linux</span>
            <span className="platform-tag">📱 Android APK / PWA</span>
            <span className="platform-tag">🍎 iOS Standalone</span>
          </div>

          {/* STUDIO PREVIEW HERO CARD */}
          <div className="landing-hero-preview">
            <div className="preview-header">
              <div className="preview-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <span className="preview-title">AutoTunel Studio — Engine Melódico & DAW Local</span>
              <span className="preview-status">🟢 Motor 100% Offline Ativo</span>
            </div>
            <div className="preview-content">
              <div className="preview-grid">
                <div className="preview-track">
                  <div className="track-tag track-lead">🎹 LEAD</div>
                  <div className="track-waveform wave-lead" />
                  <div className="track-status">Voice Leading • F# Menor</div>
                </div>
                <div className="preview-track">
                  <div className="track-tag track-pad">🌌 PAD</div>
                  <div className="track-waveform wave-pad" />
                  <div className="track-status">Acordes Sustentados • i - VI - III - VII</div>
                </div>
                <div className="preview-track">
                  <div className="track-tag track-drums">🥁 DRUMS</div>
                  <div className="track-waveform wave-drums" />
                  <div className="track-status">Hi-Hat Rolls 1/32 • Snare Snap</div>
                </div>
                <div className="preview-track">
                  <div className="track-tag track-bass">🔊 808 SUB</div>
                  <div className="track-waveform wave-bass" />
                  <div className="track-status">Afinado em C1 • Sidechain Ducking</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIO SHOWCASE / DEMONSTRAÇÃO */}
      <section id="demonstracao" className="landing-section">
        <div className="landing-container">
          <div className="section-header text-center">
            <h2 className="section-title">Ouça a Qualidade das Produções</h2>
            <p className="section-subtitle">
              Padrões gerados com harmonia estrita, acidentes controlados e dinâmicas orgânicas por gênero.
            </p>
          </div>

          <div className="genre-cards-grid">
            {genres.map((genre) => (
              <div key={genre.id} className={`genre-card ${genre.border}`}>
                <div className="genre-card-header">
                  <div className="genre-title-box">
                    <h3 className="genre-name">{genre.title}</h3>
                    <div className="genre-meta">
                      <span className="meta-badge">{genre.bpm}</span>
                      <span className="meta-badge">{genre.scale}</span>
                    </div>
                  </div>
                  <a href={`/studio?style=${genre.id}`} className="genre-play-btn" title="Abrir e Gerar no Studio">
                    ▶
                  </a>
                </div>
                <p className="genre-desc">{genre.desc}</p>
                <div className="genre-footer">
                  <a href={`/studio?style=${genre.id}`} className="genre-link">
                    Gerar neste Estilo no Studio →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECURSOS / FEATURES */}
      <section id="recursos" className="landing-section bg-surface-alt">
        <div className="landing-container">
          <div className="section-header text-center">
            <h2 className="section-title">Tecnologia Musical de Ponta</h2>
            <p className="section-subtitle">
              Projetado do zero para produtores musicais, beatmakers e compositores exigentes.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔊</div>
              <h3 className="feature-title">808 Sub-Bass 100% no Tom</h3>
              <p className="feature-text">
                O motor harmônico converte graus de acordes diretamente na tabela de frequências da escala, garantindo que o subgrave nunca desafine e converse perfeitamente com a tônica.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🥁</div>
              <h3 className="feature-title">Hi-Hat Rolls & Grooves Orgânicos</h3>
              <p className="feature-text">
                Subdivisões expressivas de $1/32$, tercinas e microtiming humanizado ($\pm 15$ms) para ritmos vivos que não soam como repetições robóticas.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎹</div>
              <h3 className="feature-title">4 Camadas Melódicas Especializadas</h3>
              <p className="feature-text">
                Geração inteligente diferenciada para <strong>Pads</strong> (acordes ricos), <strong>Arps</strong> (arpejos em semicolcheias), <strong>Plucks</strong> (síncopes agudas) e <strong>Leads</strong> (motivos com condução de vozes).
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📦</div>
              <h3 className="feature-title">Exportação MIDI & WAV 24-bit</h3>
              <p className="feature-text">
                Exporte canais separados de MIDI e áudio WAV masterizado com 1 clique. Arraste e solte direto no FL Studio, Ableton Live, Logic Pro ou Reaper.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3 className="feature-title">100% Local & Privado</h3>
              <p className="feature-text">
                Todo o processamento acontece no seu hardware. Suas ideias, arranjos e composições nunca são enviadas para servidores externos.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Super Leve & Sem Latência</h3>
              <p className="feature-text">
                Construído com tecnologia nativa Rust (Tauri) e Web Workers. Inicializa em menos de 1 segundo e consome uma fração da memória de outros softwares.
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
            <h2 className="section-title">Baixe o AutoTunel para o Seu Sistema</h2>
            <p className="section-subtitle">
              Escolha seu dispositivo abaixo para instalar a versão local ou use a versão web instantânea.
            </p>
          </div>

          {/* DOWNLOAD TABS */}
          <div className="download-tabs-nav">
            <button
              className={`download-tab-btn ${activeTab === "desktop" ? "active" : ""}`}
              onClick={() => setActiveTab("desktop")}
            >
              💻 Computador (Desktop)
            </button>
            <button
              className={`download-tab-btn ${activeTab === "mobile" ? "active" : ""}`}
              onClick={() => setActiveTab("mobile")}
            >
              📱 Celular (Mobile)
            </button>
            <button
              className={`download-tab-btn ${activeTab === "web" ? "active" : ""}`}
              onClick={() => setActiveTab("web")}
            >
              🌐 Versão Web
            </button>
          </div>

          <div className="download-tabs-content">
            {activeTab === "desktop" && (
              <div className="download-cards-grid">
                {/* WINDOWS */}
                <div className="download-card">
                  <div className="download-card-icon">🪟</div>
                  <h3 className="download-card-title">Windows</h3>
                  <p className="download-card-desc">Windows 10 / 11 (64-bit)</p>
                  <ul className="download-features-list">
                    <li>✓ Instalador leve (.exe) com Tauri v2</li>
                    <li>✓ Baixo consumo de RAM e CPU</li>
                    <li>✓ Acesso direto a pastas locais</li>
                  </ul>
                  <a href="/downloads/AutoTunel-Setup.exe" className="btn-download-action">
                    Baixar para Windows (.exe)
                  </a>
                  <span className="download-meta">Versão 1.0.0 • ~14 MB</span>
                </div>

                {/* MACOS */}
                <div className="download-card">
                  <div className="download-card-icon">🍏</div>
                  <h3 className="download-card-title">macOS</h3>
                  <p className="download-card-desc">Apple Silicon (M1/M2/M3) & Intel</p>
                  <ul className="download-features-list">
                    <li>✓ Pacote Universal DMG</li>
                    <li>✓ Otimizado para Metal & CoreAudio</li>
                    <li>✓ Exportação de áudio ultrarrápida</li>
                  </ul>
                  <a href="/downloads/AutoTunel.dmg" className="btn-download-action">
                    Baixar para macOS (.dmg)
                  </a>
                  <span className="download-meta">Versão 1.0.0 • ~16 MB</span>
                </div>

                {/* LINUX */}
                <div className="download-card">
                  <div className="download-card-icon">🐧</div>
                  <h3 className="download-card-title">Linux</h3>
                  <p className="download-card-desc">Ubuntu, Debian, Fedora, Arch</p>
                  <ul className="download-features-list">
                    <li>✓ Pacote portátil AppImage & .deb</li>
                    <li>✓ Suporte nativo a ALSA e PulseAudio</li>
                    <li>✓ 100% Livre de dependências pesadas</li>
                  </ul>
                  <a href="/downloads/AutoTunel.AppImage" className="btn-download-action">
                    Baixar para Linux (.AppImage)
                  </a>
                  <span className="download-meta">Versão 1.0.0 • ~15 MB</span>
                </div>
              </div>
            )}

            {activeTab === "mobile" && (
              <div className="download-mobile-box">
                <div className="mobile-pwa-banner">
                  <div className="pwa-icon">📱</div>
                  <div className="pwa-text">
                    <h3>Instalar App no Celular com 1 Toque</h3>
                    <p>
                      O AutoTunel possui suporte a <strong>PWA (Progressive Web App)</strong>. Você pode instalar o aplicativo completo direto na tela inicial do seu celular, sem precisar baixar da loja e funcionando offline.
                    </p>
                    <div className="pwa-actions">
                      <button onClick={handlePwaInstall} className="btn-install-pwa">
                        📲 Instalar no Celular Agora
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
                    <p>Toque no botão "Instalar no Celular" acima ou clique nos 3 pontinhos do Chrome e em "Adicionar à tela inicial".</p>
                  </div>
                  <div className="step-item">
                    <span className="step-num">2</span>
                    <strong>No iPhone (Safari):</strong>
                    <p>Toque no ícone de Compartilhar (quadrado com seta para cima) e selecione "Adicionar à Tela de Início".</p>
                  </div>
                  <div className="step-item">
                    <span className="step-num">3</span>
                    <strong>Pronto para Criar:</strong>
                    <p>O ícone do AutoTunel aparecerá na sua tela inicial em tela cheia com resposta instantânea e offline.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "web" && (
              <div className="download-web-box text-center">
                <div className="web-box-icon">⚡</div>
                <h3>Usar o Studio Diretamente no Navegador</h3>
                <p>
                  Prefere usar agora sem instalar nada? Você pode abrir o <strong>AutoTunel Studio Web</strong> em qualquer navegador moderno (Chrome, Edge, Safari, Firefox).
                </p>
                <a href="/studio" className="btn-open-web-studio">
                  Entrar no Studio Web 🚀
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="landing-section bg-surface-alt">
        <div className="landing-container">
          <div className="section-header text-center">
            <h2 className="section-title">Por que escolher o AutoTunel Pro?</h2>
            <p className="section-subtitle">Veja como o processamento 100% local supera soluções antigas.</p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Recursos</th>
                  <th className="highlight-col">AutoTunel Pro</th>
                  <th>DAWs em Nuvem / IA</th>
                  <th>Plugins Tradicionais</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Local & Offline</strong></td>
                  <td className="highlight-col">✅ 100% no seu hardware</td>
                  <td>❌ Requer internet</td>
                  <td>✅ Local</td>
                </tr>
                <tr>
                  <td><strong>Latência de Geração</strong></td>
                  <td className="highlight-col">⚡ Instantânea (0ms)</td>
                  <td>⏳ Lenta (filas de servidores)</td>
                  <td>⚡ Rápida</td>
                </tr>
                <tr>
                  <td><strong>808 Harmônico com Slide</strong></td>
                  <td className="highlight-col">✅ Sim, afinado por grau</td>
                  <td>⚠️ Imprevisível</td>
                  <td>❌ Manual</td>
                </tr>
                <tr>
                  <td><strong>Exportação MIDI Multitrack</strong></td>
                  <td className="highlight-col">✅ Ilimitada & Grátis</td>
                  <td>⚠️ Paga por exportação</td>
                  <td>✅ Sim</td>
                </tr>
                <tr>
                  <td><strong>Consumo de Memória</strong></td>
                  <td className="highlight-col">🚀 Menos de 15 MB (Tauri)</td>
                  <td>⚠️ Pesado no navegador</td>
                  <td>❌ Gigabytes de amostras</td>
                </tr>
                <tr>
                  <td><strong>Direitos Comerciais</strong></td>
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
            <p className="section-subtitle">Tire suas dúvidas sobre o funcionamento do AutoTunel.</p>
          </div>

          <div className="faq-grid">
            <div className="faq-item">
              <h4 className="faq-question">O programa funciona sem internet?</h4>
              <p className="faq-answer">
                Sim! Todos os motores procedurais, síntese DSP de bateria/baixo e geradores de melodia rodam 100% localmente no processador do seu computador ou celular.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Posso usar os beats gerados comercialmente no Spotify e YouTube?</h4>
              <p className="faq-answer">
                Sim! Todas as batidas, melodias e arquivos MIDI/WAV gerados são 100% seus e Royalty Free para lançamento em streaming, vendas de beat e monetização.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Como exporto para o FL Studio, Ableton ou Reaper?</h4>
              <p className="faq-answer">
                Basta clicar nos botões de exportação dentro do Studio. O AutoTunel gera arquivos <code>.mid</code> (com canais separados para Lead, Pad, Bateria e 808) e arquivos <code>.wav</code> em 24-bit que você pode simplesmente arrastar para sua DAW.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Como funciona a instalação no celular?</h4>
              <p className="faq-answer">
                O AutoTunel utiliza tecnologia PWA moderna. Basta acessar o site pelo navegador do celular e tocar em "Instalar no Celular". O aplicativo será adicionado à sua tela inicial como um app nativo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FOOTER BANNER */}
      <section className="landing-cta-banner">
        <div className="landing-container text-center">
          <h2 className="cta-banner-title">Pronto para Elevar Suas Produções?</h2>
          <p className="cta-banner-subtitle">
            Crie seu próximo hit com arranjos harmônicos e bateria com resposta instantânea.
          </p>
          <div className="cta-banner-actions">
            <a href="/studio" className="btn-banner-studio">
              Abrir Studio Web Agora ⚡
            </a>
            <a href="#downloads" className="btn-banner-download">
              Baixar para Computador / Celular ↓
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">🎛️ AutoTunel Pro</span>
            <p className="footer-text">DAW e Engine Procedural de Áudio com Execução 100% Local.</p>
          </div>
          <div className="footer-links">
            <a href="/studio">Abrir Studio</a>
            <a href="#downloads">Downloads</a>
            <a href="#recursos">Recursos</a>
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
