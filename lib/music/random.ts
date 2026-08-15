export function makeSeed(value?: number) { return Number.isFinite(value) ? Math.abs(Math.trunc(value!)) : Math.floor(Math.random()*2_147_483_647); }
export function rng(seed:number) { let state=seed||1; return ()=>{ state=(state*1664525+1013904223)>>>0; return state/4294967296; }; }
export function pick<T>(random:()=>number,values:T[]) { return values[Math.floor(random()*values.length)]; }
