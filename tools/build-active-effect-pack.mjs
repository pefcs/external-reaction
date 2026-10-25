import { compilePack } from "@foundryvtt/foundryvtt-cli/lib/package.mjs";
import fs from "node:fs";
import path from "node:path";

const source = path.resolve("pack-source/active-effects");
const destination = path.resolve("packs/examples");
if (!fs.existsSync(source)) throw new Error("Active Effect source directory was not found.");
const sourceFiles = fs.readdirSync(source).filter(name => name.endsWith(".json"));
if (sourceFiles.length !== 38) throw new Error(`Expected 38 Active Effect examples, found ${sourceFiles.length}`);
for (const name of sourceFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(source, name), "utf8"));
  if (!data._key?.startsWith("!effects!") || data.type !== "base" || !Array.isArray(data.system?.changes)) {
    throw new Error(`Invalid Active Effect compendium source: ${name}`);
  }
}
const manifest = JSON.parse(fs.readFileSync("module.json", "utf8"));
if (manifest.version !== "0.10.9") throw new Error("Version unexpectedly changed: " + manifest.version);
if (!manifest.packs?.some(pack => pack.name === "examples" && pack.type === "ActiveEffect")) {
  throw new Error("module.json does not declare the ActiveEffect examples compendium.");
}
await compilePack(source, destination, { log: true });
const dbFiles = fs.readdirSync(destination);
if (!dbFiles.includes("CURRENT") || !dbFiles.some(name => /^MANIFEST-/.test(name))) {
  throw new Error("Compiled pack does not look like a LevelDB database: " + dbFiles.join(", "));
}
console.log(`Successfully compiled ${sourceFiles.length} Active Effect examples to ${destination}`);
