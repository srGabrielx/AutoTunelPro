export interface PresetManifest {
  id: string;
  version: number;

  genre: string;
  style: string;

  // Parâmetros default assumidos quando o usuário não especificar
  defaults: {
    energy: number;
    darkness: number;
    complexity: number;
  };

  // Restrições/limites de BPM
  ranges: {
    bpm: [number, number];
  };

  // Capacidades que este preset suporta (se suporta bass 808, etc)
  capabilities: {
    melody: boolean;
    bass808: boolean;
    counterMelody: boolean;
    rolls: boolean;
  };
}
