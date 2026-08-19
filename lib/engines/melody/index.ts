import type { StrictGenerationPlan } from '../../director/planner/index.ts';
import type { CompositionState } from '../../core/state/composition.ts';
import type { MusicalEvent } from '../../core/events/index.ts';
import { createDeterministicEventId } from '../../core/events/index.ts';
import { DeterministicRNG } from '../../core/seeds/rng.ts';

/**
 * Melody Engine (Deterministic)
 * 
 * The engine acts purely as a mathematical algorithm without holding state.
 * It consumes the absolute authority (GenerationPlan) and predictable entropy (layerSeed).
 */
export function generateMelody(
  plan: StrictGenerationPlan,
  state: CompositionState, // Full state provided for reading context if needed
  layerSeed: string,
  startTick: number,
  durationTicks: number
): MusicalEvent[] {
  const rng = new DeterministicRNG(layerSeed);
  const events: MusicalEvent[] = [];
  
  // Strict numerical constraints mapped from the generation plan
  const { rhythmDensity, pitchRange, phraseLength } = plan.constraints;
  
  // Data-Driven: Density is clamped by the preset's melodyProfile
  const densityMin = plan.melodyProfile?.densityRange?.[0] ?? 0.3;
  const densityMax = plan.melodyProfile?.densityRange?.[1] ?? 0.7;
  const effectiveDensity = Math.min(densityMax, Math.max(densityMin, rhythmDensity));
  const numNotes = Math.max(1, Math.floor(phraseLength * effectiveDensity * 8)); 
<<<<<<< HEAD
=======
  console.log(`[Melody] Lote 4 Debug - numNotes: ${numNotes}, phraseLength: ${phraseLength}, density: ${effectiveDensity}, startTick: ${startTick}, endTick: ${startTick + durationTicks}`);
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2

  let currentTick = startTick;
  const endSectionTick = startTick + durationTicks;
  
  for (let i = 0; i < numNotes; i++) {
    if (currentTick >= endSectionTick) break;
    // 100% Deterministic decisions based on rng calls
    const notePitch = rng.nextInt(pitchRange[0], pitchRange[1]);
    const durationTicks = rng.nextInt(240, 960); // Quarter to whole note ticks
    const velocity = rng.nextInt(60, 127);
    
    // Gap affected continuously by syncopation profile
    const syncopation = plan.melodyProfile?.syncopation ?? 0.5;
    const maxGap = Math.max(120, Math.floor(960 * syncopation));
    const gap = rng.nextInt(0, maxGap);
    
    currentTick += gap;

    // Create unique payload hash for identity stability
    const payloadHash = `${notePitch}-${durationTicks}-${velocity}`;
    
    events.push({
      id: createDeterministicEventId('melody', currentTick, 'NOTE_ON', payloadHash),
      tick: currentTick,
      type: 'NOTE_ON',
      note: notePitch,
      velocity
    });

    events.push({
      id: createDeterministicEventId('melody', currentTick + durationTicks, 'NOTE_OFF', payloadHash),
      tick: currentTick + durationTicks,
      type: 'NOTE_OFF',
      note: notePitch
    });

    currentTick += durationTicks;
  }

  return events;
}
