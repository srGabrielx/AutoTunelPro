export type CommandType =
  | 'SET_BPM'
  | 'SET_KEY'
  | 'SET_SCALE'
  | 'LOCK_LAYER'
  | 'UNLOCK_LAYER'
  | 'REGENERATE_LAYER'
  | 'REGENERATE_SECTION'
  | 'GENERATE_VARIATION'
  | 'GENERATE_ARRANGEMENT';

export interface BaseCommand {
  type: CommandType;
  requestId: string;
  expectedRevision: number;
}

export interface SetBpmCommand extends BaseCommand {
  type: 'SET_BPM';
  bpm: number;
}

export interface SetKeyCommand extends BaseCommand {
  type: 'SET_KEY';
  key: string;
}

export interface SetScaleCommand extends BaseCommand {
  type: 'SET_SCALE';
  scale: string;
}

export interface LockLayerCommand extends BaseCommand {
  type: 'LOCK_LAYER';
  layer: 'melody' | 'harmony' | 'bass' | 'drums';
}

export interface UnlockLayerCommand extends BaseCommand {
  type: 'UNLOCK_LAYER';
  layer: 'melody' | 'harmony' | 'bass' | 'drums';
}

export interface RegenerateLayerCommand extends BaseCommand {
  type: 'REGENERATE_LAYER';
  layer: 'melody' | 'harmony' | 'bass' | 'drums';
}

export interface RegenerateSectionCommand extends BaseCommand {
  type: 'REGENERATE_SECTION';
  sectionId: string;
}

export interface GenerateVariationCommand extends BaseCommand {
  type: 'GENERATE_VARIATION';
  layer: 'melody' | 'harmony' | 'bass' | 'drums';
}

export interface GenerateArrangementCommand extends BaseCommand {
  type: 'GENERATE_ARRANGEMENT';
}

export type CompositionCommand =
  | SetBpmCommand
  | SetKeyCommand
  | SetScaleCommand
  | LockLayerCommand
  | UnlockLayerCommand
  | RegenerateLayerCommand
  | RegenerateSectionCommand
  | GenerateVariationCommand
  | GenerateArrangementCommand;
