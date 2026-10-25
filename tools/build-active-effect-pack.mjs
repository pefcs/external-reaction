import { compilePack } from "@foundryvtt/foundryvtt-cli";
import fs from "node:fs";
import path from "node:path";
import { ClassicLevel } from "classic-level";

const source = path.resolve("pack-source/active-effects");
const destination = path.resolve("packs/examples");
if (!fs.existsSync(source)) throw new Error("Active Effect source directory was not found.");
const sourceFiles = fs.readdirSync(source).filter(name => name.endsWith(".json")).sort();
if (sourceFiles.length !== 39) throw new Error(`Expected 39 Active Effect examples, found ${sourceFiles.length}`);
let disabledTemplates = 0;
const ids = new Set();
const displayOverrides = [];
const sourceEffects = [];
for (const name of sourceFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(source, name), "utf8"));
  sourceEffects.push(data);
  if (!data._key?.startsWith("!effects!") || data.type !== "base" || !Array.isArray(data.system?.changes)) {
    throw new Error(`Invalid Active Effect compendium source: ${name}`);
  }
  if (ids.has(data._id)) throw new Error(`Duplicate Active Effect ID in source: ${data._id}`);
  ids.add(data._id);
  if (data.disabled) disabledTemplates++;
  for (const change of data.system.changes) {
    if (change.type !== "override" || !change.key.startsWith("flags.external-reaction.optional.")) {
      throw new Error(`Unexpected change config in ${name}: ${change.key}`);
    }
    if (change.key.endsWith(".displayBonusRolls")) {
      displayOverrides.push({ name: data.name, value: String(change.value) });
    }
  }
}

const expectedToolExamples = new Map([
  ["Tool — Artisan's Precision", [
    "flags.external-reaction.optional.ArtisansPrecision.tool.all",
    "flags.external-reaction.optional.ArtisansPrecision.activation",
    "flags.external-reaction.optional.ArtisansPrecision.count"
  ]],
  ["Tool — Locksmith's Gambit", [
    "flags.external-reaction.optional.ToolmastersAid.tool.fail.thief",
    "flags.external-reaction.optional.ToolmastersAid.tool.success.thief",
    "flags.external-reaction.optional.ToolmastersAid.activation",
    "flags.external-reaction.optional.ToolmastersAid.count"
  ]]
]);
for (const [name, requiredKeys] of expectedToolExamples) {
  const effect = sourceEffects.find(entry => entry.name === name);
  if (!effect) throw new Error(`Missing required tool-check example: ${name}`);
  const actualKeys = new Set(effect.system.changes.map(change => change.key));
  for (const key of requiredKeys) {
    if (!actualKeys.has(key)) throw new Error(`Tool-check example ${name} is missing change: ${key}`);
  }
}

const expectedDisplayOverrides = new Map([
  ["Defense — Arcane Aegis", "true"],
  ["Check — Private Oracle's Insight", "false"]
]);
if (displayOverrides.length !== expectedDisplayOverrides.size ||
    displayOverrides.some(entry => expectedDisplayOverrides.get(entry.name) !== entry.value)) {
  throw new Error("Only Arcane Aegis (true) and Private Oracle's Insight (false) should explicitly override displayBonusRolls: " + JSON.stringify(displayOverrides));
}
if (disabledTemplates !== 2) throw new Error(`Expected 2 disabled setup templates, found ${disabledTemplates}`);
const manifest = JSON.parse(fs.readFileSync("module.json", "utf8"));
if (manifest.version !== "0.11.0") throw new Error("Version unexpectedly changed: " + manifest.version);
if (!manifest.packs?.some(pack => pack.name === "examples" && pack.type === "ActiveEffect" && pack.path === "packs/examples")) {
  throw new Error("module.json does not declare the ActiveEffect examples compendium.");
}

if (process.argv.includes("--verify")) {
  const dbFiles = fs.existsSync(destination) ? fs.readdirSync(destination) : [];
  if (!dbFiles.includes("CURRENT") || !dbFiles.some(name => /^MANIFEST-/.test(name))) {
    throw new Error("Compiled pack does not look like a LevelDB database: " + dbFiles.join(", "));
  }
  const db = new ClassicLevel(destination, { keyEncoding: "utf8", valueEncoding: "json" });
  await db.open();
  try {
    const keys = await db.keys().all();
    const effectKeys = keys.filter(key => key.startsWith("!effects!"));
    if (effectKeys.length !== 39) throw new Error(`Expected 39 packed Active Effects, found ${effectKeys.length}`);
    const packed = await db.getMany(effectKeys);
    if (packed.some(data => data?.type !== "base" || !Array.isArray(data.system?.changes))) {
      throw new Error("Packed Active Effect entry failed structure verification.");
    }
    for (const [name, requiredKeys] of expectedToolExamples) {
      const effect = packed.find(entry => entry.name === name);
      if (!effect) throw new Error(`Packed compendium is missing required tool-check example: ${name}`);
      const changeKeys = new Set((effect.system?.changes ?? []).map(change => change.key));
      for (const key of requiredKeys) {
        if (!changeKeys.has(key)) throw new Error(`Packed tool-check example ${name} is missing change: ${key}`);
      }
    }
    const packedDisabled = packed.filter(data => data.disabled).length;
    if (packedDisabled !== 2) throw new Error(`Expected 2 disabled setup templates in pack, found ${packedDisabled}`);
    const packedDisplayOverrides = packed.flatMap(data => (data.system?.changes ?? [])
      .filter(change => change.key.endsWith(".displayBonusRolls"))
      .map(change => ({ name: data.name, value: String(change.value) })));
    if (packedDisplayOverrides.length !== 2 ||
        !packedDisplayOverrides.some(entry => entry.name === "Defense — Arcane Aegis" && entry.value === "true") ||
        !packedDisplayOverrides.some(entry => entry.name === "Check — Private Oracle's Insight" && entry.value === "false")) {
      throw new Error("The packed Active Effects do not contain exactly the two intended displayBonusRolls examples.");
    }
    console.log(`Verified native LevelDB pack: ${effectKeys.length} Active Effects, including both tool-check examples, ${packedDisabled} disabled templates, 2 explicit displayBonusRolls examples.`);
  } finally {
    await db.close();
  }
} else if (process.argv.includes("--validate-only")) {
  console.log(`Validated ${sourceFiles.length} source Active Effects (${disabledTemplates} disabled templates); module version remains ${manifest.version}.`);
} else {
  await compilePack(source, destination, { log: true });
  console.log(`Compiled ${sourceFiles.length} Active Effect examples to ${destination}; manifest version remains ${manifest.version}.`);
}
