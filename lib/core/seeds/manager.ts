/**
 * SeedManager
 * 
 * Gerencia a derivação de seeds baseadas em namespaces ("drums:hats:hook").
 * Evita o consumo sequencial do RNG, permitindo isolamento perfeito de componentes.
 */

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

export function deriveSeed(masterSeed: string, namespace: string): number {
  const payload = `${masterSeed}::${namespace}`;
  return hashString(payload);
}

export function generateMasterSeed(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    return `${array[0].toString(16)}-${array[1].toString(16)}`;
  }
<<<<<<< HEAD
  throw new Error("Web Crypto is required to create an unlocked master seed");
=======
  return `seed-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
}
