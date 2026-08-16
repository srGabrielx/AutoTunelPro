import { makeSeed, rng, pick } from "../music/random.ts";
import { KEYS, SCALES, STYLES } from "../music/styles.ts";
import type { GenerateOptions, MelodyResult, MelodyNote } from "../music/types.ts";
import { buildCompositionPlan, type CompositionPlan } from "../music/composition-plan.ts";
import { GENRE_MELODY_PROFILES } from "./melody-context.ts";

export function generateMelody(options: GenerateOptions): MelodyResult {
  const seed = makeSeed(options.seed);
  const random = rng(seed);

  // 1. Get or generate the CompositionPlan
  const plan: CompositionPlan = options.compositionPlan ?? buildCompositionPlan(options, random);
  const root = KEYS[plan.key] ?? 60;
  const scaleIntervals = SCALES[plan.scale]?.intervals ?? SCALES["pentatonic-minor"].intervals;
  const scaleSize = scaleIntervals.length;

  const profile = GENRE_MELODY_PROFILES[plan.style] ?? GENRE_MELODY_PROFILES["trap-br"];
  const comp = Math.min(5, Math.max(1, options.complexity || 3));

  const notes: MelodyNote[] = [];

  // Motif configuration
  const motifLength = pick(random, profile.motifLengths);
  const motifOffsets: number[] = [];
  
  // Rhythmic Motif Base (Step Offsets)
  for (let i = 0; i < motifLength; i++) {
    // Generate a simple rhythmic seed (0, 2, 4, etc.)
    motifOffsets.push(i * (random() > profile.syncopation ? 2 : 1));
  }

  // Generate phrases over the timeline
  for (let bar = 0; bar < plan.timeline.bars; bar++) {
    const barStart = bar * plan.timeline.stepsPerBar;

    for (let beat = 0; beat < 4; beat++) {
      const beatStart = barStart + (beat * 4);
      
      // Find current harmonic region for this beat
      const region = plan.harmonicGrid.find(r => r.startStep <= beatStart && r.endStep > beatStart) 
                     ?? plan.harmonicGrid[0];
                     
      const chordTones = region.chordDegrees;

      for (let i = 0; i < motifLength; i++) {
        // Evaluate rest probability
        if (beat > 0 && i > 0 && random() < profile.restProbability) {
          continue;
        }

        let step = beatStart + motifOffsets[i];
        if (step >= plan.timeline.totalSteps) continue;

        // Ensure no step collision
        while (notes.some(n => n.step === step)) {
          step++;
        }
        if (step >= plan.timeline.totalSteps) continue;

        // Note Role: Strong beats use chord tones, weak beats use scale passing tones
        const isStrongBeat = step % 4 === 0;
        let degree: number;

        if (isStrongBeat) {
          // Chord-tone
          degree = chordTones[Math.floor(random() * chordTones.length)] % scaleSize;
        } else {
          // Passing / Neighbor tone (from scale, preferably close to a chord tone)
          const baseTone = chordTones[Math.floor(random() * chordTones.length)];
          degree = (baseTone + (random() > 0.5 ? 1 : -1) + scaleSize) % scaleSize;
        }

        const interval = scaleIntervals[degree];
        const octaveOffset = random() > 0.8 ? 12 : 0;
        const midiNote = root + interval + octaveOffset;

        // Rhythmic Anchor velocity modifier
        const anchor = plan.rhythmicAnchors.find(a => a.step === step);
        const anchorWeight = anchor ? anchor.weight : 0.4;
        
        // Humanized velocity
        const baseVelocity = 60 + (anchorWeight * 40);
        const humanizedVelocity = Math.min(127, Math.max(0, Math.round(baseVelocity + (random() * 10 - 5))));
        
        const duration = random() > profile.longNoteProbability ? profile.durations[0] : profile.durations[1];

        notes.push({
          step,
          note: midiNote,
          velocity: humanizedVelocity,
          duration,
        });
      }

      // High complexity: add passing notes on syncopated weak beats
      if (comp >= 4 && random() > 0.6) {
        const weakStep = beatStart + (random() > 0.5 ? 1 : 3);
        if (weakStep < plan.timeline.totalSteps && !notes.some(n => n.step === weakStep)) {
          const passingDegree = Math.floor(random() * scaleSize);
          notes.push({
            step: weakStep,
            note: root + scaleIntervals[passingDegree],
            velocity: 60, // Lighter velocity for passing
            duration: 1,
          });
        }
      }
    }
  }

  // Voice Leading Filter (Limit Jumps)
  notes.sort((a, b) => a.step - b.step);
  for (let i = 1; i < notes.length; i++) {
    const prev = notes[i - 1].note;
    let curr = notes[i].note;
    const jump = Math.abs(curr - prev);
    
    if (jump > profile.maxJump) {
      if (curr > prev) curr -= 12;
      else curr += 12;
      notes[i].note = curr;
    }
  }

  return {
    engine: "melody",
    seed,
    style: options.style,
    bpm: options.bpm,
    key: options.key || "C",
    scale: options.scale,
    notes,
  };
}
