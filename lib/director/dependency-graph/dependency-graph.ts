import type { CommandType } from '../command-bus/commands.ts';

export type InvalidatedDomain = 
  | 'TIMING'
  | 'HARMONY'
  | 'MELODY'
  | 'BASS'
  | 'DRUMS'
  | 'RENDERER_ONLY'
  | 'ALL_GENERATION'
  | 'NONE';

export const DEPENDENCY_GRAPH: Record<CommandType, InvalidatedDomain[]> = {
  'SET_BPM': ['TIMING'],
  'SET_KEY': ['HARMONY', 'MELODY', 'BASS'],
  'SET_SCALE': ['HARMONY', 'MELODY', 'BASS'],
  'LOCK_LAYER': ['NONE'],
  'UNLOCK_LAYER': ['NONE'],
  'REGENERATE_LAYER': ['ALL_GENERATION'], 
  'REGENERATE_SECTION': ['ALL_GENERATION'],
  'GENERATE_VARIATION': ['ALL_GENERATION'],
  'GENERATE_ARRANGEMENT': ['ALL_GENERATION']
};

export function getAffectedDomains(commandType: CommandType, targetLayer?: string): InvalidatedDomain[] {
  if (commandType === 'REGENERATE_LAYER' || commandType === 'GENERATE_VARIATION') {
    // Melody L3 doesn't read HarmonicBlocks yet. Cascading regeneration would just roll RNG without musical purpose.
    // TODO (Lote 7/8): Mark melody as HARMONICALLY_STALE instead of forcing immediate regeneration.
    if (targetLayer === 'harmony') return ['HARMONY', 'BASS']; 
    if (targetLayer === 'bass') return ['BASS'];
    if (targetLayer === 'melody') return ['MELODY'];
    if (targetLayer === 'drums') return ['DRUMS'];
    return ['ALL_GENERATION'];
  }
  return DEPENDENCY_GRAPH[commandType] || [];
}

export function resolveEnginesToRun(domains: InvalidatedDomain[], targetLayer?: string): string[] {
  const engines = new Set<string>();
  
  if (domains.includes('ALL_GENERATION')) {
    if (targetLayer) engines.add(targetLayer);
    else {
      engines.add('melody');
      engines.add('harmony');
      engines.add('bass');
      engines.add('drums');
    }
  }

  if (domains.includes('MELODY')) engines.add('melody');
  if (domains.includes('HARMONY')) engines.add('harmony');
  if (domains.includes('BASS')) engines.add('bass');
  if (domains.includes('DRUMS')) engines.add('drums');
  
  return Array.from(engines);
}
