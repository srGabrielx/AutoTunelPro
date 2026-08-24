import { makeSeed, rng } from "../music/random.ts";
import { KEYS, SCALES } from "../music/styles.ts";
import type { BassNote, BassResult, GenerateOptions } from "../music/types.ts";
import { buildCompositionPlan, type CompositionPlan } from "../music/composition-plan.ts";

export function generateBass(options: GenerateOptions): BassResult {
  const seed = makeSeed(options.seed);
  const random = rng(seed);
  
  const plan: CompositionPlan = options.compositionPlan ?? buildCompositionPlan(options, random);

  const rootMidi = KEYS[plan.key] ?? 60;
  const octaveOffset = options.bassOctave ?? -24;

  const scaleDef = (options.scale && SCALES[options.scale]) 
    ? SCALES[options.scale] 
    : (plan.scale && SCALES[plan.scale]) 
    ? SCALES[plan.scale] 
    : SCALES["natural-minor"];
  const scaleIntervals = scaleDef.intervals;

  function getHarmonicBassNote(degree: number, addOctave = false): number {
    const wrappedDegree = ((degree % scaleIntervals.length) + scaleIntervals.length) % scaleIntervals.length;
    const interval = scaleIntervals[wrappedDegree];
    let midi = rootMidi + octaveOffset + interval + (addOctave ? 12 : 0);
    // Ideal 808 sub register: MIDI 33 (A0) to 50 (D2)
    while (midi < 33) midi += 12;
    while (midi > 50) midi -= 12;
    return midi;
  }

  const comp = Math.min(5, Math.max(1, options.complexity || 3));
  const harmonicTemperature = Math.min(1.0, Math.max(0.1, (comp - 0.5) / 4.5));
  const notes: BassNote[] = [];

  for (let bar = 0; bar < plan.timeline.bars; bar++) {
    const barStart = bar * plan.timeline.stepsPerBar;
    
    for (let beat = 0; beat < 4; beat++) {
      const beatStart = barStart + (beat * 4);
      
      const region = plan.harmonicGrid.find(r => r.startStep <= beatStart && r.endStep > beatStart) 
                     ?? plan.harmonicGrid[0];
                     
      // The exact root degree of the current chord
      const chordRootDegree = region.chordDegrees[0] ?? 0;
      const baseBassNote = getHarmonicBassNote(chordRootDegree, false);

      // Bass anchors itself firmly to strong beats
      const anchor = plan.rhythmicAnchors.find(a => a.step === beatStart);
      const isStrongAnchor = anchor && anchor.type === "downbeat";

      if (isStrongAnchor || (anchor && random() < anchor.weight * (comp / 3))) {
        const isSlide = harmonicTemperature >= 0.5 && random() > 0.7;
        const duration = isSlide ? 1 : (harmonicTemperature >= 0.4 && random() > 0.5 ? 3 : 2);

        notes.push({
          step: beatStart,
          note: baseBassNote,
          velocity: Math.round(90 + (anchor ? anchor.weight * 30 : 10) + (random() * 10 - 5)),
          duration,
          slide: isSlide,
        });
      }

      // Syncopations / Ghost notes
      if (harmonicTemperature >= 0.35) {
        // Find syncopation anchors in this beat
        const syncAnchors = plan.rhythmicAnchors.filter(a => a.step > beatStart && a.step < beatStart + 4 && a.type === "syncopation");
        
        for (const sa of syncAnchors) {
          if (!notes.some(n => n.step === sa.step) && random() < sa.weight * harmonicTemperature) {
            // Octave jumps or 5th jumps for syncopated accents
            const useFifth = random() > 0.6;
            const fifthDegree = (chordRootDegree + 4) % scaleIntervals.length;
            const accentNote = useFifth ? getHarmonicBassNote(fifthDegree, false) : getHarmonicBassNote(chordRootDegree, true);
            
            notes.push({
              step: sa.step,
              note: accentNote,
              velocity: Math.round(75 + (sa.weight * 20)),
              duration: 1,
              slide: random() > 0.65,
            });
          }
        }
      }
    }
  }

  // Ensure at least step 0 has a strong root if empty
  if (!notes.some((n) => n.step === 0)) {
    const firstRegion = plan.harmonicGrid[0];
    const firstDegree = firstRegion?.chordDegrees[0] ?? 0;
    notes.unshift({
      step: 0,
      note: getHarmonicBassNote(firstDegree, false),
      velocity: 110,
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
