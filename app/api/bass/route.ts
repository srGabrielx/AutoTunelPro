import { runLegacyBassPipeline } from "../../../lib/engines/legacy-bridge";
import { parseOptions } from "../../../lib/engines/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const options = parseOptions(body);
    const result = await runLegacyBassPipeline(options);
    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Entrada inválida ou erro na engine" }, { status: 400 });
  }
}
