import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, join, relative } from "node:path";
import process from "node:process";

const root = process.cwd();
const testsRoot = join(root, "tests");
const supportedExtensions = new Set([".mjs", ".ts"]);

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(absolutePath);
    if (!entry.name.includes(".test.")) return [];
    if (!supportedExtensions.has(extname(entry.name))) return [];

    // This test targets the optional vinext/Cloudflare artifact produced by
    // validate:artifact, not the Next.js unit/integration test gate.
    if (entry.name === "rendered-html.test.mjs") return [];
    return [relative(root, absolutePath)];
  });
}

const testFiles = collectTests(testsRoot).sort();
const result = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", ...testFiles],
  { cwd: root, stdio: "inherit" },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
