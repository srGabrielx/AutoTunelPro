import { generateDrums } from "../../../lib/engines/drums";
import { parseOptions } from "../../../lib/engines/validate";
export async function POST(request:Request){try{return Response.json(generateDrums(parseOptions(await request.json())))}catch{return Response.json({error:"Entrada inválida"},{status:400})}}
