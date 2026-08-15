import type { ArtistPresetId, ScaleId, StyleId } from "./types";

export interface StylePreset {
  label: string;
  bpm: [number, number];
  scale: number[];
  kick: number[];
  snare: number[];
  hat: number[];
}

// 1. Escalas Musicais (semelhante ao FL Studio Scale Helper)
export const SCALES: Record<ScaleId, { label: string; intervals: number[]; description: string }> = {
  "natural-minor": {
    label: "Menor Natural (Aeolian)",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: "Emocional, melancólico, a base do Trap e R&B clássico",
  },
  "harmonic-minor": {
    label: "Menor Harmônica",
    intervals: [0, 2, 3, 5, 7, 8, 11],
    description: "Tensão, mistério, épico, vibe Travis Scott & UK Drill",
  },
  "pentatonic-minor": {
    label: "Pentatônica Menor",
    intervals: [0, 3, 5, 7, 10],
    description: "Garante melodias sem notas erradas, muito usada no Trap BR e Funk",
  },
  "natural-major": {
    label: "Maior Natural (Ionian)",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: "Alegre, uplifting, Pop, Afrobeat e Amapiano",
  },
  "pentatonic-major": {
    label: "Pentatônica Maior",
    intervals: [0, 2, 4, 7, 9],
    description: "Suave, melódico, R&B moderno e pop melodias",
  },
  "dorian": {
    label: "Dórica",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description: "Jazz, soul, Hip Hop anos 90 e Boom Bap elegante",
  },
  "phrygian": {
    label: "Frígia",
    intervals: [0, 1, 3, 5, 7, 8, 10],
    description: "Sombrio, tensão oriental, Trap pesado e Drill agressivo",
  },
  "blues": {
    label: "Escala Blues",
    intervals: [0, 3, 5, 6, 7, 10],
    description: "Com blue note (5b), peso orgânico e punch",
  },
};

// 2. Presets de Artistas & Músicas Conhecidas (Akon, Travis, Drake, etc.)
export interface ArtistPresetConfig {
  label: string;
  artist: string;
  songRef: string;
  key: string;
  scale: ScaleId;
  bpm: number;
  style: StyleId;
  complexity: number;
  description: string;
}

