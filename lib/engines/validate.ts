import { STYLES } from "../music/styles";
import type { GenerateOptions,StyleId } from "../music/types";
export function parseOptions(body:unknown):GenerateOptions {
  const value=(body&&typeof body==="object"?body:{}) as Record<string,unknown>;
  const style=(typeof value.style==="string"&&value.style in STYLES?value.style:"trap-br") as StyleId;
  return {style,bpm:Math.min(200,Math.max(60,Number(value.bpm)||STYLES[style].bpm[0])),complexity:Math.min(5,Math.max(1,Number(value.complexity)||3)),seed:value.seed==null?undefined:Number(value.seed),key:typeof value.key==="string"?value.key:"C"};
}
