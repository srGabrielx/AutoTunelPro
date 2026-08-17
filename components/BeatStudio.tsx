"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import type {
  ArtistPresetId,
  BassDrive,
  BassOctave,
  BassResult,
  DrumKitMode,
  DrumPatternMode,
  DrumResult,
  MelodyLayer,
  MelodySynthType,
  ScaleId,
  StyleId,
  TrackSettings,
} from "../lib/music/types";
import { downloadMidiBlob } from "../lib/export/midi";
import { downloadWavBlob } from "../lib/export/wav";
import { ARTIST_PRESETS, KEYS, SCALES, type ArtistPresetConfig } from "../lib/music/styles";
import {
  WorkerErrorResponse,
  WorkerSuccessResponse,
  ArrangementBlockData,
  ArrangementBlockType,
} from "../lib/workers/protocol";
import { StudioWorkerClient } from "../lib/workers/studio-worker-client";
import { SampleAccurateAudioEngine, type PlaybackMode } from "../lib/music/audio-transport";
import { usePlayheadController } from "../lib/music/usePlayheadController";

// ==========================================
// SVG ICONS (Explicit dimensions & zero bugs)
// ==========================================
function IconPlay({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`ui-icon ${className}`}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconStop({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={`ui-icon ${className}`}>
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function IconDice({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconMusic({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" fill="currentColor" fillOpacity="0.25" />
      <circle cx="18" cy="16" r="3" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

function IconMelody({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" fillOpacity="0.15" />
      <line x1="6" y1="4" x2="6" y2="13" strokeWidth="2.2" />
      <line x1="10" y1="4" x2="10" y2="13" strokeWidth="2.2" />
      <line x1="14" y1="4" x2="14" y2="13" strokeWidth="2.2" />
      <line x1="18" y1="4" x2="18" y2="13" strokeWidth="2.2" />
    </svg>
  );
}

function IconLead({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <path d="M2 12c2.5-6 4.5-6 7 0s4.5 6 7 0 4.5-6 6 0" />
    </svg>
  );
}

function IconPluck({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconPad({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <rect x="3" y="4" width="18" height="4" rx="1.5" fill="currentColor" fillOpacity="0.25" />
      <rect x="3" y="10" width="18" height="4" rx="1.5" fill="currentColor" fillOpacity="0.25" />
      <rect x="3" y="16" width="18" height="4" rx="1.5" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

function IconArp({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <path d="M3 18l4.5-6 4.5 4 4.5-7 4.5 3" />
      <circle cx="3" cy="18" r="1.5" fill="currentColor" />
      <circle cx="7.5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="9" r="1.5" fill="currentColor" />
      <circle cx="21" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconBass({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <path d="M2 12h3l2.5-7 5 14 4-9 3 5 2.5-3H22" />
    </svg>
  );
}

function IconDrums({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <ellipse cx="12" cy="8" rx="8" ry="4" fill="currentColor" fillOpacity="0.25" />
      <path d="M4 8v8c0 2.21 3.58 4 8 4s8-1.79 8-4V8" />
      <path d="m5 4 4 4" />
      <path d="m19 4-4 4" />
    </svg>
  );
}

function IconPlus({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconChevronDown({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconTrash({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconVolume({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function IconRefresh({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
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
  ["hip-hop", "Hip Hop Anos 90"],
  ["hiphop-default", "Modern Hip Hop"],
  ["funk", "Funk"],
  ["amapiano", "Amapiano"],
  ["reggae-default", "Reggae Roots"],
  ["boombap-default", "Boom Bap Classic"],
  ["dubstep-default", "Dubstep Heavy"],
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
// ISOLATED SEQUENCER GRID (Zero React Re-renders on Playback)
// ==========================================
interface InteractiveSequencerProps {
  sequencerId: string;
  active: Set<number>;
  heights?: Record<number, number>;
  labels?: Record<number, string>;
  colorTheme: "acid" | "cyan" | "violet";
  onStepClick: (stepIndex: number) => void;
  muted?: boolean;
  registerContainer?: (id: string, el: HTMLElement | null) => void;
  registerPlayhead?: (id: string, el: HTMLElement | null) => void;
}

const InteractiveSequencer = memo(function InteractiveSequencer({
  sequencerId,
  active,
  heights,
  labels,
  colorTheme,
  onStepClick,
  muted = false,
  registerContainer,
  registerPlayhead,
}: InteractiveSequencerProps) {
  return (
    <div
      ref={(el) => registerContainer?.(sequencerId, el)}
      data-sequencer-id={sequencerId}
      className={`sequence ${colorTheme} ${muted ? "is-muted" : ""}`}
      aria-label="Sequenciador Interativo de 16 passos"
    >
      {/* 60FPS Hardware-Accelerated Continuous Playhead Line */}
      <div
        ref={(el) => registerPlayhead?.(sequencerId, el)}
        className="playhead-line"
      />

      <div className="grid16">
        {Array.from({ length: 16 }, (_, step) => {
          const isHit = active.has(step);
          const height = heights?.[step] ?? (isHit ? 64 : 14);
          const label = labels?.[step];
          return (
            <button
              type="button"
              key={step}
              data-step-index={step}
              className={`step-col ${isHit ? "has-hit" : ""}`}
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
});

// ==========================================
// MELODY LAYER CARD COMPONENT
// ==========================================
interface MelodyLayerCardProps {
  layer: MelodyLayer;
  index: number;
  totalLayers: number;
  busy: string | null;
  onUpdate: (id: string, patch: Partial<MelodyLayer>) => void;
  onGenerate: (layerId: string, customSeed?: number) => void;
  onRemove: (id: string) => void;
  onToggleStep: (layerId: string, step: number) => void;
  trackSettings: TrackSettings | undefined;
  onVolumeChange: (id: string, vol: number) => void;
  registerContainer?: (id: string, el: HTMLElement | null) => void;
  registerPlayhead?: (id: string, el: HTMLElement | null) => void;
}

const MelodyLayerCard = memo(function MelodyLayerCard({
  layer,
  index,
  totalLayers,
  busy,
  onUpdate,
  onGenerate,
  onRemove,
  onToggleStep,
  trackSettings,
  onVolumeChange,
  registerContainer,
  registerPlayhead,
}: MelodyLayerCardProps) {
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
            <IconMusic size={24} />
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

      <div className="track-volume-row">
        <IconVolume className="vol-icon" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={trackSettings?.volume ?? 0.8}
          onChange={(e) => onVolumeChange(layer.id, Number(e.target.value))}
        />
        <span className="vol-pct">{Math.round((trackSettings?.volume ?? 0.8) * 100)}%</span>
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
        sequencerId={layer.id}
        active={steps}
        heights={heights}
        labels={labels}
        colorTheme="acid"
        onStepClick={(step) => onToggleStep(layer.id, step)}
        muted={layer.muted}
        registerContainer={registerContainer}
        registerPlayhead={registerPlayhead}
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
            <SeedInput seed={layer.result.seed} onApply={(s) => onGenerate(layer.id, s)} /> · <b>{layer.result.notes.length}</b> notas ativas · Clique nos passos para editar.
          </span>
        ) : (
          "Aguardando geração da camada."
        )}
      </div>
    </div>
  );
});

// ==========================================
// MAIN STUDIO COMPONENT
// ==========================================
function SeedInput({ seed, onApply, label = "Seed" }: { seed: number | string; onApply: (val: number) => void; label?: string }) {
  const [val, setVal] = useState(String(seed));
  useEffect(() => { setVal(String(seed)); }, [seed]);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      {label} <input 
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const n = parseInt(val, 10);
            if (!isNaN(n)) onApply(n);
          }
        }}
        onBlur={() => {
          const n = parseInt(val, 10);
          if (!isNaN(n) && n !== seed) onApply(n);
        }}
        style={{ width: "80px", padding: "2px 4px", fontSize: "11px", background: "rgba(0,0,0,0.3)", color: "#FFD700", border: "1px solid rgba(255, 215, 0, 0.3)", borderRadius: "4px", fontFamily: "monospace", textAlign: "center", outline: "none" }}
      />
    </span>
  );
}

export default function BeatStudio() {

  // Global settings (Default to Preset 1: Matuê Kenny G Trap BR)
  const [bpm, setBpm] = useState(134);
  const [bpmInput, setBpmInput] = useState("134");
  const [key, setKey] = useState("G#");
  const [globalScale, setGlobalScale] = useState<ScaleId>("natural-minor");
  const [artistPreset, setArtistPreset] = useState<ArtistPresetId>("1-matue-kennyg");
  const [complexity, setComplexity] = useState(4);
  const [isTransportOpen, setIsTransportOpen] = useState(false);
  
  // Preset Browser Modal State
  const [isPresetBrowserOpen, setIsPresetBrowserOpen] = useState(false);
  const [presetCategory, setPresetCategory] = useState<string>("Trap");
  const [userPresets, setUserPresets] = useState<Record<string, ArtistPresetConfig>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("autotunel_user_presets");
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  // Draggable FAB state
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    hasMoved: false,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const currentX = fabPos?.x ?? rect.left;
    const currentY = fabPos?.y ?? rect.top;

    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: currentX,
      initialPosY: currentY,
      hasMoved: false,
    };

    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.active) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragState.current.hasMoved = true;
    }

    if (dragState.current.hasMoved) {
      const maxX = typeof window !== "undefined" ? window.innerWidth - 80 : 800;
      const maxY = typeof window !== "undefined" ? window.innerHeight - 80 : 800;
      const newX = Math.max(20, Math.min(maxX, dragState.current.initialPosX + dx));
      const newY = Math.max(20, Math.min(maxY, dragState.current.initialPosY + dy));
      setFabPos({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    // We explicitly DO NOT trigger the toggle here. 
    // The native onClick event will handle it to avoid event bubbling / ghost clicks.
  };

  const handleFabClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragState.current.hasMoved) {
      setIsTransportOpen((prev) => !prev);
    }
    dragState.current.hasMoved = false;
  };

  // Multi-Layer Melody State (Default to Pluck / Sinos for Matuê Kenny G)
  const [melodyLayers, setMelodyLayers] = useState<MelodyLayer[]>(() => [
    createDefaultLayer("trap-br", "G#", "natural-minor", "pluck"),
  ]);

  // Per-track settings (Volume/Mute)
  const [trackSettings, setTrackSettings] = useState<Record<string, TrackSettings>>({});
  const [isAddTrackMenuOpen, setIsAddTrackMenuOpen] = useState(false);

  // 808 Bass Engine State
  const [bassStyle, setBassStyle] = useState<StyleId>("trap-br");
  const [bassOctave, setBassOctave] = useState<BassOctave>(-24); // C1 default
  const [bassDrive, setBassDrive] = useState<BassDrive>("warm");
  const [bass, setBass] = useState<BassResult | null>(null);
  const [muteBass, setMuteBass] = useState(false);

  // Drum Engine State
  const [drumStyle, setDrumStyle] = useState<StyleId>("trap-br");
  const [drumPattern, setDrumPattern] = useState<DrumPatternMode>("standard");
  const [drumKit, setDrumKit] = useState<DrumKitMode>("trap-808");
  const [drumSwing, setDrumSwing] = useState(30);
  const [drumRollDensity, setDrumRollDensity] = useState(65);
  const [drumHumanize, setDrumHumanize] = useState(50);
  const [drums, setDrums] = useState<DrumResult | null>(null);
  const [muteDrums, setMuteDrums] = useState(false);

  // Arrangement State
  const [arrangementBlocks, setArrangementBlocks] = useState<ArrangementBlockData[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isAutoArrangement, setIsAutoArrangement] = useState(false);

  // UI / Export state
  const [busy, setBusy] = useState<string | null>(null);
  const [exportingWav, setExportingWav] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [error, setError] = useState("");

  // Playback state
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode | null>(null);
  const [isLooping, setIsLooping] = useState(true);

  // Audio Engine & Web Worker RPC Client References
  const audioEngineRef = useRef<SampleAccurateAudioEngine>(new SampleAccurateAudioEngine());
  const workerClientRef = useRef<StudioWorkerClient | null>(null);

  // Playhead 60FPS RAF Controller
  const { registerContainer, registerPlayhead } = usePlayheadController({
    audioEngineRef,
    isPlaying: playbackMode !== null,
  });

  // Keep state refs for immediate access
  const stateRef = useRef({
    bpm,
    key,
    globalScale,
    complexity,
    melodyLayers,
    bass,
    drums,
    muteBass,
    muteDrums,
    bassDrive,
    drumKit,
    bassStyle,
    bassOctave,
    drumStyle,
    drumPattern,
    drumSwing,
    drumRollDensity,
    drumHumanize,
    isLooping,
    playbackMode,
    trackSettings,
    arrangementBlocks,
    currentBlockIndex,
    isAutoArrangement,
  });

  useEffect(() => {
    stateRef.current = {
      bpm,
      key,
      globalScale,
      complexity,
      melodyLayers,
      bass,
      drums,
      muteBass,
      muteDrums,
      bassDrive,
      drumKit,
      bassStyle,
      bassOctave,
      drumStyle,
      drumPattern,
      drumSwing,
      drumRollDensity,
      drumHumanize,
      isLooping,
      playbackMode,
      trackSettings,
      arrangementBlocks,
      currentBlockIndex,
      isAutoArrangement,
    };

    // Update real-time step events map without restarting playback
    if (audioEngineRef.current.getIsPlaying()) {
      audioEngineRef.current.prepareStepEvents({
        melodyLayers,
        bass,
        drums,
        muteBass,
        muteDrums,
        bassDrive,
        drumKit,
      });
    }
  }, [
    bpm,
    key,
    globalScale,
    complexity,
    melodyLayers,
    bass,
    drums,
    muteBass,
    muteDrums,
    bassDrive,
    drumKit,
    bassStyle,
    bassOctave,
    drumStyle,
    drumPattern,
    drumSwing,
    drumRollDensity,
    drumHumanize,
    isLooping,
    playbackMode,
    trackSettings,
    arrangementBlocks,
    currentBlockIndex,
    isAutoArrangement,
  ]);

  // Stop playback helper
  const stopPlayback = useCallback(() => {
    audioEngineRef.current.stop();
    setPlaybackMode(null);
  }, []);

  const handleVolumeChange = useCallback((id: string, vol: number) => {
    setTrackSettings((prev) => ({
      ...prev,
      [id]: { volume: vol, muted: prev[id]?.muted ?? false },
    }));
    audioEngineRef.current.setTrackVolume(id, vol);
  }, []);

  // Start playback helper with sample-accurate lookahead
  const startPlayback = useCallback((mode: PlaybackMode) => {
    stopPlayback();
    setPlaybackMode(mode);

    const s = stateRef.current;
    // Apply current track volumes before playback start
    if (s.trackSettings) {
      Object.entries(s.trackSettings).forEach(([id, cfg]) => {
        audioEngineRef.current.setTrackVolume(id, cfg.volume);
      });
    }

    audioEngineRef.current.start({
      bpm: s.bpm,
      isLooping: s.isLooping,
      playbackMode: mode,
      melodyLayers: s.melodyLayers,
      bass: s.bass,
      drums: s.drums,
      muteBass: s.muteBass,
      muteDrums: s.muteDrums,
      bassDrive: s.bassDrive,
      drumKit: s.drumKit,
      onStop: () => {
        setPlaybackMode(null);
      },
      onLoopComplete: () => {
        const currentState = stateRef.current;
        if (currentState.isAutoArrangement && currentState.arrangementBlocks.length > 0) {
          const nextIdx = (currentState.currentBlockIndex + 1) % currentState.arrangementBlocks.length;
          setCurrentBlockIndex(nextIdx);
          const nextBlock = currentState.arrangementBlocks[nextIdx];
          if (nextBlock) {
            setBass(nextBlock.bass);
            setDrums(nextBlock.drums);
            setMelodyLayers((prev) =>
              prev.map((l) => {
                const found = nextBlock.melodyResults.find((m) => m.layerId === l.id);
                return found ? { ...l, result: found.result } : l;
              })
            );
          }
        }
      },
    });
  }, [stopPlayback]);

  // BPM Input Handler (Live Tempo Update Without Stopping Music)
  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBpmInput(val);
    if (val !== "") {
      const num = Number(val);
      if (!isNaN(num) && num >= 40 && num <= 300) {
        setBpm(num);
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

  // Sync any live changes to playing audio smoothly without stopping playback
  useEffect(() => {
    if (playbackMode && audioEngineRef.current.getIsPlaying()) {
      audioEngineRef.current.updateLiveParams({
        bpm,
        melodyLayers,
        bass,
        drums,
        muteBass,
        muteDrums,
        bassDrive,
        drumKit,
      });
    }
  }, [bpm, melodyLayers, bass, drums, muteBass, muteDrums, bassDrive, drumKit, playbackMode]);

  // Artist Preset Handler
  // Artist Preset Handler (Loads Hit Vibe & Automatically Generates Full Beat)
  const applyArtistPreset = useCallback(
    async (presetId: string, customConfig?: ArtistPresetConfig) => {
      setArtistPreset(presetId as ArtistPresetId);
      if (presetId === "custom" && !customConfig) return;
      const config = customConfig || ARTIST_PRESETS[presetId as ArtistPresetId];
      if (!config) return;

      setKey(config.key);
      setGlobalScale(config.scale);
      setBpm(config.bpm);
      setBpmInput(String(config.bpm));
      setComplexity(config.complexity);
      setBassStyle(config.style);
      setDrumStyle(config.style);

      const labelMap: Record<MelodySynthType, string> = {
        lead: "Lead Principal",
        pad: "Pad / Harmonia",
        pluck: "Pluck / Sinos",
        arp: "Arp / Variação",
      };
      const preferred = config.preferredSynths ?? ["pluck", "pad", "lead"];

      const updatedLayers = stateRef.current.melodyLayers.map((l, idx) => {
        const synthType = preferred[idx % preferred.length];
        return {
          ...l,
          key: config.key,
          scale: config.scale,
          style: config.style,
          synthType,
          label: labelMap[synthType as keyof typeof labelMap] || l.label,
        };
      });
      setMelodyLayers(updatedLayers);

      if (workerClientRef.current) {
        stopPlayback();
        setBusy("all");
        setError("");
        try {
          const allData = await workerClientRef.current.generateAll({
            bpm: config.bpm,
            key: config.key,
            globalScale: config.scale,
            complexity: config.complexity,
            bassStyle: config.style,
            bassOctave: stateRef.current.bassOctave,
            drumStyle: config.style,
            drumPattern: stateRef.current.drumPattern,
            swing: stateRef.current.drumSwing,
            rollDensity: stateRef.current.drumRollDensity,
            humanize: stateRef.current.drumHumanize,
            melodyLayers: updatedLayers.map((l) => ({
              id: l.id,
              style: l.style,
              key: l.key,
              scale: l.scale,
              muted: l.muted,
            })),
          });

          if (allData.blocks && allData.blocks.length > 0) {
            setArrangementBlocks(allData.blocks);
            
            const firstBlock = allData.blocks[0];
            setCurrentBlockIndex(0);
            setBass(firstBlock.bass);
            setDrums(firstBlock.drums);
            setMelodyLayers((prev) =>
              prev.map((l) => {
                const found = firstBlock.melodyResults.find((m) => m.layerId === l.id);
                return found ? { ...l, result: found.result } : l;
              })
            );
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Erro ao carregar preset.");
        } finally {
          setBusy(null);
        }
      }
    },
    [stopPlayback]
  );

  const selectArrangementBlock = useCallback((index: number, blocks: ArrangementBlockData[] = arrangementBlocks) => {
    if (!blocks[index]) return;
    const block = blocks[index];
    setCurrentBlockIndex(index);
    setBass(block.bass);
    setDrums(block.drums);
    setMelodyLayers((prev) =>
      prev.map((l) => {
        const found = block.melodyResults.find((m) => m.layerId === l.id);
        return found ? { ...l, result: found.result } : l;
      })
    );
  }, [arrangementBlocks]);

  const patchActiveBlock = useCallback((patch: Partial<ArrangementBlockData>) => {
    setArrangementBlocks((prev) => {
      const idx = stateRef.current.currentBlockIndex;
      if (!prev[idx]) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  }, []);

  // Layer CRUD
  const updateLayer = useCallback((id: string, patch: Partial<MelodyLayer>) => {
    setMelodyLayers((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, ...patch } : l));
      const melodyResults = next.map(l => ({ layerId: l.id, result: l.result! })).filter(m => !!m.result);
      patchActiveBlock({ melodyResults });
      return next;
    });
  }, [patchActiveBlock]);

  const addExtraLayer = useCallback(
    async (synthType: MelodySynthType) => {
      if (melodyLayers.length >= MAX_MELODY_LAYERS) return;
      const currentStyle = stateRef.current.melodyLayers[0]?.style ?? "trap-br";
      const newLayer = createDefaultLayer(currentStyle, key, globalScale, synthType);
      const newLayerId = newLayer.id;

      setMelodyLayers((prev) => [...prev, newLayer]);
      setIsAddTrackMenuOpen(false);

      if (workerClientRef.current) {
        setBusy(newLayerId);
        try {
          const result = await workerClientRef.current.generateMelody({
            layerId: newLayerId,
            style: newLayer.style,
            bpm,
            key: newLayer.key,
            scale: newLayer.scale,
            complexity,
          });
          setMelodyLayers((prev) => {
            const next = prev.map((l) => (l.id === newLayerId ? { ...l, result } : l));
            const melodyResults = next.map(l => ({ layerId: l.id, result: l.result! })).filter(m => !!m.result);
            patchActiveBlock({ melodyResults });
            return next;
          });
        } catch (err) {
          console.error(err);
        } finally {
          setBusy(null);
        }
      }
    },
    [key, globalScale, bpm, complexity, melodyLayers.length]
  );

  const removeMelodyLayer = useCallback((id: string) => {
    setMelodyLayers((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((l) => l.id !== id);
      const melodyResults = next.map(l => ({ layerId: l.id, result: l.result! })).filter(m => !!m.result);
      patchActiveBlock({ melodyResults });
      return next;
    });
  }, [patchActiveBlock]);

  const toggleMelodyStep = useCallback((layerId: string, stepIdx: number) => {
    setMelodyLayers((prev) => {
      const next = prev.map((layer) => {
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
      });
      const melodyResults = next.map(l => ({ layerId: l.id, result: l.result! })).filter(m => !!m.result);
      patchActiveBlock({ melodyResults });
      return next;
    });
  }, [patchActiveBlock]);

  // Worker-Powered Generator: Single Melody Layer
  const generateMelodyLayer = useCallback(
    async (layerId: string, customSeed?: number) => {
      const layer = stateRef.current.melodyLayers.find((l) => l.id === layerId);
      if (!layer || !workerClientRef.current) return;
      stopPlayback();
      setBusy(layerId);
      setError("");
      try {
        const result = await workerClientRef.current.generateMelody({
          layerId,
          style: layer.style,
          bpm,
          key: layer.key,
          scale: layer.scale,
          complexity,
          seed: customSeed,
        });
        updateLayer(layerId, { result });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao gerar camada de melodia.");
      } finally {
        setBusy(null);
      }
    },
    [bpm, complexity, updateLayer, stopPlayback]
  );

  // Worker-Powered Generator: Bass / Drums
  const generateEngine = useCallback(
    async (engine: "bass" | "drums", customSeed?: number) => {
      if (!workerClientRef.current) return;
      stopPlayback();
      setBusy(engine);
      setError("");
      try {
        if (engine === "bass") {
          const bassData = await workerClientRef.current.generateBass({
            style: bassStyle,
            bpm,
            key,
            scale: globalScale,
            bassOctave,
            complexity,
            seed: customSeed,
          });
          setBass(bassData);
          patchActiveBlock({ bass: bassData });
        } else {
          const drumsData = await workerClientRef.current.generateDrums({
            style: drumStyle,
            bpm,
            drumPattern,
            complexity,
            swing: drumSwing,
            rollDensity: drumRollDensity,
            humanize: drumHumanize,
            seed: customSeed,
          });
          setDrums(drumsData);
          patchActiveBlock({ drums: drumsData });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : `Erro ao gerar ${engine}.`);
      } finally {
        setBusy(null);
      }
    },
    [bassStyle, drumStyle, bpm, key, globalScale, bassOctave, drumPattern, complexity, drumSwing, drumRollDensity, drumHumanize, stopPlayback, patchActiveBlock]
  );

  // Worker-Powered Generator: Full Beat (Simultaneous Promise.all Orchestrated in Worker)
  const generateFullBeat = useCallback(async () => {
    if (!workerClientRef.current) return;
    stopPlayback();
    setBusy("all");
    try {
      const synthCycle: MelodySynthType[] = ["pluck", "lead", "pad", "arp"];
      const labelMap: Record<MelodySynthType, string> = {
        lead: "Lead Principal",
        pad: "Pad / Harmonia",
        pluck: "Pluck / Sinos",
        arp: "Arp / Variação",
      };

      const preferred = artistPreset !== "custom" && ARTIST_PRESETS[artistPreset]?.preferredSynths
        ? ARTIST_PRESETS[artistPreset].preferredSynths
        : synthCycle;

      const refreshedLayers = stateRef.current.melodyLayers.map((l, idx) => {
        const synthType = preferred[idx % preferred.length];
        return {
          ...l,
          synthType,
          label: labelMap[synthType as keyof typeof labelMap] || l.label,
        };
      });
      setMelodyLayers(refreshedLayers);

      const allData = await workerClientRef.current.generateAll({
        bpm,
        key,
        globalScale,
        complexity,
        bassStyle,
        bassOctave,
        drumStyle,
        drumPattern,
        swing: drumSwing,
        rollDensity: drumRollDensity,
        humanize: drumHumanize,
        melodyLayers: refreshedLayers.map((l) => ({
          id: l.id,
          style: l.style,
          key: l.key,
          scale: l.scale,
          muted: l.muted,
        })),
      });

      if (allData.blocks && allData.blocks.length > 0) {
        setArrangementBlocks(allData.blocks);
        selectArrangementBlock(0, allData.blocks);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar beat completo.");
    } finally {
      setBusy(null);
    }
  }, [bassStyle, drumStyle, bpm, key, globalScale, bassOctave, drumPattern, complexity, drumSwing, drumRollDensity, drumHumanize, stopPlayback, selectArrangementBlock]);

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
    const newBass = { ...bass, notes: updatedNotes };
    setBass(newBass);
    patchActiveBlock({ bass: newBass });
  };

  // Drum step edit
  const toggleDrumStep = (stepIdx: number) => {
    if (!drums) return;
    const currentHits = drums.hits.filter((h) => h.step === stepIdx);
    const updatedHits = drums.hits.filter((h) => h.step !== stepIdx);
    if (currentHits.length === 0) updatedHits.push({ step: stepIdx, drum: "kick", velocity: 95 });
    else if (currentHits.some((h) => h.drum === "kick")) updatedHits.push({ step: stepIdx, drum: "snare", velocity: 95 });
    else if (currentHits.some((h) => h.drum === "snare")) updatedHits.push({ step: stepIdx, drum: "hat", velocity: 75 });
    const newDrums = { ...drums, hits: updatedHits.sort((a, b) => a.step - b.step) };
    setDrums(newDrums);
    patchActiveBlock({ drums: newDrums });
  };

  // Export MIDI (Processed in Worker with Zero-Copy ArrayBuffer Transfer)
  const handleExportMidi = async () => {
    if (!workerClientRef.current) return;
    setError("");
    try {
      const result = await workerClientRef.current.exportMidi({
        bpm,
        melodyLayers: stateRef.current.melodyLayers,
        blocks: stateRef.current.arrangementBlocks,
        muteBass,
        muteDrums,
        filename: `AutoTunel-${key}-${bpm}BPM.mid`,
      });
      downloadMidiBlob(result.buffer, result.filename);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar arquivo MIDI no worker.");
    }
  };

  // Export WAV (Pure Float32 DSP Processed in Worker with Zero-Copy ArrayBuffer Transfer)
  const handleExportWav = async () => {
    if (!workerClientRef.current) return;
    setExportingWav(true);
    setError("");
    try {
      const result = await workerClientRef.current.exportWav({
        bpm,
        melodyLayers: stateRef.current.melodyLayers.filter((l) => !l.muted),
        blocks: stateRef.current.arrangementBlocks,
        muteBass,
        muteDrums,
        loops: 2,
        bassDrive,
        drumKit,
        filename: `AutoTunel-${key}-${bpm}BPM-Master.wav`,
      });
      downloadWavBlob(result.buffer, result.filename);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao renderizar áudio WAV no worker.");
    } finally {
      setExportingWav(false);
    }
  };

  // Lifecycle Initialization & Worker Cleanup (Runs ONLY ONCE on mount)
  useEffect(() => {
    const engine = audioEngineRef.current;
    const workerClient = new StudioWorkerClient();
    workerClientRef.current = workerClient;

    // Trigger initial beat generation on mount only
    workerClient
      .generateAll({
        bpm: stateRef.current.bpm,
        key: stateRef.current.key,
        globalScale: stateRef.current.globalScale,
        complexity: stateRef.current.complexity,
        bassStyle: stateRef.current.bassStyle,
        bassOctave: stateRef.current.bassOctave,
        drumStyle: stateRef.current.drumStyle,
        drumPattern: stateRef.current.drumPattern,
        swing: stateRef.current.drumSwing,
        rollDensity: stateRef.current.drumRollDensity,
        humanize: stateRef.current.drumHumanize,
        melodyLayers: stateRef.current.melodyLayers.map((l) => ({
          id: l.id,
          style: l.style,
          key: l.key,
          scale: l.scale,
          muted: l.muted,
        })),
      })
      .then((allData) => {
        if (allData.blocks && allData.blocks.length > 0) {
          setArrangementBlocks(allData.blocks);
          selectArrangementBlock(0, allData.blocks);
        }
      })
      .catch(() => {});

    return () => {
      engine.stop();
      if (workerClientRef.current) {
        workerClientRef.current.terminate();
        workerClientRef.current = null;
      }
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
    drumHeights[h.step] = h.drum === "kick" ? 78 : h.drum === "snare" ? 64 : h.drum === "clap" ? 68 : h.drum === "open-hat" ? 52 : 40;
    drumLabels[h.step] = h.drum.toUpperCase();
  });

  const hasAnyData = melodyLayers.some((l) => l.result) || bass !== null || drums !== null;

  return (
    <main className="shell">
      {/* ==========================================
          1. TOPBAR
          ========================================== */}
      <nav className="topbar">
        <div className="topbar-brand">
          <img src="/logo.png" alt="AutoTunel" className="brand-logo-img" />
          <span className="brand-text">AutoTunel</span>
          <span className="version-pill">PRO ENGINE</span>
        </div>

        <div className="topbar-status">
          <span className="status-dot" />
          <span className="status-text">{key} {SCALES[globalScale]?.label.split(" ")[0]} · {bpm} BPM</span>
        </div>


      </nav>

      {/* ==========================================
          2. HERO & ARTIST PRESETS HUB
          ========================================== */}
      <section className="hero">
        <div className="hero-head">
          <div className="kicker">AutoTunel Studio // Escalas Harmônicas & Artist Presets</div>
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
              className={`master-btn ${playbackMode === "all" ? "playing" : ""}`}
              onClick={() => (playbackMode === "all" ? stopPlayback() : startPlayback("all"))}
              disabled={!hasAnyData}
              title={playbackMode === "all" ? "Parar Reprodução do Mix" : "Reproduzir Mix Completo"}
            >
              {playbackMode === "all" ? (
                <span className="flex items-center gap-2">
                  <IconStop className="w-4 h-4" /> Parar
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <IconPlay className="w-4 h-4" /> Reproduzir
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

            {/* EXPORT BUTTONS */}
            <div className="export-hub relative flex flex-col gap-2" style={{ position: "relative" }}>
              <button
                className="btn-export-midi flex justify-between"
                style={{ padding: "8px 12px" }}
                onClick={() => setIsExportOpen(!isExportOpen)}
                title="Opções de Exportação"
              >
                <span>Exportar</span> <IconChevronDown />
              </button>
              
              {isExportOpen && (
                <div 
                  className="absolute top-full mt-2 right-0 flex flex-col gap-2 z-50 shadow-lg"
                  style={{ 
                    backgroundColor: "#181822", border: "1px solid #3e3e4d", 
                    borderRadius: "10px", padding: "10px",
                    minWidth: "180px"
                  }}
                >
                  <button
                    className="btn-export-midi"
                    style={{ width: "100%", justifyContent: "flex-start" }}
                    onClick={() => {
                      handleExportMidi();
                      setIsExportOpen(false);
                    }}
                    disabled={!hasAnyData}
                    title="Exportar trilhas MIDI separadas para sua DAW"
                  >
                    <IconMusic className="w-3.5 h-3.5 text-cyan" /> Exportar MIDI (.mid)
                  </button>
                  <button
                    className="btn-export-wav"
                    style={{ width: "100%", justifyContent: "flex-start" }}
                    onClick={() => {
                      handleExportWav();
                      setIsExportOpen(false);
                    }}
                    disabled={exportingWav || !hasAnyData}
                    title="Renderizar e baixar áudio WAV Master em alta qualidade"
                  >
                    <IconDownload className="w-3.5 h-3.5 text-acid" />
                    {exportingWav ? "Renderizando..." : "Exportar WAV (.wav)"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Master Parameters Group */}
          <div className="master-params-group">
            <label className="param-field">
              <span className="param-label">Preset de Artista (Vibe)</span>
              <button
                className="param-select artist-select text-left"
                onClick={() => setIsPresetBrowserOpen(true)}
              >
                {ARTIST_PRESETS[artistPreset]?.label || "Selecione uma Vibe..."}
              </button>
            </label>


          </div>
        </div>

        {/* Arrangement tabs were moved to the top export-hub */}
      </section>

      {/* ==========================================
          3. MELODY LAYERS SECTION
          ========================================== */}
      <section className="section-block">
        <div className="section-header">
          <div className="section-title">
            <span className="engine-icon-badge acid">
              <IconMelody size={24} />
            </span>
            <div>
              <b>Melody Engine (Multi-Camadas)</b>
              <span>
                {melodyLayers.length} camada{melodyLayers.length > 1 ? "s" : ""} melódica{melodyLayers.length > 1 ? "s" : ""} ativa{melodyLayers.length > 1 ? "s" : ""} · Edição e timbres individuais
              </span>
            </div>
          </div>
        </div>

        <div className="melody-layers-grid">
          {melodyLayers.map((layer, idx) => (
            <MelodyLayerCard
              key={layer.id}
              layer={layer}
              index={idx}
              totalLayers={melodyLayers.length}
              busy={busy}
              onUpdate={updateLayer}
              onGenerate={generateMelodyLayer}
              onRemove={removeMelodyLayer}
              onToggleStep={toggleMelodyStep}
              registerContainer={registerContainer}
              registerPlayhead={registerPlayhead}
              trackSettings={trackSettings[layer.id]}
              onVolumeChange={handleVolumeChange}
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
                <IconBass size={24} />
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

            </div>
          </header>

          <div className="track-volume-row" style={{ padding: "0 16px 12px 16px" }}>
            <IconVolume className="vol-icon" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={trackSettings["bass"]?.volume ?? 0.8}
              onChange={(e) => handleVolumeChange("bass", Number(e.target.value))}
            />
            <span className="vol-pct">{Math.round((trackSettings["bass"]?.volume ?? 0.8) * 100)}%</span>
          </div>

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
            sequencerId="bass-sequencer"
            active={bassSteps}
            heights={bassHeights}
            labels={bassLabels}
            colorTheme="cyan"
            onStepClick={toggleBassStep}
            muted={muteBass}
            registerContainer={registerContainer}
            registerPlayhead={registerPlayhead}
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
                <SeedInput seed={bass.seed} onApply={(s) => generateEngine("bass", s)} /> · Afinado em <b>{key}</b> ({bassOctave === -36 ? "C0" : bassOctave === -24 ? "C1" : "C2"}) · <b>{bass.notes.length}</b> ataques
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
                <IconDrums size={24} />
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
            </div>
          </header>

          <div className="track-volume-row" style={{ padding: "0 16px 12px 16px" }}>
            <IconVolume className="vol-icon" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={trackSettings["drums"]?.volume ?? 0.8}
              onChange={(e) => handleVolumeChange("drums", Number(e.target.value))}
            />
            <span className="vol-pct">{Math.round((trackSettings["drums"]?.volume ?? 0.8) * 100)}%</span>
          </div>

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

          <div className="groove-controls-row">
            <label className="groove-control-item">
              <span className="groove-label">
                <span>Swing & Groove</span>
                <span className="groove-val">{drumSwing}%</span>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={drumSwing}
                onChange={(e) => setDrumSwing(Number(e.target.value))}
                title="Atraso e balanço rítmico dos offbeats"
              />
            </label>
            <label className="groove-control-item">
              <span className="groove-label">
                <span>Rolls & Triplets</span>
                <span className="groove-val">{drumRollDensity}%</span>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={drumRollDensity}
                onChange={(e) => setDrumRollDensity(Number(e.target.value))}
                title="Frequência de rolls rápidos 1/32 e triplets 1/24"
              />
            </label>
            <label className="groove-control-item">
              <span className="groove-label">
                <span>Humanize Velocity</span>
                <span className="groove-val">{drumHumanize}%</span>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={drumHumanize}
                onChange={(e) => setDrumHumanize(Number(e.target.value))}
                title="Dinâmica de toques, ghost notes e variações de força"
              />
            </label>
          </div>

          <InteractiveSequencer
            sequencerId="drums-sequencer"
            active={drumSteps}
            heights={drumHeights}
            labels={drumLabels}
            colorTheme="violet"
            onStepClick={toggleDrumStep}
            muted={muteDrums}
            registerContainer={registerContainer}
            registerPlayhead={registerPlayhead}
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
                <SeedInput seed={drums.seed} onApply={(s) => generateEngine("drums", s)} /> · Padrão <b>{drumPattern}</b> · <b>{drums.hits.length}</b> peças rítmicas
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
      {/* ==========================================
          TRANSPORT BAR POPUP (BOTTOM)
          ========================================== */}
      {hasAnyData && (
        <>
          {!isTransportOpen && (
            <button
              className={`transport-fab ${playbackMode ? "pulse-glow" : ""}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={handleFabClick}
              style={fabPos ? { left: `${fabPos.x}px`, top: `${fabPos.y}px`, bottom: "auto", right: "auto", position: "fixed" } : undefined}
              title="Arraste para mover ou clique para abrir controles"
            >
              <img src="/logo.png" alt="AutoTunel" className="w-9 h-9 object-contain pointer-events-none" />
            </button>
          )}

          {isTransportOpen && (
            <div
              className="transport-drawer-container"
              style={
                fabPos
                  ? {
                      left: typeof window !== "undefined" && fabPos.x + 320 > window.innerWidth ? "auto" : `${fabPos.x}px`,
                      right: typeof window !== "undefined" && fabPos.x + 320 > window.innerWidth ? "20px" : "auto",
                      top: typeof window !== "undefined" && fabPos.y + 500 > window.innerHeight ? "auto" : `${fabPos.y}px`,
                      bottom: typeof window !== "undefined" && fabPos.y + 500 > window.innerHeight ? "20px" : "auto",
                      position: "fixed",
                    }
                  : undefined
              }
            >
              <div className="transport-drawer">
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

              <div className="transport-popup">
                <button
                  className="solo-btn active btn-transport-close"
                  onClick={() => setIsTransportOpen(false)}
                  title="Ocultar Painel"
                >
                  <img src="/logo.png" alt="AutoTunel Logo" className="btn-logo-inline" />
                  <span>Fechar</span>
                </button>
                <div className="transport-divider" />
                
                {arrangementBlocks.length > 0 && (
                  <div className="flex flex-col gap-2 mb-2 w-full px-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">Arranjo</span>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {arrangementBlocks.map((block, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setIsAutoArrangement(false);
                            selectArrangementBlock(idx);
                          }}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${!isAutoArrangement && currentBlockIndex === idx ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'bg-transparent text-gray-300 border-gray-600 hover:bg-[#2a2a35] hover:border-gray-400'}`}
                        >
                          {block.type}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-[#3e3e4d]">
                        <span className={`text-[10px] font-bold uppercase tracking-wider transition-all ${isAutoArrangement ? 'text-cyan drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]' : 'text-gray-500'}`}>Auto</span>
                        <button
                          onClick={() => setIsAutoArrangement(!isAutoArrangement)}
                          className={`relative inline-flex h-[18px] w-8 items-center rounded-full transition-all border ${
                            isAutoArrangement 
                              ? "bg-transparent border-[#00ffff] shadow-[0_0_8px_rgba(0,255,255,0.8)]" 
                              : "bg-[#181822] border-gray-600"
                          }`}
                          title="Tocar arranjo completo girando entre os blocos"
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full transition-all ${
                              isAutoArrangement ? "translate-x-4 bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]" : "translate-x-1 bg-gray-500"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="transport-divider" />
            <button
              className={`master-btn ${playbackMode === "all" ? "playing" : ""}`}
              onClick={() => (playbackMode === "all" ? stopPlayback() : startPlayback("all"))}
            >
              {playbackMode === "all" ? <IconStop size={18} /> : <IconPlay size={18} />} Tocar Mix
            </button>
            <div className="transport-divider" />
            <div className="transport-solos">
              <button
                className={`solo-btn ${playbackMode === "melody" ? "active" : ""}`}
                onClick={() => (playbackMode === "melody" ? stopPlayback() : startPlayback("melody"))}
                disabled={!melodyLayers.some((l) => l.result)}
              >
                {playbackMode === "melody" ? <IconStop size={14} /> : <IconPlay size={14} />} Melodias
              </button>
              <button
                className={`solo-btn ${playbackMode === "bass" ? "active" : ""}`}
                onClick={() => (playbackMode === "bass" ? stopPlayback() : startPlayback("bass"))}
                disabled={!bass}
              >
                {playbackMode === "bass" ? <IconStop size={14} /> : <IconPlay size={14} />} 808
              </button>
              <button
                className={`solo-btn ${playbackMode === "drums" ? "active" : ""}`}
                onClick={() => (playbackMode === "drums" ? stopPlayback() : startPlayback("drums"))}
                disabled={!drums}
              >
                {playbackMode === "drums" ? <IconStop size={14} /> : <IconPlay size={14} />} Baterias
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )}

      {/* ==========================================
          ADD-TRACK FAB (BOTTOM RIGHT)
          ========================================== */}
      <button
        className={`add-track-fab ${isAddTrackMenuOpen ? "is-open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsAddTrackMenuOpen(!isAddTrackMenuOpen);
        }}
        title="Adicionar Faixa"
      >
        <IconPlus size={24} />
      </button>

      {isAddTrackMenuOpen && (
        <>
          <div
            className="add-track-menu-overlay"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsAddTrackMenuOpen(false);
            }}
          />
          <div className="add-track-menu">
            <div className="add-track-menu-header">
              <span>Adicionar Camada Extra</span>
              <small>({melodyLayers.length}/{MAX_MELODY_LAYERS})</small>
            </div>
            <button
              className="add-track-menu-item"
              onClick={() => addExtraLayer("lead")}
              disabled={melodyLayers.length >= MAX_MELODY_LAYERS}
            >
              <span className="menu-icon"><IconLead /></span>
              + Melodia Lead (Principal)
            </button>
            <button
              className="add-track-menu-item"
              onClick={() => addExtraLayer("pluck")}
              disabled={melodyLayers.length >= MAX_MELODY_LAYERS}
            >
              <span className="menu-icon"><IconPluck /></span>
              + Camada Pluck / Sinos (Bells)
            </button>
            <button
              className="add-track-menu-item"
              onClick={() => addExtraLayer("pad")}
              disabled={melodyLayers.length >= MAX_MELODY_LAYERS}
            >
              <span className="menu-icon"><IconPad /></span>
              + Camada Pad (Acordes & Harmonia)
            </button>
            <button
              className="add-track-menu-item"
              onClick={() => addExtraLayer("arp")}
              disabled={melodyLayers.length >= MAX_MELODY_LAYERS}
            >
              <span className="menu-icon"><IconArp /></span>
              + Camada Arp / Contra-Melodia
            </button>
          </div>
        </>
      )}

      {/* ==========================================
          PRESET BROWSER MODAL (PAGINATED)
          ========================================== */}
      {isPresetBrowserOpen && (
        <div className="preset-modal-overlay" onClick={() => setIsPresetBrowserOpen(false)}>
          <div className="preset-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preset-modal-header">
              <h2>Biblioteca de Vibes (Presets)</h2>
              <div className="preset-modal-header-actions">
                <button
                  className="save-preset-btn"
                  onClick={() => {
                    const name = prompt("Nome do seu Preset:", `Meu Preset ${Object.keys(userPresets).length + 1}`);
                    if (!name || !name.trim()) return;
                    const id = `user-${Date.now()}`;
                    const newConfig: ArtistPresetConfig = {
                      label: name.trim(),
                      artist: "Produtor",
                      songRef: `${key} ${globalScale} · ${bpm} BPM`,
                      key,
                      scale: globalScale,
                      bpm,
                      style: bassStyle,
                      complexity,
                      description: `Preset personalizado criado por você (${melodyLayers.length} camadas).`,
                      preferredSynths: melodyLayers.map((l) => l.synthType),
                    };
                    const updated = { ...userPresets, [id]: newConfig };
                    setUserPresets(updated);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("autotunel_user_presets", JSON.stringify(updated));
                    }
                    setPresetCategory("Meus Presets");
                  }}
                >
                  <span>+</span> Salvar
                </button>
                <button className="close-btn" onClick={() => setIsPresetBrowserOpen(false)}>
                  Fechar
                </button>
              </div>
            </div>
            
            <div className="preset-tabs">
              {["Trap", "Drill", "Funk", "R&B / Pop", "Meus Presets"].map((tab) => (
                <button 
                  key={tab} 
                  className={`preset-tab ${presetCategory === tab ? "active" : ""}`}
                  onClick={() => setPresetCategory(tab)}
                >
                  {tab} {tab === "Meus Presets" && Object.keys(userPresets).length > 0 && `(${Object.keys(userPresets).length})`}
                </button>
              ))}
            </div>

            <div className="preset-grid">
              {presetCategory === "Meus Presets" ? (
                Object.keys(userPresets).length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 20px", color: "#888" }}>
                    Nenhum preset salvo ainda. Clique no botão <b>+ Salvar</b> acima para salvar a vibe e timbres que você acabou de criar!
                  </div>
                ) : (
                  Object.entries(userPresets).map(([id, info]) => (
                    <div
                      key={id}
                      className={`preset-card ${artistPreset === id ? "active" : ""}`}
                      style={{ position: "relative" }}
                      onClick={() => {
                        applyArtistPreset(id, info);
                        setIsPresetBrowserOpen(false);
                      }}
                    >
                      <div className="preset-card-title">{info.label}</div>
                      <div className="preset-card-tags">
                        <span className="tag scale">{SCALES[info.scale]?.label || info.scale}</span>
                        <span className="tag bpm">{info.bpm} BPM</span>
                      </div>
                      <div className="preset-card-desc">{info.description}</div>
                      <button
                        className="delete-user-preset-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir o preset "${info.label}"?`)) {
                            const copy = { ...userPresets };
                            delete copy[id];
                            setUserPresets(copy);
                            if (typeof window !== "undefined") {
                              localStorage.setItem("autotunel_user_presets", JSON.stringify(copy));
                            }
                          }
                        }}
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  ))
                )
              ) : (
                Object.entries(ARTIST_PRESETS)
                  .filter(([id, info]) => {
                    if (id === "custom") return false;
                    if (presetCategory === "Trap") return info.style.includes("trap") && !info.style.includes("uk");
                    if (presetCategory === "Drill") return info.style.includes("uk") || info.label.toLowerCase().includes("drill");
                    if (presetCategory === "Funk") return info.style.includes("funk");
                    if (presetCategory === "R&B / Pop") return info.style.includes("rnb") || info.style.includes("pop") || info.style.includes("amapiano");
                    return true;
                  })
                  .map(([id, info]) => (
                    <button
                      key={id}
                      className={`preset-card ${artistPreset === id ? "active" : ""}`}
                      onClick={() => {
                        applyArtistPreset(id as ArtistPresetId);
                        setIsPresetBrowserOpen(false);
                      }}
                    >
                      <div className="preset-card-title">{info.label.replace(/^\d+\.\s*/, '')}</div>
                      <div className="preset-card-tags">
                        <span className="tag scale">{SCALES[info.scale]?.label || info.scale}</span>
                        <span className="tag bpm">{info.bpm} BPM</span>
                      </div>
                      <div className="preset-card-desc">{info.description}</div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="footer-note">
        {error ? (
          <span className="error-text">⚠️ {error}</span>
        ) : (
          <span>
            ⚡ AutoTunel Studio // Multi-Layer · Escalas Harmônicas · Afinador 808 · Exportação MIDI & WAV nativa no navegador.
          </span>
        )}
      </footer>
    </main>
  );
}
