/**
 * Deterministic Event IDs
 * 
 * Generates semantic and reproducible IDs to help RepairEngine pinpoint violations.
 * Format: [generation]:[section]:[layer]:[phrase]:[eventIndex]
 */

export function generateEventId(
  generationId: string,
  sectionId: string,
  layerId: string,
  phraseId: string,
  eventIndex: number
): string {
  // Format with zero-padding for the event index to maintain lexicographical sorting
  const paddedIndex = eventIndex.toString().padStart(4, '0');
  return `${generationId}:${sectionId}:${layerId}:${phraseId}:event-${paddedIndex}`;
}

/**
 * Parses an event ID back into its components.
 */
export function parseEventId(id: string) {
  const parts = id.split(':');
  if (parts.length !== 5) {
    throw new Error(`Invalid deterministic event ID format: ${id}`);
  }
  
  return {
    generationId: parts[0],
    sectionId: parts[1],
    layerId: parts[2],
    phraseId: parts[3],
    eventToken: parts[4],
  };
}
