"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  ArtistPresetId,
  BassDrive,
  BassNote,
  BassOctave,
  BassResult,
  DrumHit,
  DrumKitMode,
  DrumPatternMode,
  DrumResult,
  MelodyLayer,
  MelodyNote,
  MelodyResult,
  MelodySynthType,
  ScaleId,
  StyleId,
} from "../lib/music/types";
import { createMidiFile, downloadMidiBlob } from "../lib/export/midi";
import { renderAndDownloadWav } from "../lib/export/wav";
import { ARTIST_PRESETS, KEYS, SCALES, STYLES } from "../lib/music/styles";

// ==========================================
// SVG ICONS (Explicit dimensions & zero bugs)
// ==========================================
function IconPlay({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconStop({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function IconDice({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconDownload({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconMusic({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function IconMelody({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" fill="currentColor" fillOpacity="0.25" />
      <circle cx="18" cy="16" r="3" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

function IconBass({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M2 12h2.5l2.5-8 5 16 4-11 3 6 3-3H22" />
    </svg>
  );
}

function IconDrums({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <ellipse cx="12" cy="8" rx="8" ry="4" fill="currentColor" fillOpacity="0.25" />
      <path d="M4 8v8c0 2.21 3.58 4 8 4s8-1.79 8-4V8" />
      <path d="m5 4 4 4" />
      <path d="m19 4-4 4" />
    </svg>
  );
}

function IconPlus({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconTrash({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSliders({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function IconRefresh({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} style={{ width: size, height: size, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

// ==========================================
// CONSTANTS & HELPERS
// ==========================================
const STYLE_OPTIONS: [StyleId, string][] = [
  ["trap-br", "Trap BR"],
  ["trap-uk", "Trap UK (Drill)"],
  ["trap-usa", "Trap EUA"],
  ["hip-hop", "Hip Hop"],
  ["funk", "Funk"],
  ["amapiano", "Amapiano"],
];

const SYNTH_OPTIONS: [MelodySynthType, string][] = [
  ["lead", "Lead (Synth Lead)"],
  ["pad", "Pad (Warm Chords)"],
  ["pluck", "Pluck (Dark Bells)"],
  ["arp", "Arpeggio (Fast Notes)"],
];

const KEYS_LIST = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAX_MELODY_LAYERS = 4;

let layerCounter = 0;
function createLayerId(): string {
  layerCounter += 1;
  return `layer-${layerCounter}-${Date.now()}`;
}

function createDefaultLayer(style: StyleId, key: string, scale: ScaleId, synthType: MelodySynthType = "lead"): MelodyLayer {
  const labelMap: Record<MelodySynthType, string> = {
    lead: "Lead Principal",
    pad: "Pad / Harmonia",
    pluck: "Pluck / Sinos",
    arp: "Arp / Variação",
  };
  return {
    id: createLayerId(),
    label: labelMap[synthType] || "Melodia",
    synthType,
    style,
    key,
    scale,
    muted: false,
    result: null,
  };
}

// ==========================================
// REAL-TIME AUDIO SYNTHESIZER
// ==========================================
class WebAudioStudio {
  private ctx: AudioContext | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;

  init() {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.delayNode = this.ctx.createDelay();
      this.delayNode.delayTime.value = 0.24;
      this.delayGain = this.ctx.createGain();
      this.delayGain.gain.value = 0.22;
      this.delayNode.connect(this.delayGain);
      this.delayGain.connect(this.delayNode);
      this.delayGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  getContext() {
    return this.init();
  }

  playKick(when: number, velocity = 90, kit: DrumKitMode = "trap-808") {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vol = (velocity / 127) * (kit === "funk-tamborzao" ? 0.55 : 0.45);
    const startFreq = kit === "drill-punch" ? 180 : kit === "funk-tamborzao" ? 140 : 155;
    const endFreq = kit === "funk-tamborzao" ? 52 : 44;

    osc.type = kit === "funk-tamborzao" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(startFreq, when);
    osc.frequency.exponentialRampToValueAtTime(endFreq, when + 0.08);

    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.32);

    osc.connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.33);
  }

  play808Bass(
    when: number,
    midiNote: number,
    durationSec: number,
    velocity = 100,
    isSlide = false,
    drive: BassDrive = "warm"
  ) {
    const ctx = this.init();
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const vol = (velocity / 127) * 0.48;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dist = ctx.createWaveShaper();

    // Saturação configurável (Clean, Warm, Overdrive)
    const curve = new Float32Array(128);
    const k = drive === "overdrive" ? 8 : drive === "warm" ? 2 : 0;
    for (let i = 0; i < 128; i++) {
      const x = (i * 2) / 128 - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
      }
    }
    dist.curve = curve;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 1.5, when);
    osc.frequency.exponentialRampToValueAtTime(freq, when + 0.05);

    if (isSlide) {
      osc.frequency.exponentialRampToValueAtTime(freq * 1.45, when + durationSec * 0.75);
    }

    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);

    osc.connect(dist).connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + durationSec + 0.05);
  }

  playSnare(when: number, velocity = 90, kit: DrumKitMode = "trap-808") {
    const ctx = this.init();
    const vol = (velocity / 127) * 0.36;
    const dur = kit === "funk-tamborzao" ? 0.09 : 0.13;

    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = kit === "drill-punch" ? 2200 : 1600;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(when);

    // Body tone
    const osc = ctx.createOscillator();
    const tGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, when);
    osc.frequency.exponentialRampToValueAtTime(85, when + 0.07);

    tGain.gain.setValueAtTime(vol * 0.75, when);
    tGain.gain.exponentialRampToValueAtTime(0.001, when + 0.08);

    osc.connect(tGain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.09);
  }

  playHat(when: number, velocity = 75) {
    const ctx = this.init();
    const dur = 0.04;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7500;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime((velocity / 127) * 0.18, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(when);
  }

  playOpenHat(when: number, velocity = 80) {
    const ctx = this.init();
    const dur = 0.22;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 6200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime((velocity / 127) * 0.22, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(when);
  }

  playMelodyNote(
    when: number,
    midiNote: number,
    durationSec: number,
    velocity = 90,
    synthType: MelodySynthType = "lead"
  ) {
    const ctx = this.init();
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const vol = (velocity / 127) * (synthType === "pad" ? 0.28 : 0.22);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = synthType === "pad" ? "triangle" : synthType === "arp" ? "sawtooth" : "sawtooth";
    osc1.frequency.setValueAtTime(freq, when);

    osc2.type = synthType === "pluck" ? "sine" : "triangle";
    osc2.frequency.setValueAtTime(freq * 1.003, when);

    filter.type = "lowpass";
    const cutoff = synthType === "pad" ? 1800 : synthType === "pluck" ? 4200 : synthType === "arp" ? 3600 : 3000;
    filter.frequency.setValueAtTime(cutoff, when);
    filter.frequency.exponentialRampToValueAtTime(450, when + durationSec * 0.9);
    filter.Q.value = synthType === "pluck" ? 5.0 : 3.2;

    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + durationSec);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    if (this.delayNode) gain.connect(this.delayNode);

    osc1.start(when);
    osc2.start(when);
    osc1.stop(when + durationSec + 0.05);
    osc2.stop(when + durationSec + 0.05);
  }
}

const studioAudio = new WebAudioStudio();

// ==========================================
// SEQUENCER GRID COMPONENT
// ==========================================
function InteractiveSequencer({
  active,
  heights,
  labels,
  currentStep,
  colorTheme,
  onStepClick,
  muted = false,
}: {
  active: Set<number>;
  heights?: Record<number, number>;
  labels?: Record<number, string>;
  currentStep: number | null;
  colorTheme: "acid" | "cyan" | "violet";
  onStepClick: (stepIndex: number) => void;
  muted?: boolean;
}) {
  return (
    <div className={`sequence ${colorTheme} ${muted ? "is-muted" : ""}`} aria-label="Sequenciador Interativo de 16 passos">
      <div className="grid16">
        {Array.from({ length: 16 }, (_, step) => {
          const isHit = active.has(step);
          const isCurrent = currentStep === step;
          const height = heights?.[step] ?? (isHit ? 64 : 14);
          const label = labels?.[step];
          return (
            <button
              type="button"
              key={step}
              className={`step-col ${isHit ? "has-hit" : ""} ${isCurrent ? "is-playing" : ""}`}
              onClick={() => onStepClick(step)}
              title={`Passo ${step + 1}${label ? `: ${label}` : ""} (Clique para editar)`}
            >
              <div className="step-bar-wrap">
                <span className={`step ${isHit ? "on" : ""}`} style={{ height: `${height}px` }} />
              </div>
              <span className="step-num">{step + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// MELODY LAYER CARD COMPONENT
// ==========================================
function MelodyLayerCard({
  layer,
  index,
  totalLayers,
  currentStep,
  playbackActive,
  busy,
  onUpdate,
  onGenerate,
  onRemove,
  onToggleStep,
}: {
  layer: MelodyLayer;
  index: number;
  totalLayers: number;
  currentStep: number | null;
  playbackActive: boolean;
  busy: string | null;
  onUpdate: (id: string, patch: Partial<MelodyLayer>) => void;
  onGenerate: (layerId: string) => void;
  onRemove: (id: string) => void;
  onToggleStep: (layerId: string, step: number) => void;
}) {
  const steps = new Set(layer.result?.notes.map((n) => n.step) ?? []);
  const heights: Record<number, number> = {};
  const labels: Record<number, string> = {};
  layer.result?.notes.forEach((n) => {
    heights[n.step] = Math.max(22, Math.min(84, 28 + (n.note - 48) * 2.2));
    labels[n.step] = `Nota ${n.note}`;
  });

  const layerNum = String(index + 1).padStart(2, "0");

  return (
    <div className={`melody-layer-card melody ${layer.muted ? "muted-track" : ""}`}>
      <div className="layer-header">
        <div className="layer-identity">
          <span className="engine-icon-badge acid">
            <IconMusic size={16} />
          </span>
          <div className="layer-info">
            <span className="layer-label">
              <span className="layer-pill">#{layerNum}</span> {layer.label}
            </span>
            <span className="layer-sub">{SCALES[layer.scale]?.label || "Escala Personalizada"}</span>
          </div>
        </div>
        <div className="layer-actions-head">
          <button
            type="button"
            className={`btn-mute ${layer.muted ? "active" : ""}`}
            onClick={() => onUpdate(layer.id, { muted: !layer.muted })}
          >
            {layer.muted ? "MUTADO" : "MUTE"}
          </button>
          {totalLayers > 1 && (
            <button
              type="button"
              className="btn-remove-layer"
              onClick={() => onRemove(layer.id)}
              title="Remover camada"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="controls controls-4col">
        <label>
          Estilo
          <select value={layer.style} onChange={(e) => onUpdate(layer.id, { style: e.target.value as StyleId })}>
            {STYLE_OPTIONS.map(([val, lbl]) => (
              <option key={val} value={val}>
                {lbl}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tom
          <select value={layer.key} onChange={(e) => onUpdate(layer.id, { key: e.target.value })}>
            {KEYS_LIST.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Escala
          <select value={layer.scale} onChange={(e) => onUpdate(layer.id, { scale: e.target.value as ScaleId })}>
            {Object.entries(SCALES).map(([id, info]) => (
              <option key={id} value={id}>
                {info.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Timbre
          <select
            value={layer.synthType}
            onChange={(e) => {
              const synthType = e.target.value as MelodySynthType;
              const labelMap: Record<MelodySynthType, string> = {
                lead: "Lead Principal",
                pad: "Pad / Harmonia",
                pluck: "Pluck / Sinos",
                arp: "Arp / Variação",
              };
              onUpdate(layer.id, { synthType, label: labelMap[synthType] });
            }}
          >
            {SYNTH_OPTIONS.map(([val, lbl]) => (
              <option key={val} value={val}>
                {lbl}
              </option>
            ))}
          </select>
        </label>
      </div>

      <InteractiveSequencer
        active={steps}
        heights={heights}
        labels={labels}
        currentStep={playbackActive ? currentStep : null}
        colorTheme="acid"
        onStepClick={(step) => onToggleStep(layer.id, step)}
        muted={layer.muted}
      />

      <div className="actions">
        <button className="primary" disabled={busy !== null} onClick={() => onGenerate(layer.id)}>
          {busy === layer.id ? (
            <span>Gerando...</span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <IconDice className="w-4 h-4" /> Gerar {layer.label}
            </span>
          )}
        </button>
      </div>

      <div className="message">
        {layer.result ? (
          <span>
            Seed <code>{layer.result.seed}</code> · <b>{layer.result.notes.length}</b> notas ativas · Clique nos passos para editar.
          </span>
        ) : (
          "Aguardando geração da camada."
        )}
      </div>
    </div>
  );
}

// ==========================================
// MAIN STUDIO COMPONENT
// ==========================================
export default function BeatStudio() {
  const [mounted, setMounted] = useState(false);

  // Global settings
  const [bpm, setBpm] = useState(140);
  const [bpmInput, setBpmInput] = useState("140");
  const [key, setKey] = useState("C");
  const [globalScale, setGlobalScale] = useState<ScaleId>("natural-minor");
  const [artistPreset, setArtistPreset] = useState<ArtistPresetId>("custom");
  const [complexity, setComplexity] = useState(3);

  // Multi-Layer Melody State
  const [melodyLayers, setMelodyLayers] = useState<MelodyLayer[]>(() => [
    createDefaultLayer("trap-br", "C", "natural-minor", "lead"),
  ]);

  // 808 Bass Engine State (Functional controls)
  const [bassStyle, setBassStyle] = useState<StyleId>("trap-br");
  const [bassOctave, setBassOctave] = useState<BassOctave>(-24); // C1 default
  const [bassDrive, setBassDrive] = useState<BassDrive>("warm");
  const [bass, setBass] = useState<BassResult | null>(null);
  const [muteBass, setMuteBass] = useState(false);

  // Drum Engine State (Functional controls)
  const [drumStyle, setDrumStyle] = useState<StyleId>("trap-br");
  const [drumPattern, setDrumPattern] = useState<DrumPatternMode>("standard");
  const [drumKit, setDrumKit] = useState<DrumKitMode>("trap-808");
  const [drums, setDrums] = useState<DrumResult | null>(null);
  const [muteDrums, setMuteDrums] = useState(false);

  // UI / Export state
  const [busy, setBusy] = useState<string | null>(null);
  const [exportingWav, setExportingWav] = useState(false);
  const [error, setError] = useState("");

  // Playback state
  const [playbackMode, setPlaybackMode] = useState<"all" | "melody" | "bass" | "drums" | null>(null);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stepRef = useRef(0);
  const playbackModeRef = useRef(playbackMode);
  playbackModeRef.current = playbackMode;

  const melodyLayersRef = useRef(melodyLayers);
  melodyLayersRef.current = melodyLayers;
  const bassRef = useRef(bass);
  bassRef.current = bass;
  const drumsRef = useRef(drums);
  drumsRef.current = drums;
  const muteBassRef = useRef(muteBass);
  muteBassRef.current = muteBass;
  const muteDrumsRef = useRef(muteDrums);
  muteDrumsRef.current = muteDrums;
  const bassDriveRef = useRef(bassDrive);
  bassDriveRef.current = bassDrive;
  const drumKitRef = useRef(drumKit);
  drumKitRef.current = drumKit;

  // ---- BPM Input Handler (Prevents locking to 0 on backspace) ----
  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBpmInput(val);
    if (val !== "") {
      const num = Number(val);
      if (!isNaN(num) && num >= 40 && num <= 300) {
        setBpm(num);
        if (playbackMode) stopPlayback();
      }
    }
  };

  const handleBpmBlur = () => {
    let num = Number(bpmInput);
    if (isNaN(num) || num < 40 || num > 300 || bpmInput.trim() === "") {
      num = 140;
    }
    setBpm(num);
    setBpmInput(String(num));
  };

  // ---- Artist Preset Handler (FL Studio Style) ----
  const applyArtistPreset = (presetId: ArtistPresetId) => {
    setArtistPreset(presetId);
    if (presetId === "custom") return;
    const config = ARTIST_PRESETS[presetId];
    if (!config) return;

    setKey(config.key);
    setGlobalScale(config.scale);
    setBpm(config.bpm);
    setBpmInput(String(config.bpm));
    setComplexity(config.complexity);
    setBassStyle(config.style);
    setDrumStyle(config.style);

    // Apply to melody layers
    setMelodyLayers((prev) =>
      prev.map((l) => ({
        ...l,
        key: config.key,
        scale: config.scale,
        style: config.style,
      }))
    );
  };

  // ---- Layer CRUD ----
  const updateLayer = useCallback((id: string, patch: Partial<MelodyLayer>) => {
    setMelodyLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const addMelodyLayer = useCallback(() => {
    setMelodyLayers((prev) => {
      if (prev.length >= MAX_MELODY_LAYERS) return prev;
      const synthTypes: MelodySynthType[] = ["lead", "pad", "pluck", "arp"];
      const usedTypes = new Set(prev.map((l) => l.synthType));
      const nextType = synthTypes.find((t) => !usedTypes.has(t)) ?? "pad";
      return [...prev, createDefaultLayer(prev[0]?.style ?? "trap-br", key, globalScale, nextType)];
    });
  }, [key, globalScale]);

  const removeMelodyLayer = useCallback((id: string) => {
    setMelodyLayers((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  }, []);

  const toggleMelodyStep = useCallback((layerId: string, stepIdx: number) => {
    setMelodyLayers((prev) =>
      prev.map((layer) => {
        if (layer.id !== layerId || !layer.result) return layer;
        const exists = layer.result.notes.find((n) => n.step === stepIdx);
        const root = KEYS[layer.key] ?? 60;
        const scaleIntervals = SCALES[layer.scale]?.intervals || [0, 2, 3, 5, 7, 8, 10];
        const randomDegree = scaleIntervals[Math.floor(Math.random() * scaleIntervals.length)] || 0;

        const updatedNotes = exists
          ? layer.result.notes.filter((n) => n.step !== stepIdx)
          : [...layer.result.notes, { step: stepIdx, note: root + randomDegree, velocity: 90, duration: 1 }].sort(
              (a, b) => a.step - b.step
            );
        return { ...layer, result: { ...layer.result, notes: updatedNotes } };
      })
    );
  }, []);

  // ---- Generator: Single Melody Layer ----
  const generateMelodyLayer = useCallback(
    async (layerId: string) => {
      const layer = melodyLayersRef.current.find((l) => l.id === layerId);
      if (!layer) return;
      setBusy(layerId);
      setError("");
      try {
        const res = await fetch("/api/melody", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            style: layer.style,
            bpm,
            key: layer.key,
            scale: layer.scale,
            complexity,
          }),
        });
        if (!res.ok) throw new Error();
        const data: MelodyResult = await res.json();
        updateLayer(layerId, { result: data });
      } catch {
        setError("Erro ao gerar camada de melodia.");
      } finally {
        setBusy(null);
      }
    },
    [bpm, complexity, updateLayer]
  );

  // ---- Generator: Bass / Drums ----
  const generateEngine = useCallback(
    async (engine: "bass" | "drums") => {
      setBusy(engine);
      setError("");
      try {
        if (engine === "bass") {
          const res = await fetch("/api/bass", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              style: bassStyle,
              bpm,
              key,
              scale: globalScale,
              bassOctave,
              complexity,
            }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          setBass(data);
        } else {
          const res = await fetch("/api/drums", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              style: drumStyle,
              bpm,
              drumPattern,
              complexity,
            }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          setDrums(data);
        }
      } catch {
        setError(`Erro ao gerar ${engine}.`);
      } finally {
        setBusy(null);
      }
    },
    [bassStyle, drumStyle, bpm, key, globalScale, bassOctave, drumPattern, complexity]
  );

  // ---- Generator: Full Beat ----
  const generateFullBeat = useCallback(async () => {
    setBusy("all");
    setError("");
    try {
      const layerPromises = melodyLayersRef.current.map((layer) =>
        fetch("/api/melody", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            style: layer.style,
            bpm,
            key: layer.key,
            scale: layer.scale,
            complexity,
          }),
        }).then((r) => {
          if (!r.ok) throw new Error();
          return r.json() as Promise<MelodyResult>;
        })
      );

      const [bassRes, drumsRes, ...melodyResults] = await Promise.all([
        fetch("/api/bass", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            style: bassStyle,
            bpm,
            key,
            scale: globalScale,
            bassOctave,
            complexity,
          }),
        }),
        fetch("/api/drums", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            style: drumStyle,
            bpm,
            drumPattern,
            complexity,
          }),
        }),
        ...layerPromises,
      ]);

      if (!bassRes.ok || !drumsRes.ok) throw new Error();
      const [bassData, drumsData] = await Promise.all([bassRes.json(), drumsRes.json()]);

      setMelodyLayers((prev) => prev.map((l, i) => ({ ...l, result: melodyResults[i] ?? l.result })));
      setBass(bassData);
      setDrums(drumsData);
    } catch {
      setError("Erro ao gerar beat completo.");
    } finally {
      setBusy(null);
    }
  }, [bassStyle, drumStyle, bpm, key, globalScale, bassOctave, drumPattern, complexity]);

  // Initial load
  useEffect(() => {
    setMounted(true);
    generateFullBeat();
  }, []);

  // Playback helper
  const stopPlayback = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaybackMode(null);
    setCurrentStep(null);
    stepRef.current = 0;
  }, []);

  const triggerStep = useCallback(
    (stepIdx: number, mode: "all" | "melody" | "bass" | "drums") => {
      const ctx = studioAudio.getContext();
      const now = ctx.currentTime + 0.01;
      const stepDuration = 60 / bpm / 4;

      // 1. Melody Layers
      if (mode === "all" || mode === "melody") {
        const layers = melodyLayersRef.current;
        const activeLayers = layers.filter((l) => !l.muted && l.result);
        const volScale = activeLayers.length > 1 ? 0.75 / activeLayers.length : 1;

        activeLayers.forEach((layer) => {
          const note = layer.result!.notes.find((n) => n.step === stepIdx);
          if (note) {
            studioAudio.playMelodyNote(
              now,
              note.note,
              stepDuration * (note.duration || 1) * 0.95 * volScale,
              note.velocity,
              layer.synthType
            );
          }
        });
      }

      // 2. 808 Bass
      if ((mode === "all" || mode === "bass") && !muteBassRef.current && bassRef.current) {
        const bNote = bassRef.current.notes.find((n) => n.step === stepIdx);
        if (bNote) {
          studioAudio.play808Bass(
            now,
            bNote.note,
            stepDuration * (bNote.duration || 2) * 0.98,
            bNote.velocity,
            bNote.slide,
            bassDriveRef.current
          );
        }
      }

      // 3. Drums
      if ((mode === "all" || mode === "drums") && !muteDrumsRef.current && drumsRef.current) {
        drumsRef.current.hits
          .filter((h) => h.step === stepIdx)
          .forEach((h) => {
            if (h.drum === "kick") studioAudio.playKick(now, h.velocity, drumKitRef.current);
            else if (h.drum === "snare") studioAudio.playSnare(now, h.velocity, drumKitRef.current);
            else if (h.drum === "open-hat") studioAudio.playOpenHat(now, h.velocity);
            else studioAudio.playHat(now, h.velocity);
          });
      }
    },
    [bpm]
  );

  const startPlayback = useCallback(
    (mode: "all" | "melody" | "bass" | "drums") => {
      stopPlayback();
      studioAudio.init();
      setPlaybackMode(mode);
      stepRef.current = 0;
      setCurrentStep(0);
      triggerStep(0, mode);

      const stepIntervalMs = (60 / bpm / 4) * 1000;
      timerRef.current = setInterval(() => {
        stepRef.current = (stepRef.current + 1) % 16;
        if (stepRef.current === 0 && !isLooping) {
          stopPlayback();
          return;
        }
        setCurrentStep(stepRef.current);
        triggerStep(stepRef.current, playbackModeRef.current || mode);
      }, stepIntervalMs);
    },
    [bpm, isLooping, stopPlayback, triggerStep]
  );

  // Bass step edit
  const toggleBassStep = (stepIdx: number) => {
    if (!bass) return;
    const exists = bass.notes.find((n) => n.step === stepIdx);
    const root = (KEYS[key] ?? 60) + bassOctave;
    const scaleIntervals = SCALES[globalScale]?.intervals || [0, 2, 3, 5, 7, 8, 10];
    const degree = scaleIntervals[Math.floor(Math.random() * 3)] || 0;

    const updatedNotes = exists
      ? bass.notes.filter((n) => n.step !== stepIdx)
      : [...bass.notes, { step: stepIdx, note: root + degree, velocity: 105, duration: 2 }].sort(
          (a, b) => a.step - b.step
        );
    setBass({ ...bass, notes: updatedNotes });
  };

  // Drum step edit
  const toggleDrumStep = (stepIdx: number) => {
    if (!drums) return;
    const currentHits = drums.hits.filter((h) => h.step === stepIdx);
    let updatedHits = drums.hits.filter((h) => h.step !== stepIdx);
    if (currentHits.length === 0) updatedHits.push({ step: stepIdx, drum: "kick", velocity: 95 });
    else if (currentHits.some((h) => h.drum === "kick")) updatedHits.push({ step: stepIdx, drum: "snare", velocity: 95 });
    else if (currentHits.some((h) => h.drum === "snare")) updatedHits.push({ step: stepIdx, drum: "hat", velocity: 75 });
    setDrums({ ...drums, hits: updatedHits.sort((a, b) => a.step - b.step) });
  };

  // Export MIDI
  const handleExportMidi = () => {
    try {
      const midiData = createMidiFile({ bpm, melodyLayers, bass, drums });
      downloadMidiBlob(midiData, `AutoTunel-${key}-${bpm}BPM.mid`);
    } catch {
      setError("Erro ao gerar arquivo MIDI.");
    }
  };

  // Export WAV
  const handleExportWav = async () => {
    setExportingWav(true);
    setError("");
    try {
      await renderAndDownloadWav({
        bpm,
        melodyLayers: melodyLayers.filter((l) => !l.muted),
        bass: muteBass ? null : bass,
        drums: muteDrums ? null : drums,
        loops: 2,
        filename: `AutoTunel-${key}-${bpm}BPM-Master.wav`,
      });
    } catch {
      setError("Erro ao renderizar áudio WAV.");
    } finally {
      setExportingWav(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Visualizations
  const bassSteps = new Set(bass?.notes.map((n) => n.step) ?? []);
  const bassHeights: Record<number, number> = {};
  const bassLabels: Record<number, string> = {};
  bass?.notes.forEach((n) => {
    bassHeights[n.step] = Math.max(26, Math.min(84, 34 + (n.note - 24) * 2.5));
    bassLabels[n.step] = `808 (${n.note})${n.slide ? " [Slide]" : ""}`;
  });

  const drumSteps = new Set(drums?.hits.map((h) => h.step) ?? []);
  const drumHeights: Record<number, number> = {};
  const drumLabels: Record<number, string> = {};
  drums?.hits.forEach((h) => {
    drumHeights[h.step] = h.drum === "kick" ? 78 : h.drum === "snare" ? 64 : 40;
    drumLabels[h.step] = h.drum.toUpperCase();
  });

  const hasAnyData = melodyLayers.some((l) => l.result) || bass || drums;

  if (!mounted) {
    return (
      <main className="shell">
        <nav className="topbar">
          <div className="topbar-brand">
            <span className="brand-mark">A</span>
            <span className="brand-text">AutoTunel</span>
            <span className="version-pill">STUDIO</span>
          </div>
        </nav>
      </main>
    );
  }

  return (
    <main className="shell">
      {/* ==========================================
          1. TOPBAR (Minimalista e Elegante)
          ========================================== */}
      <nav className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark">A</span>
          <span className="brand-text">AutoTunel</span>
          <span className="version-pill">PRO ENGINE</span>
        </div>

        <div className="topbar-status">
          <span className="status-dot" />
          <span className="status-text">{key} {SCALES[globalScale]?.label.split(" ")[0]} · {bpm} BPM</span>
        </div>

        <div className="topbar-play">
          <button
            className={`master-btn ${playbackMode === "all" ? "playing" : ""}`}
            onClick={() => (playbackMode === "all" ? stopPlayback() : startPlayback("all"))}
            disabled={!hasAnyData}
          >
            {playbackMode === "all" ? (
              <>
                <IconStop className="w-4 h-4" /> Parar Mix
              </>
            ) : (
              <>
                <IconPlay className="w-4 h-4" /> Tocar Beat Completo
              </>
            )}
          </button>
        </div>
      </nav>

      {/* ==========================================
          2. HERO & ARTIST PRESETS HUB
          ========================================== */}
      <section className="hero">
        <div className="hero-head">
          <div className="kicker">AutoTunel Studio // FL Studio Scales & Artist Presets</div>
          <h1>
            Produção musical fluida.<br />
            Do acorde ao 808 perfeito.
          </h1>
          <p className="intro">
            Gere até <b>4 camadas de melodia independentes</b>, afine seu <b>808 Sub-Bass</b> e crie batidas em 6 gêneros.
            Escolha escalas harmônicas ou use presets com referências de artistas famosos como <b>Akon</b>, <b>Travis Scott</b>, <b>Drake</b> e <b>Metro Boomin</b>.
          </p>
        </div>

        {/* Master Control Bar */}
        <div className="master-bar">
          {/* Main Action Group */}
          <div className="master-action-group">
            <button className="btn-generate-all" onClick={generateFullBeat} disabled={busy !== null}>
              {busy === "all" ? (
                <span className="flex items-center gap-2">
                  <IconRefresh className="w-4 h-4 animate-spin" /> Gerando 3 Motores...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <IconDice className="w-4 h-4" /> Gerar Beat Completo
                </span>
              )}
            </button>

            <button
              className={`btn-loop ${isLooping ? "active" : ""}`}
              onClick={() => setIsLooping(!isLooping)}
              title={isLooping ? "Loop Contínuo Ativo" : "Tocar apenas 1 ciclo"}
            >
              <IconRefresh className="w-3.5 h-3.5" /> Loop: {isLooping ? "ON" : "OFF"}
            </button>

            {/* EXPORT BUTTONS (Now positioned comfortably in the Master Hub) */}
            <div className="export-hub">
              <button
                className="btn-export-midi"
                onClick={handleExportMidi}
                disabled={!hasAnyData}
                title="Exportar trilhas MIDI separadas para sua DAW"
              >
                <IconMusic className="w-3.5 h-3.5 text-cyan" /> Exportar MIDI (.mid)
              </button>
              <button
                className="btn-export-wav"
                onClick={handleExportWav}
                disabled={exportingWav || !hasAnyData}
                title="Renderizar e baixar áudio WAV Master em alta qualidade"
              >
                <IconDownload className="w-3.5 h-3.5 text-acid" />
                {exportingWav ? "Renderizando..." : "Exportar WAV (.wav)"}
              </button>
            </div>
          </div>

          {/* Master Parameters Group */}
          <div className="master-params-group">
            <label className="param-field">
              <span className="param-label">Preset de Artista (Vibe)</span>
              <select
                className="param-select artist-select"
                value={artistPreset}
                onChange={(e) => applyArtistPreset(e.target.value as ArtistPresetId)}
              >
                {Object.entries(ARTIST_PRESETS).map(([id, info]) => (
                  <option key={id} value={id}>
                    {info.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="param-field">
              <span className="param-label">BPM Geral</span>
              <input
                type="text"
                className="param-input bpm-input"
                value={bpmInput}
                onChange={handleBpmChange}
                onBlur={handleBpmBlur}
                placeholder="140"
              />
            </label>

            <label className="param-field">
              <span className="param-label">Tom Geral</span>
              <select
                className="param-select"
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  setKey(newKey);
                  setMelodyLayers((prev) => prev.map((l) => ({ ...l, key: newKey })));
                  if (playbackMode) stopPlayback();
                }}
              >
                {KEYS_LIST.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="param-field">
              <span className="param-label">Escala (FL Scale)</span>
              <select
                className="param-select"
                value={globalScale}
                onChange={(e) => {
                  const newScale = e.target.value as ScaleId;
                  setGlobalScale(newScale);
                  setMelodyLayers((prev) => prev.map((l) => ({ ...l, scale: newScale })));
                }}
              >
                {Object.entries(SCALES).map(([id, info]) => (
                  <option key={id} value={id}>
                    {info.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="param-field">
              <span className="param-label">Complexidade</span>
              <select
                className="param-select"
                value={complexity}
                onChange={(e) => setComplexity(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    Nível {v} / 5
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* ==========================================
          3. MELODY LAYERS SECTION
          ========================================== */}
      <section className="section-block">
        <div className="section-header">
          <div className="section-title">
            <span className="engine-icon-badge acid">
              <IconMelody size={20} />
            </span>
            <div>
              <b>Melody Engine (Multi-Camadas)</b>
              <span>
                {melodyLayers.length} camada{melodyLayers.length > 1 ? "s" : ""} melódica{melodyLayers.length > 1 ? "s" : ""} ativa{melodyLayers.length > 1 ? "s" : ""} · Edição e timbres individuais
              </span>
            </div>
          </div>
          <div className="section-actions">
            <button
              className={`ghost-sm ${playbackMode === "melody" ? "active-play" : ""}`}
              disabled={!melodyLayers.some((l) => l.result)}
              onClick={() => (playbackMode === "melody" ? stopPlayback() : startPlayback("melody"))}
              title="Prévia solo apenas das melodias"
            >
              {playbackMode === "melody" ? <IconStop size={14} /> : <IconPlay size={14} />} Solo Melodia
            </button>
            {melodyLayers.length < MAX_MELODY_LAYERS && (
              <button className="btn-add-layer" onClick={addMelodyLayer} title="Adicionar nova camada (Lead, Pad, Pluck ou Arp)">
                <IconPlus size={14} /> Adicionar Camada de Melodia
              </button>
            )}
          </div>
        </div>

        <div className="melody-layers-grid">
          {melodyLayers.map((layer, idx) => (
            <MelodyLayerCard
              key={layer.id}
              layer={layer}
              index={idx}
              totalLayers={melodyLayers.length}
              currentStep={playbackMode ? currentStep : null}
              playbackActive={!!playbackMode}
              busy={busy}
              onUpdate={updateLayer}
              onGenerate={generateMelodyLayer}
              onRemove={removeMelodyLayer}
              onToggleStep={toggleMelodyStep}
            />
          ))}
        </div>
      </section>

      {/* ==========================================
          4. 808 BASS & DRUMS (Active Controls)
          ========================================== */}
      <section className="engines-two">
        {/* 808 Sub-Bass Engine */}
        <article className={`engine bass ${muteBass ? "muted-track" : ""}`}>
          <header className="engine-head">
            <div className="engine-title">
              <span className="engine-icon-badge cyan">
                <IconBass size={20} />
              </span>
              <div>
                <b>808 & Sub-Bass Engine</b>
                <span>Afinador de sub-bass, peso e saturação</span>
              </div>
            </div>
            <div className="track-controls">
              <button
                type="button"
                className={`btn-mute ${muteBass ? "active" : ""}`}
                onClick={() => setMuteBass(!muteBass)}
                title="Mutar 808"
              >
                {muteBass ? "MUTADO" : "MUTE"}
              </button>
              <button
                className={`ghost-sm ${playbackMode === "bass" ? "active-play" : ""}`}
                disabled={!bass}
                onClick={() => (playbackMode === "bass" ? stopPlayback() : startPlayback("bass"))}
                title="Solo do 808"
              >
                {playbackMode === "bass" ? <IconStop size={14} /> : <IconPlay size={14} />}
              </button>
            </div>
          </header>

          <div className="controls controls-3col">
            <label>
              Estilo 808
              <select value={bassStyle} onChange={(e) => setBassStyle(e.target.value as StyleId)}>
                {STYLE_OPTIONS.map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Afinador de Oitava
              <select value={bassOctave} onChange={(e) => setBassOctave(Number(e.target.value) as BassOctave)}>
                <option value={-36}>Deep Sub (C0 / -36st)</option>
                <option value={-24}>Punch Sub (C1 / -24st)</option>
                <option value={-12}>Mid Bass (C2 / -12st)</option>
              </select>
            </label>
            <label>
              Saturação / Drive
              <select value={bassDrive} onChange={(e) => setBassDrive(e.target.value as BassDrive)}>
                <option value="clean">Clean Sub (Puro)</option>
                <option value="warm">Tape Warmth (Quente)</option>
                <option value="overdrive">Hard Distort (Grave)</option>
              </select>
            </label>
          </div>

          <InteractiveSequencer
            active={bassSteps}
            heights={bassHeights}
            labels={bassLabels}
            currentStep={playbackMode ? currentStep : null}
            colorTheme="cyan"
            onStepClick={toggleBassStep}
            muted={muteBass}
          />

          <div className="actions">
            <button className="primary" disabled={busy !== null} onClick={() => generateEngine("bass")}>
              {busy === "bass" ? (
                "Gerando 808..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <IconDice size={16} /> Gerar 808 Bass ({key})
                </span>
              )}
            </button>
          </div>

          <div className="message">
            {bass ? (
              <span>
                Seed <code>{bass.seed}</code> · Afinado em <b>{key}</b> ({bassOctave === -36 ? "C0" : bassOctave === -24 ? "C1" : "C2"}) · <b>{bass.notes.length}</b> ataques
              </span>
            ) : (
              "Motor 808 autônomo com afinação procedural."
            )}
          </div>
        </article>

        {/* Drums Engine */}
        <article className={`engine drums ${muteDrums ? "muted-track" : ""}`}>
          <header className="engine-head">
            <div className="engine-title">
              <span className="engine-icon-badge violet">
                <IconDrums size={20} />
              </span>
              <div>
                <b>Drum Engine</b>
                <span>Kick, snare, rolls e padrões de compasso</span>
              </div>
            </div>
            <div className="track-controls">
              <button
                type="button"
                className={`btn-mute ${muteDrums ? "active" : ""}`}
                onClick={() => setMuteDrums(!muteDrums)}
                title="Mutar Bateria"
              >
                {muteDrums ? "MUTADO" : "MUTE"}
              </button>
              <button
                className={`ghost-sm ${playbackMode === "drums" ? "active-play" : ""}`}
                disabled={!drums}
                onClick={() => (playbackMode === "drums" ? stopPlayback() : startPlayback("drums"))}
                title="Solo da Bateria"
              >
                {playbackMode === "drums" ? <IconStop size={14} /> : <IconPlay size={14} />}
              </button>
            </div>
          </header>

          <div className="controls controls-3col">
            <label>
              Gênero Rítmico
              <select value={drumStyle} onChange={(e) => setDrumStyle(e.target.value as StyleId)}>
                {STYLE_OPTIONS.map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Padrão / Compasso
              <select value={drumPattern} onChange={(e) => setDrumPattern(e.target.value as DrumPatternMode)}>
                <option value="standard">1 Compasso (16 Passos)</option>
                <option value="half-time">Half-Time Groove</option>
                <option value="double-time">Double-Time Trap</option>
                <option value="triplet-rolls">Rolls & Triplets (Hats)</option>
              </select>
            </label>
            <label>
              Kit de Bateria
              <select value={drumKit} onChange={(e) => setDrumKit(e.target.value as DrumKitMode)}>
                <option value="trap-808">808 Trap Standard</option>
                <option value="drill-punch">UK Drill Tight</option>
                <option value="funk-tamborzao">Funk Mandelão SP</option>
                <option value="boom-bap">Boom Bap Vintage</option>
                <option value="amapiano-log">Amapiano Shaker</option>
              </select>
            </label>
          </div>

          <InteractiveSequencer
            active={drumSteps}
            heights={drumHeights}
            labels={drumLabels}
            currentStep={playbackMode ? currentStep : null}
            colorTheme="violet"
            onStepClick={toggleDrumStep}
            muted={muteDrums}
          />

          <div className="actions">
            <button className="primary" disabled={busy !== null} onClick={() => generateEngine("drums")}>
              {busy === "drums" ? (
                "Gerando Drums..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <IconDice className="w-4 h-4" /> Gerar Drums ({drumPattern})
                </span>
              )}
            </button>
          </div>

          <div className="message">
            {drums ? (
              <span>
                Seed <code>{drums.seed}</code> · Padrão <b>{drumPattern}</b> · <b>{drums.hits.length}</b> peças rítmicas
              </span>
            ) : (
              "Motor rítmico autônomo."
            )}
          </div>
        </article>
      </section>

      {/* ==========================================
          5. FOOTER
          ========================================== */}
      <footer className="footer-note">
        {error ? (
          <span className="error-text">⚠️ {error}</span>
        ) : (
          <span>
            ⚡ AutoTunel Studio // Multi-Layer · FL Studio Scales · Afinador 808 · Exportação MIDI & WAV nativa no navegador.
          </span>
        )}
      </footer>
    </main>
  );
}
