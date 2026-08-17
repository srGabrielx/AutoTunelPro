import type { CompositionCommand } from './commands.ts';
import type { CompositionState } from '../../core/state/composition.ts';
import { handleCommand } from '../orchestrator/orchestrator.ts';

export interface CommandResult {
  requestId: string;
  command: string;
  revisionBefore: number;
  revisionAfter: number;
  invalidatedDomains: string[];
  enginesExecuted: string[];
  status: 'COMMITTED' | 'REVISION_CONFLICT' | 'STALE_RESULT_DISCARDED' | 'FAILED' | 'IGNORED_DUE_TO_LOCK';
  error?: string;
  expectedRevision?: number;
  actualRevision?: number;
}

export interface DispatchOutcome {
  state: CompositionState;
  result: CommandResult;
}

export class CommandBus {
  /**
   * Receives a command, validates the base contract, and routes to Orchestrator.
   * Does NOT mutate state directly.
   */
  async dispatch(
    command: CompositionCommand, 
    currentState: CompositionState
  ): Promise<DispatchOutcome> {
    if (!command.requestId || typeof command.expectedRevision !== 'number') {
      return {
        state: currentState,
        result: {
          requestId: command.requestId || 'UNKNOWN',
          command: command.type,
          revisionBefore: currentState.revision,
          revisionAfter: currentState.revision,
          invalidatedDomains: [],
          enginesExecuted: [],
          status: 'FAILED',
          error: 'Invalid command contract: missing requestId or expectedRevision'
        }
      };
    }

    try {
      return await handleCommand(command, currentState);
    } catch (e: any) {
      return {
        state: currentState,
        result: {
          requestId: command.requestId,
          command: command.type,
          revisionBefore: currentState.revision,
          revisionAfter: currentState.revision,
          invalidatedDomains: [],
          enginesExecuted: [],
          status: 'FAILED',
          error: e.message || 'Unknown error during execution'
        }
      };
    }
  }
}
