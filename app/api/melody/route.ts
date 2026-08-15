import { generateMelody } from "../../../lib/engines/melody";
import { parseOptions } from "../../../lib/engines/validate";
export async function POST(request:Request){try{return Response.json(generateMelody(parseOptions(await request.json())))}catch{return Response.json({error:"Entrada inválida"},{status:400})}}
