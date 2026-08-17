import { generateBass } from "../../../lib/engines/bass";
import { parseOptions } from "../../../lib/engines/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const options = parseOptions(body);
    const result = generateBass(options);
    return Response.json(result);
  } catch {
    return Response.json({ error: "Entrada inválida" }, { status: 400 });
  }
}