export const ARTIST_PRESETS: Record<ArtistPresetId, ArtistPresetConfig> = {
  "custom": {
    label: "Configuração Manual (Livre)",
    artist: "Personalizado",
    songRef: "Crie sua própria vibe",
    key: "C",
    scale: "natural-minor",
    bpm: 140,
    style: "trap-br",
    complexity: 3,
    description: "Ajuste livre de tom, BPM e estilo.",
  },
  "akon-lonely": {
    label: "Akon Vibe (Smack That / Lonely)",
    artist: "Akon",
    songRef: "Smack That · Lonely · Right Now",
    key: "C#",
    scale: "natural-minor",
    bpm: 128,
    style: "hip-hop",
    complexity: 3,
    description: "Melodia emotiva com hook marcante e ritmo envolvente R&B/Hip-Hop.",
  },
  "travis-sicko": {
    label: "Travis Scott (Sicko Mode / Rodeo)",
    artist: "Travis Scott",
    songRef: "Sicko Mode · Antidote · Goosebumps",
    key: "F#",
    scale: "harmonic-minor",
    bpm: 142,
    style: "trap-usa",
    complexity: 4,
    description: "Tensão harmônica sombria com 808 agressivo e synths psicodélicos.",
  },
  "drake-night": {
    label: "Drake / OVO (God's Plan / Hotline)",
    artist: "Drake",
    songRef: "God's Plan · Nonstop · Passionfruit",
    key: "E",
    scale: "natural-minor",
    bpm: 135,
    style: "trap-usa",
    complexity: 3,
    description: "Vibe noturna melódica, pads atmosféricos e graves encorpados.",
  },
  "metro-cinematic": {
    label: "Metro Boomin (Heroes & Villains)",
    artist: "Metro Boomin",
    songRef: "Creepin · Superhero · Ric Flair Drip",
    key: "D",
    scale: "natural-minor",
    bpm: 144,
    style: "trap-usa",
    complexity: 4,
    description: "808 cinematográfico afinado com plucks e sinos marcantes.",
  },
  "post-rockstar": {
    label: "Post Malone (Rockstar / Circles)",
    artist: "Post Malone",
    songRef: "Rockstar · Circles · Sunflower",
    key: "G",
    scale: "pentatonic-minor",
    bpm: 158,
    style: "trap-usa",
    complexity: 3,
    description: "Progressão melódica pegajosa e ritmo dinâmico para refrões.",
  },
  "matue-trapbr": {
    label: "Matuê & Kayblack (Trap BR Nacional)",
    artist: "Matuê / Kayblack",
    songRef: "Kenny G · Anos Luz · Conexões",
    key: "A",
    scale: "pentatonic-minor",
    bpm: 130,
    style: "trap-br",
    complexity: 3,
    description: "Lead com notas expressivas, 808 deslizando e hi-hats rápidos.",
  },
  "funk-mandelao": {
    label: "MC Hariel & DJ Boy (Funk SP Consciente)",
    artist: "MC Hariel / DJ Boy",
    songRef: "Ilusão · O Fim É Triste · Mandelão",
    key: "F",
    scale: "pentatonic-minor",
    bpm: 130,
    style: "funk",
    complexity: 3,
    description: "Tamborzão 4x4 no tempo com caixas sincopadas e baixo pulsante.",
  },
  "kabza-amapiano": {
    label: "Kabza De Small (Amapiano Chords)",
    artist: "Kabza De Small / DJ Maphorisa",
    songRef: "Asibe Happy · Sponono",
    key: "F#",
    scale: "natural-major",
    bpm: 114,
    style: "amapiano",
    complexity: 3,
    description: "Acordes maiores e 7ª no piano/pad com log-drums característicos.",
  },
  "reggae-bob": {
    label: "Reggae Roots (Bob Marley)",
    artist: "Bob Marley",
    songRef: "Is This Love · Jamming",
    key: "A",
    scale: "natural-minor",
    bpm: 75,
    style: "hip-hop",
    complexity: 2,
    description: "Vibe positiva, contratempo marcante e melodias suaves estilo Reggae.",
  },
  "para-melody": {
    label: "Melody do Pará (Tecnobrega)",
    artist: "Música do Pará",
    songRef: "Aquele 2 por 1",
    key: "E",
    scale: "natural-minor",
    bpm: 165,
    style: "funk",
    complexity: 4,
    description: "BPM acelerado, batida marcante do Norte e synth leads penetrantes.",
  },
};

// 3. Estilos Base
export const STYLES: Record<StyleId, StylePreset> = {
  "trap-br": {
    label: "Trap BR",
    bpm: [120, 150],
    scale: [0, 2, 3, 5, 7, 8, 10],
    kick: [0, 6, 10, 14],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  "trap-uk": {
    label: "Trap UK",
    bpm: [132, 146],
    scale: [0, 2, 3, 5, 7, 9, 10],
    kick: [0, 5, 9, 11, 15],
    snare: [4, 12],
    hat: [0, 2, 3, 6, 8, 10, 11, 14],
  },
  "trap-usa": {
    label: "Trap EUA",
    bpm: [130, 160],
    scale: [0, 2, 3, 5, 7, 8, 11],
    kick: [0, 7, 10, 15],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  "hip-hop": {
    label: "Hip Hop",
    bpm: [85, 100],
    scale: [0, 2, 3, 5, 7, 9, 10],
    kick: [0, 8, 10],
    snare: [4, 12],
    hat: [0, 4, 8, 12],
  },
  "funk": {
    label: "Funk",
    bpm: [128, 150],
    scale: [0, 3, 5, 7, 10],
    kick: [0, 4, 8, 12],
    snare: [2, 6, 10, 14],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  "amapiano": {
    label: "Amapiano",
    bpm: [110, 118],
    scale: [0, 2, 4, 5, 7, 9, 11],
    kick: [0, 4, 10],
    snare: [6, 14],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
  },
};

export const KEYS: Record<string, number> = {
  C: 60, "C#": 61, D: 62, "D#": 63, E: 64, F: 65,
  "F#": 66, G: 67, "G#": 68, A: 69, "A#": 70, B: 71,
};
