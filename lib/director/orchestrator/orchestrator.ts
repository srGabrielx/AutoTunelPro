import type { CompositionCommand } from '../command-bus/commands.ts';
import type { DispatchOutcome } from '../command-bus/command-bus.ts';
import type { CompositionState } from '../../core/state/composition.ts';
import { getAffectedDomains, resolveEnginesToRun } from '../dependency-graph/dependency-graph.ts';
import { executeTransaction } from '../transactions/generation-transaction.ts';

/**
 * Orchestrator
 * Coordinates what needs to happen without actually composing music.
 * It determines WHO is affected and dispatches the ATOMIC transaction.
 */
export async function handleCommand(
  command: CompositionCommand,
  state: CompositionState
): Promise<DispatchOutcome> {
  // Determine specific engines to run based on the generic domain
  const targetLayer = 'layer' in command ? command.layer : undefined;

  // Determine affected domains based strictly on semantic dependency graph
  const invalidatedDomains = getAffectedDomains(command.type, targetLayer);
  
  const enginesToRun = resolveEnginesToRun(invalidatedDomains, targetLayer);

  // Send to atomic transaction boundary
  // The Orchestrator DOES NOT run engines directly. It delegates to the Transaction.
  return await executeTransaction(command, state, enginesToRun, invalidatedDomains);
}
