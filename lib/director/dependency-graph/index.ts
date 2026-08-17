export type SemanticCommand = 
  | 'SET_BPM'
  | 'SET_KEY'
  | 'SET_SCALE'
  | 'SET_INTENSITY'
  | 'SET_INSTRUMENT'
  | 'GENERATE_VARIATION'
  | 'REGENERATE_LAYER';

export type InvalidatedDomain = 
  | 'TIMING'
  | 'HARMONY'
  | 'MELODY'
  | 'BASS'
  | 'DRUMS'
  | 'RENDERER_ONLY'
  | 'ALL_GENERATION';

export const DEPENDENCY_GRAPH: Record<SemanticCommand, InvalidatedDomain[]> = {
  'SET_BPM': ['TIMING'],
  'SET_KEY': ['HARMONY', 'MELODY', 'BASS'],
  'SET_SCALE': ['HARMONY', 'MELODY', 'BASS'],
  'SET_INTENSITY': ['ALL_GENERATION'],
  'SET_INSTRUMENT': ['RENDERER_ONLY'],
  'GENERATE_VARIATION': ['MELODY', 'BASS', 'DRUMS'],
  'REGENERATE_LAYER': ['ALL_GENERATION']
};

export function getAffectedDomains(command: SemanticCommand): InvalidatedDomain[] {
  return DEPENDENCY_GRAPH[command] || [];
}
