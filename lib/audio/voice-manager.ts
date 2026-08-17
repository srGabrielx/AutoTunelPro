/**
 * VoiceManager
 * 
 * Gerencia a polifonia, grupos de corte (choke groups) e roubo de vozes (voice stealing).
 * Previne "notas penduradas" (hanging notes) e resolve clippagem por sobreposição rítmica (ex: hats).
 */

export interface VoiceConfig {
  layerId: string;
  maxPolyphony?: number;
  chokeGroup?: string;
  gainNode?: GainNode; // Utilizado para release suave
}

interface ActiveVoice {
  node: AudioScheduledSourceNode;
  config: VoiceConfig;
}

export class VoiceManager {
  private activeVoices = new Set<ActiveVoice>();
  private chokeGroups = new Map<string, ActiveVoice>();

  constructor(private context: AudioContext) {}

  /**
   * Registra um AudioNode na gerência de vozes.
   */
  public registerVoice(node: AudioScheduledSourceNode, config: VoiceConfig) {
    const voice: ActiveVoice = { node, config };

    // 1. Choke Group (Corte Mútuo)
    if (config.chokeGroup) {
      const activeInGroup = this.chokeGroups.get(config.chokeGroup);
      if (activeInGroup) {
        this.stopVoice(activeInGroup, 0.01); // Release muito rápido (10ms) para emular o choke físico
      }
      this.chokeGroups.set(config.chokeGroup, voice);
    }

    // 2. Voice Stealing (Controle de Polifonia por Camada)
    if (config.maxPolyphony) {
      const layerVoices = Array.from(this.activeVoices).filter(v => v.config.layerId === config.layerId);
      if (layerVoices.length >= config.maxPolyphony) {
        // Encontra a voz mais antiga desta camada (a primeira do array iterado do Set)
        const oldest = layerVoices[0];
        if (oldest) {
          this.stopVoice(oldest, 0.05); // 50ms fade out pra não estalar
        }
      }
    }

    // 3. Adiciona a nova voz
    this.activeVoices.add(voice);

    // 4. Auto-limpeza quando a voz terminar naturalmente
    node.onended = () => {
      this.activeVoices.delete(voice);
      if (config.chokeGroup && this.chokeGroups.get(config.chokeGroup) === voice) {
        this.chokeGroups.delete(config.chokeGroup);
      }
    };
  }

  /**
   * Para uma voz específica aplicando um ramp-down suave (se tiver um GainNode associado).
   */
  private stopVoice(voice: ActiveVoice, releaseTimeMs: number) {
    const time = this.context.currentTime;
    
    // Removemos do set imediatamente para não contabilizar
    this.activeVoices.delete(voice);

    if (voice.config.gainNode) {
      try {
        // Aplica um release suave para evitar "cliques"
        voice.config.gainNode.gain.cancelScheduledValues(time);
        voice.config.gainNode.gain.setValueAtTime(voice.config.gainNode.gain.value, time);
        voice.config.gainNode.gain.exponentialRampToValueAtTime(0.001, time + releaseTimeMs);
        voice.node.stop(time + releaseTimeMs + 0.01);
      } catch (e) {
        // Fallback duro caso algo falhe
        try { voice.node.stop(time); } catch {}
      }
    } else {
      // Se não tiver envelope associado, mata instantaneamente
      try { voice.node.stop(time); } catch {}
    }
  }

  /**
   * Pânico absoluto: para TODAS as vozes ativas com fadeout rápido.
   * Usado quando o usuário aperta 'Stop'. Resolve "notas penduradas".
   */
  public stopAll() {
    const time = this.context.currentTime;
    this.activeVoices.forEach((voice) => {
      if (voice.config.gainNode) {
        try {
          voice.config.gainNode.gain.cancelScheduledValues(time);
          voice.config.gainNode.gain.setValueAtTime(voice.config.gainNode.gain.value, time);
          voice.config.gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
          voice.node.stop(time + 0.06);
        } catch (e) {
          try { voice.node.stop(time); } catch {}
        }
      } else {
        try { voice.node.stop(time); } catch {}
      }
    });
    
    this.activeVoices.clear();
    this.chokeGroups.clear();
  }
}
