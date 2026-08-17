import type { StrictGenerationPlan } from '../../director/planner/index.ts';
import type { CompositionState } from '../../core/state/composition.ts';
import type { MusicalEvent } from '../../core/events/index.ts';
import { createDeterministicEventId } from '../../core/events/index.ts';
import { DeterministicRNG } from '../../core/seeds/rng.ts';
import { deriveSeed } from '../../core/seeds/namespace.ts';

const DRUM_MAP = {
  KICK: 36,
  SNARE: 38,
  CLAP: 39,
  HAT_CLOSED: 42,
  HAT_OPEN: 46,
  PERCUSSION: 60
};

export function generateDrums(
  plan: StrictGenerationPlan,
  state: CompositionState,
  baseSeedNamespace: string,
  startTick: number,
  durationTicks: number
): MusicalEvent[] {
  const events: MusicalEvent[] = [];
  const { rhythmDensity } = plan.constraints;
  const endSectionTick = startTick + durationTicks;
  
  // Rule 4: Independent Namespaces - Isolating seeds per instrument
  const kickSeed = deriveSeed(baseSeedNamespace, 'drums:kick');
  const snareSeed = deriveSeed(baseSeedNamespace, 'drums:snare');
  const hatsSeed = deriveSeed(baseSeedNamespace, 'drums:hats');
  
  // --- 1. Kick Engine (Data-Driven) ---
  const kickRng = new DeterministicRNG(kickSeed);
  const kickDensityMult = plan.drumProfile?.kickDensity ?? 16;
  const numKicks = Math.max(1, Math.floor(kickDensityMult * rhythmDensity));
  let currentTick = startTick;
  for (let i = 0; i < numKicks; i++) {
    // Gap constrained by the profile
    const minGap = plan.drumProfile?.kickGapMin ?? 1;
    const maxGap = plan.drumProfile?.kickGapMax ?? 4;
    const gap = kickRng.nextInt(minGap, maxGap) * 240; 
    currentTick += gap;
    if (currentTick >= endSectionTick) break;
    
    // Humanization derived solely from RNG (Rule 13)
    const velocity = kickRng.nextInt(80, 127);
    
    const payloadHash = `kick-${i}-${gap}-${velocity}`;
    events.push({
      id: createDeterministicEventId('drums', currentTick, 'NOTE_ON', payloadHash),
      tick: currentTick,
      type: 'NOTE_ON',
      note: DRUM_MAP.KICK,
      velocity
    });
    events.push({
      id: createDeterministicEventId('drums', currentTick + 120, 'NOTE_OFF', payloadHash),
      tick: currentTick + 120,
      type: 'NOTE_OFF',
      note: DRUM_MAP.KICK
    });
  }

  // --- 2. Snare Engine (Data-Driven) ---
  const snareRng = new DeterministicRNG(snareSeed);
  const snareDensityMult = plan.drumProfile?.snareDensity ?? 8;
  const numSnares = Math.max(1, Math.floor(snareDensityMult * rhythmDensity));
  currentTick = startTick;
  for (let i = 0; i < numSnares; i++) {
    // Snares usually fall on backbeats, controlled by profile
    const minGap = plan.drumProfile?.snareGapMin ?? 2;
    const maxGap = plan.drumProfile?.snareGapMax ?? 4;
    const gap = snareRng.nextInt(minGap, maxGap) * 480;
    currentTick += gap;
    if (currentTick >= endSectionTick) break;
    const velocity = snareRng.nextInt(90, 127);
    
    const payloadHash = `snare-${i}-${gap}-${velocity}`;
    events.push({
      id: createDeterministicEventId('drums', currentTick, 'NOTE_ON', payloadHash),
      tick: currentTick,
      type: 'NOTE_ON',
      note: DRUM_MAP.SNARE,
      velocity
    });
    events.push({
      id: createDeterministicEventId('drums', currentTick + 120, 'NOTE_OFF', payloadHash),
      tick: currentTick + 120,
      type: 'NOTE_OFF',
      note: DRUM_MAP.SNARE
    });
  }

  // --- 3. Hats Engine (Data-Driven) ---
  const hatsRng = new DeterministicRNG(hatsSeed);
  const numHats = Math.max(8, Math.floor(64 * rhythmDensity));
  currentTick = startTick;
  for (let i = 0; i < numHats; i++) {
    const gap = hatsRng.nextInt(1, 2) * 120; // 16th notes or 8th notes
    currentTick += gap;
    if (currentTick >= endSectionTick) break;
    const velocity = hatsRng.nextInt(40, 110);
    
    // Subdivision rolls are gated by the drumProfile
    const rollThreshold = plan.drumProfile?.hatRollThreshold ?? 0.85;
    const isRoll = (plan.drumProfile?.hatRolls ?? true) && hatsRng.next() > rollThreshold && plan.energy > 0.6;
    
    const payloadHash = `hat-${i}-${gap}-${velocity}`;
    events.push({
      id: createDeterministicEventId('drums', currentTick, 'NOTE_ON', payloadHash),
      tick: currentTick,
      type: 'NOTE_ON',
      note: DRUM_MAP.HAT_CLOSED,
      velocity
    });
    events.push({
      id: createDeterministicEventId('drums', currentTick + 60, 'NOTE_OFF', payloadHash),
      tick: currentTick + 60,
      type: 'NOTE_OFF',
      note: DRUM_MAP.HAT_CLOSED
    });

    if (isRoll) {
      // 32nd note subdivision roll (60 ticks spacing)
      const rollPayloadHash = `hat-roll-${i}`;
      events.push({
        id: createDeterministicEventId('drums', currentTick + 60, 'NOTE_ON', rollPayloadHash),
        tick: currentTick + 60,
        type: 'NOTE_ON',
        note: DRUM_MAP.HAT_CLOSED,
        velocity: Math.floor(velocity * 0.8)
      });
      events.push({
        id: createDeterministicEventId('drums', currentTick + 120, 'NOTE_OFF', rollPayloadHash),
        tick: currentTick + 120,
        type: 'NOTE_OFF',
        note: DRUM_MAP.HAT_CLOSED
      });
      currentTick += 60;
    }
  }

  // Sort events chronologically to respect the composition flow
  return events.sort((a, b) => a.tick - b.tick);
}
