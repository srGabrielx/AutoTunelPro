import { makeSeed, rng } from "../music/random.ts";
import { KEYS } from "../music/styles.ts";
import type { BassNote, BassResult, GenerateOptions } from "../music/types.ts";
import { buildCompositionPlan, type CompositionPlan } from "../music/composition-plan.ts";

function clampSubBassPitch(pitch: number): number {
  let p = pitch;
  while (p > 42) {
    p -= 12;
  }
  while (p < 24) {
    p += 12;
  }
  return p;
}

export function generateBass(options: GenerateOptions): BassResult {
  const seed = makeSeed(options.seed);
  const random = rng(seed);
  
  const plan: CompositionPlan = options.compositionPlan ?? buildCompositionPlan(options, random);

  const rootMidi = KEYS[plan.key] ?? 60;
  const octaveOffset = options.bassOctave ?? -24;
  const bassRoot = rootMidi + octaveOffset;

  const comp = Math.min(5, Math.max(1, options.complexity || 3));
  const notes: BassNote[] = [];

  for (let bar = 0; bar < plan.timeline.bars; bar++) {
    const barStart = bar * plan.timeline.stepsPerBar;
    
    for (let beat = 0; beat < 4; beat++) {
      const beatStart = barStart + (beat * 4);
      
      const region = plan.harmonicGrid.find(r => r.startStep <= beatStart && r.endStep > beatStart) 
                     ?? plan.harmonicGrid[0];
                     
      // The exact root of the current chord
      const chordRootTone = region.chordDegrees[0];

      // Bass anchors itself to strong beats
      const anchor = plan.rhythmicAnchors.find(a => a.step === beatStart);
      const isStrongAnchor = anchor && anchor.type === "downbeat";

      if (isStrongAnchor || (anchor && random() < anchor.weight * (comp / 3))) {
        const isSlide = comp >= 3 && random() > 0.7;
        const duration = isSlide ? 1 : (comp >= 3 && random() > 0.5 ? 3 : 2);

        notes.push({
          step: beatStart,
          note: clampSubBassPitch(bassRoot + chordRootTone),
          velocity: Math.round(82 + (anchor ? anchor.weight * 18 : 8) + (random() * 8 - 4)),
          duration,
          slide: isSlide,
        });
      }

      // Syncopations / Ghost notes
      if (comp >= 3) {
        // Find syncopation anchors in this beat
        const syncAnchors = plan.rhythmicAnchors.filter(a => a.step > beatStart && a.step < beatStart + 4 && a.type === "syncopation");
        
        for (const sa of syncAnchors) {
          if (!notes.some(n => n.step === sa.step) && random() < sa.weight * (comp / 5)) {
            notes.push({
              step: sa.step,
              note: clampSubBassPitch(bassRoot + chordRootTone),
              velocity: Math.round(70 + (sa.weight * 14)),
              duration: 1,
              slide: random() > 0.7,
            });
          }
        }
      }
    }
  }

  // Ensure at least step 0 has a strong root if empty
  if (!notes.some((n) => n.step === 0)) {
    const firstRegion = plan.harmonicGrid[0];
    notes.unshift({
      step: 0,
      note: clampSubBassPitch(bassRoot + firstRegion.chordDegrees[0]),
      velocity: 96,
      duration: 3,
    });
  }

  return {
    engine: "bass",
    seed,
    style: options.style,
    bpm: options.bpm,
    key: options.key || "C",
    scale: options.scale,
    octaveOffset,
    notes: notes.sort((a, b) => a.step - b.step),
  };
}
