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
} from "../lib/music/types";
import { downloadMidiBlob } from "../lib/export/midi";
import { downloadWavBlob } from "../lib/export/wav";
import { ARTIST_PRESETS, KEYS, SCALES } from "../lib/music/styles";
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
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" fill="currentColor" fillOpacity="0.25" />
      <circle cx="18" cy="16" r="3" fill="currentColor" fillOpacity="0.25" />
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

function IconTrash({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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
  onGenerate: (layerId: string) => void;
  onRemove: (id: string) => void;
  onToggleStep: (layerId: string, step: number) => void;
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
            Seed <code>{layer.result.seed}</code> · <b>{layer.result.notes.length}</b> notas ativas · Clique nos passos para editar.
          </span>
        ) : (
          "Aguardando geração da camada."
        )}
      </div>
    </div>
  );
});

const emptySubscribe = () => () => {};
function useIsClient() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// ==========================================
// MAIN STUDIO COMPONENT
// ==========================================
export default function BeatStudio() {
  const isClient = useIsClient();

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
  const [drums, setDrums] = useState<DrumResult | null>(null);
  const [muteDrums, setMuteDrums] = useState(false);

  // UI / Export state
  const [busy, setBusy] = useState<string | null>(null);
  const [exportingWav, setExportingWav] = useState(false);
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
    isLooping,
    playbackMode,
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
      isLooping,
      playbackMode,
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
    isLooping,
    playbackMode,
  ]);

  // Stop playback helper
  const stopPlayback = useCallback(() => {
    audioEngineRef.current.stop();
    setPlaybackMode(null);
  }, []);

  // Start playback helper with sample-accurate lookahead
  const startPlayback = useCallback((mode: PlaybackMode) => {
    stopPlayback();
    setPlaybackMode(mode);

    const s = stateRef.current;
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
    });
  }, [stopPlayback]);

  // BPM Input Handler
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

  // Artist Preset Handler
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

    setMelodyLayers((prev) =>
      prev.map((l) => ({
        ...l,
        key: config.key,
        scale: config.scale,
        style: config.style,
      }))
    );
  };

  // Layer CRUD
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

  // Worker-Powered Generator: Single Melody Layer
  const generateMelodyLayer = useCallback(
    async (layerId: string) => {
      const layer = stateRef.current.melodyLayers.find((l) => l.id === layerId);
      if (!layer || !workerClientRef.current) return;
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
        });
        updateLayer(layerId, { result });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao gerar camada de melodia.");
      } finally {
        setBusy(null);
      }
    },
    [bpm, complexity, updateLayer]
  );

  // Worker-Powered Generator: Bass / Drums
  const generateEngine = useCallback(
    async (engine: "bass" | "drums") => {
      if (!workerClientRef.current) return;
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
          });
          setBass(bassData);
        } else {
          const drumsData = await workerClientRef.current.generateDrums({
            style: drumStyle,
            bpm,
            drumPattern,
            complexity,
          });
          setDrums(drumsData);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : `Erro ao gerar ${engine}.`);
      } finally {
        setBusy(null);
      }
    },
    [bassStyle, drumStyle, bpm, key, globalScale, bassOctave, drumPattern, complexity]
  );

  // Worker-Powered Generator: Full Beat (Simultaneous Promise.all Orchestrated in Worker)
  const generateFullBeat = useCallback(async () => {
    if (!workerClientRef.current) return;
    setBusy("all");
    setError("");
    try {
      const allData = await workerClientRef.current.generateAll({
        bpm,
        key,
        globalScale,
        complexity,
        bassStyle,
        bassOctave,
        drumStyle,
        drumPattern,
        melodyLayers: stateRef.current.melodyLayers.map((l) => ({
          id: l.id,
          style: l.style,
          key: l.key,
          scale: l.scale,
          muted: l.muted,
        })),
      });

      setBass(allData.bass);
      setDrums(allData.drums);
      setMelodyLayers((prev) =>
        prev.map((l) => {
          const found = allData.melodyResults.find((m) => m.layerId === l.id);
          return found ? { ...l, result: found.result } : l;
        })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar beat completo.");
    } finally {
      setBusy(null);
    }
  }, [bassStyle, drumStyle, bpm, key, globalScale, bassOctave, drumPattern, complexity]);

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
    const updatedHits = drums.hits.filter((h) => h.step !== stepIdx);
    if (currentHits.length === 0) updatedHits.push({ step: stepIdx, drum: "kick", velocity: 95 });
    else if (currentHits.some((h) => h.drum === "kick")) updatedHits.push({ step: stepIdx, drum: "snare", velocity: 95 });
    else if (currentHits.some((h) => h.drum === "snare")) updatedHits.push({ step: stepIdx, drum: "hat", velocity: 75 });
    setDrums({ ...drums, hits: updatedHits.sort((a, b) => a.step - b.step) });
  };

  // Export MIDI (Processed in Worker with Zero-Copy ArrayBuffer Transfer)
  const handleExportMidi = async () => {
    if (!workerClientRef.current) return;
    setError("");
    try {
      const result = await workerClientRef.current.exportMidi({
        bpm,
        melodyLayers: stateRef.current.melodyLayers,
        bass: stateRef.current.bass,
        drums: stateRef.current.drums,
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
        bass: muteBass ? null : bass,
        drums: muteDrums ? null : drums,
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

  // Lifecycle Initialization & Worker Cleanup
  useEffect(() => {
    const engine = audioEngineRef.current;
    workerClientRef.current = new StudioWorkerClient();

    // Trigger initial generation
    generateFullBeat();

    return () => {
      engine.stop();
      if (workerClientRef.current) {
        workerClientRef.current.terminate();
        workerClientRef.current = null;
      }
    };
  }, [generateFullBeat]);

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

  const hasAnyData = melodyLayers.some((l) => l.result) || bass !== null || drums !== null;

  if (!isClient) {
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
          1. TOPBAR
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

            {/* EXPORT BUTTONS */}
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
              <IconMelody size={24} />
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
              busy={busy}
              onUpdate={updateLayer}
              onGenerate={generateMelodyLayer}
              onRemove={removeMelodyLayer}
              onToggleStep={toggleMelodyStep}
              registerContainer={registerContainer}
              registerPlayhead={registerPlayhead}
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
