import type { CompositionState } from "./types";

export type StateMutation = (draft: CompositionState) => void;

/**
 * StateStore
 * 
 * Gerencia o CompositionState de forma atômica e versionada.
 * Utiliza o conceito de revisões para evitar race conditions com workers atrasados.
 */
export class StateStore {
  private state: CompositionState;

  constructor(initialState: CompositionState) {
    this.state = JSON.parse(JSON.stringify(initialState)); // Force deep clone and ensure serializable
  }

  public getState(): CompositionState {
    return this.state;
  }

  /**
   * Executa uma mutação no estado, incrementando a revisão e garantindo imutabilidade para quem lê.
   * Na vida real (Next/React), poderíamos usar Immer.js aqui.
   */
  public mutate(mutation: StateMutation): CompositionState {
    // Para simplificar sem importar Immer, fazemos clone profundo. 
    // Para performance real em produção, Zustand + Immer é o ideal.
    const draft = JSON.parse(JSON.stringify(this.state));
    
    mutation(draft);
    
    // Incrementa a revisão atomaticamente
    draft.revision += 1;
    
    this.state = draft;
    return this.state;
  }

  /**
   * Verifica se a revisão solicitada pelo worker ainda é compatível com o estado atual.
   * Descarta respostas de gerações velhas.
   */
  public isRevisionValid(workerRequestedRevision: number): boolean {
    return this.state.revision === workerRequestedRevision;
  }
}
