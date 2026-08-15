import type { BassResult, DrumResult, MelodyLayer } from "../music/types";

// Helper to write string to DataView
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Convert AudioBuffer to 16-bit PCM WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * numChannels * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(wavBuffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, "WAVE");

  // FMT sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // DATA sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, length, true);

  // Interleave audio channels and convert to 16-bit signed PCM
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Convert float [-1.0, 1.0] to 16-bit signed int [-32768, 32767]
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

export async function renderAndDownloadWav({
  bpm,
  melodyLayers,
  bass,
  drums,
  loops = 2,
  filename = "AutoTunel-Master.wav",
}: {
  bpm: number;
  melodyLayers?: MelodyLayer[];
  bass?: BassResult | null;
  drums?: DrumResult | null;
  loops?: number;
  filename?: string;
}) {
  const sampleRate = 44100;
  const stepDuration = 60 / bpm / 4;
  const barDuration = stepDuration * 16;
  const totalDuration = barDuration * loops + 0.8; // include reverb / release tail

  const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * totalDuration), sampleRate);

  // Master Limiter / Compressor Node
  const masterComp = offlineCtx.createDynamicsCompressor();
  masterComp.threshold.value = -12;
  masterComp.knee.value = 10;
  masterComp.ratio.value = 4;
  masterComp.attack.value = 0.003;
  masterComp.release.value = 0.15;
  masterComp.connect(offlineCtx.destination);

  // Delay Send for Melody
  const delay = offlineCtx.createDelay();
  delay.delayTime.value = stepDuration * 1.5;
  const delayGain = offlineCtx.createGain();
  delayGain.gain.value = 0.22;
  delay.connect(delayGain);
  delayGain.connect(delay);
  delayGain.connect(masterComp);

  for (let loop = 0; loop < loops; loop++) {
    const loopOffset = loop * barDuration;

    // 1. Synthesize Melody Layers
    const activeLayers = (melodyLayers ?? []).filter(
      (l) => !l.muted && l.result && l.result.notes.length > 0
    );
    const layerVolScale = activeLayers.length > 1 ? 0.7 / activeLayers.length : 1;

    activeLayers.forEach((layer) => {
      layer.result!.notes.forEach((note) => {
        const when = loopOffset + note.step * stepDuration;
        const freq = 440 * Math.pow(2, (note.note - 69) / 12);
        const durationSec = stepDuration * (note.duration || 1) * 0.92;
        const vol = (note.velocity / 127) * 0.24 * layerVolScale;

        const osc1 = offlineCtx.createOscillator();
        const osc2 = offlineCtx.createOscillator();
        const filter = offlineCtx.createBiquadFilter();
        const gain = offlineCtx.createGain();

        osc1.type = layer.synthType === "pad" ? "triangle" : "sawtooth";
        osc1.frequency.setValueAtTime(freq, when);

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(freq * 1.002, when);

        filter.type = "lowpass";
        const cutoff = layer.synthType === "pad" ? 1800 : layer.synthType === "pluck" ? 4200 : 3200;
        filter.frequency.setValueAtTime(cutoff, when);
        filter.frequency.exponentialRampToValueAtTime(500, when + durationSec);
        filter.Q.value = layer.synthType === "pluck" ? 5.0 : 3.0;

        gain.gain.setValueAtTime(vol, when);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(masterComp);
        gain.connect(delay);

        osc1.start(when);
        osc2.start(when);
        osc1.stop(when + durationSec + 0.05);
        osc2.stop(when + durationSec + 0.05);
      });
    });

    // 2. Synthesize 808 Bass
    if (bass) {
      bass.notes.forEach((note) => {
        const when = loopOffset + note.step * stepDuration;
        const rootFreq = 440 * Math.pow(2, (note.note - 69) / 12);
        const durationSec = stepDuration * (note.duration || 2);
        const vol = (note.velocity / 127) * 0.48;

        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        const dist = offlineCtx.createWaveShaper();

        // Subtle soft-clipping curve for 808 warmth
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const x = (i * 2) / 256 - 1;
          curve[i] = (Math.PI + 3) * x / (Math.PI + 3 * Math.abs(x));
        }
        dist.curve = curve;

        osc.type = "sine";
        // Pitch envelope
        osc.frequency.setValueAtTime(rootFreq * 1.8, when);
        osc.frequency.exponentialRampToValueAtTime(rootFreq, when + 0.06);

        if (note.slide) {
          osc.frequency.exponentialRampToValueAtTime(rootFreq * 1.5, when + durationSec * 0.8);
        }

        gain.gain.setValueAtTime(vol, when);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);

        osc.connect(dist);
        dist.connect(gain);
        gain.connect(masterComp);

        osc.start(when);
        osc.stop(when + durationSec + 0.05);
      });
    }

    // 3. Synthesize Drums
    if (drums) {
      drums.hits.forEach((hit) => {
        const when = loopOffset + hit.step * stepDuration;

        if (hit.drum === "kick") {
          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(160, when);
          osc.frequency.exponentialRampToValueAtTime(46, when + 0.08);

          const vol = (hit.velocity / 127) * 0.44;
          gain.gain.setValueAtTime(vol, when);
          gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.35);

          osc.connect(gain);
          gain.connect(masterComp);
          osc.start(when);
          osc.stop(when + 0.36);
        } else if (hit.drum === "snare") {
          const dur = 0.14;
          const noiseBuffer = offlineCtx.createBuffer(1, Math.ceil(sampleRate * dur), sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

          const noise = offlineCtx.createBufferSource();
          noise.buffer = noiseBuffer;

          const filter = offlineCtx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 1600;

          const gain = offlineCtx.createGain();
          const vol = (hit.velocity / 127) * 0.36;
          gain.gain.setValueAtTime(vol, when);
          gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterComp);

          noise.start(when);

          // Snare tonal body
          const osc = offlineCtx.createOscillator();
          const tGain = offlineCtx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(185, when);
          osc.frequency.exponentialRampToValueAtTime(85, when + 0.08);
          tGain.gain.setValueAtTime(vol * 0.7, when);
          tGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);

          osc.connect(tGain);
          tGain.connect(masterComp);
          osc.start(when);
          osc.stop(when + 0.1);
        } else if (hit.drum === "open-hat") {
          const dur = 0.22;
          const noiseBuffer = offlineCtx.createBuffer(1, Math.ceil(sampleRate * dur), sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

          const noise = offlineCtx.createBufferSource();
          noise.buffer = noiseBuffer;

          const filter = offlineCtx.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.value = 6500;

          const gain = offlineCtx.createGain();
          const vol = (hit.velocity / 127) * 0.22;
          gain.gain.setValueAtTime(vol, when);
          gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterComp);

          noise.start(when);
        } else {
          // Closed Hat
          const dur = 0.04;
          const noiseBuffer = offlineCtx.createBuffer(1, Math.ceil(sampleRate * dur), sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

          const noise = offlineCtx.createBufferSource();
          noise.buffer = noiseBuffer;

          const filter = offlineCtx.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.value = 7500;

          const gain = offlineCtx.createGain();
          const vol = (hit.velocity / 127) * 0.18;
          gain.gain.setValueAtTime(vol, when);
          gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterComp);

          noise.start(when);
        }
      });
    }
  }

  // Render to audio buffer
  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer);

  // Trigger download
  const url = URL.createObjectURL(wavBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
