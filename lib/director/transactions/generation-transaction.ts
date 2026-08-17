import type { CompositionState } from '../../core/state/composition.ts';
import type { CompositionCommand } from '../command-bus/commands.ts';
import type { CommandResult, DispatchOutcome } from '../command-bus/command-bus.ts';
import { resolveContext } from '../context/resolver.ts';
import { createGenerationPlan } from '../planner/index.ts';
import { generateArrangement } from '../../engines/arrangement/index.ts';
import { generateHarmony } from '../../engines/harmony/index.ts';
import { generateBass } from '../../engines/bass/index.ts';
import { generateMelody } from '../../engines/melody/index.ts';
import { generateDrums } from '../../engines/drums/index.ts';
import { generateVariation } from '../../engines/variation/index.ts';
import { deriveSeed } from '../../core/seeds/namespace.ts';
import { calculateMetrics } from '../../engines/metrics/index.ts';
import { validateMetrics } from '../../engines/validator/index.ts';
import { runRepairEngine } from '../../engines/repair/index.ts';

export async function executeTransaction(
  command: CompositionCommand,
  state: CompositionState,
  enginesToRun: string[],
  invalidatedDomains: string[]
): Promise<DispatchOutcome> {

  if (command.expectedRevision !== state.revision) {
    return {
      state, 
      result: {
        requestId: command.requestId,
        command: command.type,
        revisionBefore: state.revision,
        revisionAfter: state.revision,
        invalidatedDomains: [],
        enginesExecuted: [],
        status: 'REVISION_CONFLICT',
        expectedRevision: command.expectedRevision,
        actualRevision: state.revision
      }
    };
  }

  const draftState: CompositionState = JSON.parse(JSON.stringify(state));

  if (command.type === 'SET_BPM') draftState.context.bpm = command.bpm;
  if (command.type === 'SET_KEY') draftState.context.key = command.key;
  if (command.type === 'SET_SCALE') draftState.context.scale = command.scale;
  if (command.type === 'LOCK_LAYER') draftState.locks[command.layer] = true;
  if (command.type === 'UNLOCK_LAYER') draftState.locks[command.layer] = false;

  const actualEnginesRun: string[] = [];
  
  try {
    const presetInput = draftState.context.preset as any;
    const sectionMock = { id: 's1', type: 'verse' as const, energyMultiplier: 1.0, densityMultiplier: 1.0 };
    const arrSec = draftState.structure?.sections?.[0];
    const sectionContext = arrSec ? {
      id: arrSec.id,
      type: arrSec.type as any,
      energyMultiplier: arrSec.energy,
      densityMultiplier: arrSec.density
    } : sectionMock;
    
    const resolvedContext = resolveContext(presetInput, {
      bpm: draftState.context.bpm,
      key: draftState.context.key,
      scale: draftState.context.scale
    }, sectionContext, draftState);

    const plan = createGenerationPlan(resolvedContext);
    draftState.plan = plan;

    // --- 4.1 Arrangement (Timeline Definition) ---
    if (command.type === 'GENERATE_ARRANGEMENT' || !draftState.structure.sections || draftState.structure.sections.length === 0) {
      draftState.structure = generateArrangement(plan, draftState.identity.generationId);
      actualEnginesRun.push('arrangement');
    }

    // --- Increment variation index once per layer if regenerated ---
    if (command.type === 'REGENERATE_LAYER' || command.type === 'GENERATE_VARIATION' || command.type === 'GENERATE_ARRANGEMENT') {
      if (enginesToRun.includes('harmony') && !draftState.locks.harmony) draftState.layers.harmony.variationIndex += 1;
      if (enginesToRun.includes('bass') && !draftState.locks.bass) draftState.layers.bass.variationIndex += 1;
      if (enginesToRun.includes('melody') && !draftState.locks.melody) draftState.layers.melody.variationIndex += 1;
      if (enginesToRun.includes('drums') && !draftState.locks.drums) draftState.layers.drums.variationIndex += 1;
    }

    // --- Prepare collections ---
    const newHarmonyBlocks = [];
    const newBassEvents = [];
    const newMelodyEvents = [];
    const newDrumsEvents = [];

    // --- 5.1 HARMONY CASCADE ROOT ---
    // Generate all harmony FIRST because Bass depends on it
    if (enginesToRun.includes('harmony') && !draftState.locks.harmony) {
      for (const section of draftState.structure.sections) {
        const secSeed = deriveSeed(draftState.identity.generationId, section.id);
        const layerSeed = deriveSeed(secSeed, `harmony:${draftState.layers.harmony.variationIndex}`);
        const blocks = generateHarmony(plan, draftState, layerSeed, section.startTick, section.durationTicks);
        newHarmonyBlocks.push(...blocks);
      }
      draftState.layers.harmony.blocks = newHarmonyBlocks;
      actualEnginesRun.push('harmony');
    }

    // --- 5.2 OTHER ENGINES ---
    for (const section of draftState.structure.sections) {
      const { id: sectionId, startTick, durationTicks, inheritFrom, mutationBudget } = section;
      const secSeed = deriveSeed(draftState.identity.generationId, sectionId);

      // --- BASS ---
      if (enginesToRun.includes('bass') && !draftState.locks.bass) {
        const layerSeed = deriveSeed(secSeed, `bass:${draftState.layers.bass.variationIndex}`);
        if (inheritFrom && mutationBudget !== undefined && command.type !== 'GENERATE_ARRANGEMENT') {
          const sourceSection = draftState.structure.sections.find(s => s.id === inheritFrom);
          if (sourceSection) {
            const sourceEvents = state.layers.bass.events.filter(e => e.tick >= sourceSection.startTick && e.tick < sourceSection.startTick + sourceSection.durationTicks);
            const variation = generateVariation({
              sourceEvents, mutationBudget, sourceSectionStartTick: sourceSection.startTick,
              targetSectionStartTick: startTick, layer: 'bass', variationSeedNamespace: layerSeed
            });
            newBassEvents.push(...variation);
          } else {
            newBassEvents.push(...generateBass(plan, draftState, layerSeed, startTick, durationTicks));
          }
        } else {
          newBassEvents.push(...generateBass(plan, draftState, layerSeed, startTick, durationTicks));
        }
        if (!actualEnginesRun.includes('bass')) actualEnginesRun.push('bass');
      }

      // --- MELODY ---
      if (enginesToRun.includes('melody') && !draftState.locks.melody) {
        const layerSeed = deriveSeed(secSeed, `melody:${draftState.layers.melody.variationIndex}`);
        if (inheritFrom && mutationBudget !== undefined && command.type !== 'GENERATE_ARRANGEMENT') {
          const sourceSection = draftState.structure.sections.find(s => s.id === inheritFrom);
          if (sourceSection) {
            const sourceEvents = state.layers.melody.events.filter(e => e.tick >= sourceSection.startTick && e.tick < sourceSection.startTick + sourceSection.durationTicks);
            const variation = generateVariation({
              sourceEvents, mutationBudget, sourceSectionStartTick: sourceSection.startTick,
              targetSectionStartTick: startTick, layer: 'melody', variationSeedNamespace: layerSeed
            });
            newMelodyEvents.push(...variation);
          } else {
            newMelodyEvents.push(...generateMelody(plan, draftState, layerSeed, startTick, durationTicks));
          }
        } else {
          newMelodyEvents.push(...generateMelody(plan, draftState, layerSeed, startTick, durationTicks));
        }
        if (!actualEnginesRun.includes('melody')) actualEnginesRun.push('melody');
      }

      // --- DRUMS ---
      if (enginesToRun.includes('drums') && !draftState.locks.drums) {
        const layerSeed = deriveSeed(secSeed, `drums:${draftState.layers.drums.variationIndex}`);
        if (inheritFrom && mutationBudget !== undefined && command.type !== 'GENERATE_ARRANGEMENT') {
          const sourceSection = draftState.structure.sections.find(s => s.id === inheritFrom);
          if (sourceSection) {
            const sourceEvents = state.layers.drums.events.filter(e => e.tick >= sourceSection.startTick && e.tick < sourceSection.startTick + sourceSection.durationTicks);
            const variation = generateVariation({
              sourceEvents, mutationBudget, sourceSectionStartTick: sourceSection.startTick,
              targetSectionStartTick: startTick, layer: 'drums', variationSeedNamespace: layerSeed
            });
            newDrumsEvents.push(...variation);
          } else {
            newDrumsEvents.push(...generateDrums(plan, draftState, layerSeed, startTick, durationTicks));
          }
        } else {
          newDrumsEvents.push(...generateDrums(plan, draftState, layerSeed, startTick, durationTicks));
        }
        if (!actualEnginesRun.includes('drums')) actualEnginesRun.push('drums');
      }
    }

    if (enginesToRun.includes('bass') && !draftState.locks.bass) draftState.layers.bass.events = newBassEvents;
    if (enginesToRun.includes('melody') && !draftState.locks.melody) draftState.layers.melody.events = newMelodyEvents;
    if (enginesToRun.includes('drums') && !draftState.locks.drums) draftState.layers.drums.events = newDrumsEvents;

    // --- 6. Quality Circuit (Metrics -> Validate -> Repair) ---
    let repairAttempts = 0;
    const MAX_REPAIR_ATTEMPTS = 3;
    let qualityStatus: 'PRISTINE' | 'DEGRADED' = 'PRISTINE';

    while (repairAttempts < MAX_REPAIR_ATTEMPTS) {
      const metrics = calculateMetrics(draftState, plan);
      const violations = validateMetrics(draftState, plan);
      
      draftState.metrics = {
        ...metrics,
        violations,
        repairAttempts,
        qualityStatus
      };

      if (violations.length === 0) {
        break; 
      }

      runRepairEngine(draftState, violations);
      repairAttempts++;
    }

    const finalViolations = validateMetrics(draftState, plan);
    if (finalViolations.length > 0) {
      // Check if any violation is blocking
      const blocking = finalViolations.find(v => v.severity >= 1.0);
      if (blocking) {
         throw new Error(`Blocking violation unresolved after ${MAX_REPAIR_ATTEMPTS} attempts: ${blocking.type}`);
      }
      qualityStatus = 'DEGRADED';
    }

    if (repairAttempts > 0) {
      draftState.metrics = {
        ...calculateMetrics(draftState, plan),
        violations: finalViolations,
        repairAttempts,
        qualityStatus
      };
    }

    // --- 7. Update Composition Memory ---
    if (!draftState.memory.global) {
      draftState.memory.global = { motifsIntroduced: 0, motifsReused: 0 };
    }
    draftState.memory.global.motifsIntroduced += 1; // Dummy stat for now to satisfy memory shape
    
    // --- 7. Commit Revision ---
    draftState.revision += 1;

    return {
      state: draftState,
      result: {
        requestId: command.requestId,
        command: command.type,
        revisionBefore: state.revision,
        revisionAfter: draftState.revision,
        invalidatedDomains,
        enginesExecuted: actualEnginesRun,
        status: actualEnginesRun.length === 0 && enginesToRun.length > 0 ? 'IGNORED_DUE_TO_LOCK' : 'COMMITTED'
      }
    };

  } catch (err: any) {
    console.error('[Transaction] Inner Error:', err);
    return {
      result: {
        requestId: command.requestId,
        command: command.type,
        revisionBefore: state.revision,
        revisionAfter: state.revision,
        status: 'FAILED',
        error: err.message ?? 'Unknown execution error',
        invalidatedDomains: [],
        enginesExecuted: []
      },
      state
    };
  }
}
