import type { BassDrive, DrumKitMode, MelodySynthType, StyleId } from "./types";

/**
 * High-Fidelity Synthesis Presets (Single Source of Truth)
 * Shared between Web Audio Live Transport and Worker DSP WAV Renderer.
 */

export interface DrumKitSynthConfig {
  hatInharmonicFreqs: number[];
  hatMetalRatio: number;
  hatNoiseRatio: number;
  hatFilterCutoff: number;
  openHatCutoff: number;
  snareBodyFreq: number;
  snareNoiseCutoff: number;
  clapCenterFreq: number;
  kickTransientFreq: number;
  kickSubFreq: number;
}

export const DRUM_KIT_SYNTH_CONFIGS: Record<DrumKitMode, DrumKitSynthConfig> = {
  "trap-808": {
    // Classic TR-808 inharmonic metallic square wave bank
    hatInharmonicFreqs: [245, 306, 384, 422, 659, 866],
    hatMetalRatio: 0.65,
    hatNoiseRatio: 0.35,
    hatFilterCutoff: 7500,
    openHatCutoff: 6200,
    snareBodyFreq: 185,
    snareNoiseCutoff: 3200,
    clapCenterFreq: 1400,
    kickTransientFreq: 175,
    kickSubFreq: 48,
  },
  "drill-punch": {
    // Sharp, crisp metallic frequencies with bright transient snap
    hatInharmonicFreqs: [290, 395, 480, 620, 780, 940],
    hatMetalRatio: 0.72,
    hatNoiseRatio: 0.28,
    hatFilterCutoff: 8200,
    openHatCutoff: 6800,
    snareBodyFreq: 210,
    snareNoiseCutoff: 4000,
    clapCenterFreq: 1550,
    kickTransientFreq: 195,
    kickSubFreq: 52,
  },
  "funk-tamborzao": {
    // Punchy acoustic/sampled simulation with warmer mids
    hatInharmonicFreqs: [220, 330, 440, 580, 720, 880],
    hatMetalRatio: 0.45,
    hatNoiseRatio: 0.55,
    hatFilterCutoff: 6800,
    openHatCutoff: 5600,
    snareBodyFreq: 225,
    snareNoiseCutoff: 2800,
    clapCenterFreq: 1300,
    kickTransientFreq: 165,
    kickSubFreq: 55,
  },
  "boom-bap": {
    // Gritty, vintage filtered character
    hatInharmonicFreqs: [205, 310, 415, 540, 690, 820],
    hatMetalRatio: 0.50,
    hatNoiseRatio: 0.50,
    hatFilterCutoff: 6000,
    openHatCutoff: 5200,
    snareBodyFreq: 195,
    snareNoiseCutoff: 2600,
    clapCenterFreq: 1250,
    kickTransientFreq: 150,
    kickSubFreq: 60,
  },
  "amapiano-log": {
    // Mellow percussion and organic shaker/woodblock hats
    hatInharmonicFreqs: [260, 370, 490, 610, 740, 910],
    hatMetalRatio: 0.35,
    hatNoiseRatio: 0.65,
    hatFilterCutoff: 6400,
    openHatCutoff: 5400,
    snareBodyFreq: 170,
    snareNoiseCutoff: 2400,
    clapCenterFreq: 1350,
    kickTransientFreq: 140,
    kickSubFreq: 46,
  },
};

export interface MelodySynthVoiceConfig {
  voiceCount: number;
  detuneCents: number;
  gainCompensation: number; // 1 / Math.sqrt(voiceCount)
  filterStartCutoff: number;
  filterEndCutoff: number;
  filterQ: number;
  decayExp: number;
  osc1Type: OscillatorType;
  osc2Type: OscillatorType;
  baseVol: number;
}

export function getMelodySynthConfig(synthType: MelodySynthType, style: StyleId = "trap-br"): MelodySynthVoiceConfig {
  const isDarkTrap = style === "trap-uk" || style === "trap-usa" || style === "trap-br";
  const voiceCount = 2;
  const gainCompensation = 1 / Math.sqrt(voiceCount); // ~0.707

  switch (synthType) {
    case "lead":
      return {
        voiceCount,
        detuneCents: isDarkTrap ? 9 : 7,
        gainCompensation,
        filterStartCutoff: 3600,
        filterEndCutoff: 400,
        filterQ: 2.4,
        decayExp: 4.8,
        osc1Type: "sawtooth",
        osc2Type: "sawtooth",
        baseVol: 0.23,
      };
    case "pad":
      return {
        voiceCount,
        detuneCents: 10,
        gainCompensation,
        filterStartCutoff: 2000,
        filterEndCutoff: 320,
        filterQ: 1.6,
        decayExp: 2.0,
        osc1Type: "sawtooth",
        osc2Type: "triangle",
        baseVol: 0.27,
      };
    case "pluck":
      return {
        voiceCount,
        detuneCents: 5,
        gainCompensation,
        filterStartCutoff: 4800,
        filterEndCutoff: 400,
        filterQ: 3.8,
        decayExp: 6.8,
        osc1Type: "sawtooth",
        osc2Type: "sine",
        baseVol: 0.25,
      };
    case "arp":
      return {
        voiceCount,
        detuneCents: 6,
        gainCompensation,
        filterStartCutoff: 3600,
        filterEndCutoff: 420,
        filterQ: 2.8,
        decayExp: 5.2,
        osc1Type: "sawtooth",
        osc2Type: "sawtooth",
        baseVol: 0.23,
      };
  }
}

export interface Bass808SynthConfig {
  cleanSubGain: number;      // Preserves pure fundamental for physical subwoofers
  parallelSatGain: number;   // Upper harmonic saturation for mobile/small speakers
  pitchDiveStartMultiplier: number;
  pitchDiveDurationSec: number;
}

export const BASS_808_CONFIGS: Record<BassDrive, Bass808SynthConfig> = {
  clean: {
    cleanSubGain: 0.92,
    parallelSatGain: 0.08,
    pitchDiveStartMultiplier: 1.35,
    pitchDiveDurationSec: 0.020,
  },
  warm: {
    cleanSubGain: 0.78,
    parallelSatGain: 0.38,
    pitchDiveStartMultiplier: 1.45,
    pitchDiveDurationSec: 0.024,
  },
  overdrive: {
    cleanSubGain: 0.62,
    parallelSatGain: 0.52,
    pitchDiveStartMultiplier: 1.55,
    pitchDiveDurationSec: 0.028,
  },
};

export const MASTER_BUS_CONFIG = {
  dcBlockerR: 0.995,
  softClipThreshold: 0.82,
  peakCeiling: 0.89125, // -1.0 dBFS to prevent inter-sample clipping and ensure safe headroom
};
