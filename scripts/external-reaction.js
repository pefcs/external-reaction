/**
 * External Reaction integrates third-party reaction options with Midi-QoL
 * workflows. This module intentionally uses the Foundry/D&D 5e runtime APIs
 * supplied by the installation rather than bundling those dependencies.
 */
const MODULE_ID = "external-reaction";
const FLAG_ROOT = `flags.${MODULE_ID}.optional`;
const patchedWorkflows = new WeakSet();
const patchedSaveWorkflows = new WeakSet();
const processedExternalCheckRolls = new WeakSet();
const patchedDamageWorkflows = new WeakSet();
const processedACWorkflows = new WeakSet();

/* ------------------------------------------------------------------------- *
 * Logging
 * ------------------------------------------------------------------------- */

// Follow Midi-QoL's Debug setting: none, warn, debug, or all. Errors are
// always shown; the configured level controls all other console output.
function getMidiLogLevel() {
  try {
    const setting = String(game.settings.get("midi-qol", "Debug") ?? "none")
      .trim()
      .toLowerCase();

    if (setting === "warning" || setting === "warnings") return "warn";

    return ["none", "warn", "debug", "all"].includes(setting) ? setting : "none";
  } catch (_) {
    return "none";
  }
}

function getMidiLogRank() {
  const ranks = { none: 0, warn: 1, debug: 2, all: 3 };
  return ranks[getMidiLogLevel()] ?? 0;
}

function log(...args) {
  if (getMidiLogRank() >= 2) console.info(`${MODULE_ID} |`, ...args);
}

function debug(...args) {
  if (getMidiLogRank() >= 2) console.debug(`DEBUG: ${MODULE_ID} |`, ...args);
}

function trace(...args) {
  if (getMidiLogRank() >= 3) console.log(`TRACE: ${MODULE_ID} |`, ...args);
}

function warn(...args) {
  if (getMidiLogRank() >= 1) console.warn(`${MODULE_ID} |`, ...args);
}

function error(...args) {
  console.error(`${MODULE_ID} |`, ...args);
}


function readFlagBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const text = value.trim().toLowerCase();
    if (["true", "yes", "1", "on"].includes(text)) return true;
    if (["false", "no", "0", "off", ""].includes(text)) return false;
  }
  return undefined;
}

function resolveExternalRollMode(flagData = {}, roll = null) {
  const raw = String(flagData?.rollMode ?? "").trim().toLowerCase();
  if (["publicroll", "gmroll", "blindroll", "selfroll"].includes(raw)) return raw;
  if (["public", "gm", "blind", "self"].includes(raw)) {
    return ({ public: "publicroll", gm: "gmroll", blind: "blindroll", self: "selfroll" })[raw];
  }
  const rollRaw = String(roll?.options?.externalReactionRollMode ?? roll?.options?.rollMode ?? "").toLowerCase();
  if (["publicroll", "gmroll", "blindroll", "selfroll"].includes(rollRaw)) return rollRaw;
  if (["public", "gm", "blind", "self"].includes(rollRaw)) {
    return ({
      public: "publicroll",
      gm: "gmroll",
      blind: "blindroll",
      self: "selfroll"
    })[rollRaw];
  }
  // Midi-QoL resolves missing per-optional rollMode against core.messageMode.
  // Foundry/Midi can store either roll-mode names (publicroll/gmroll/...) or
  // message-mode names (public/gm/blind/self); "roll" means use the core default.
  let messageMode;
  try {
    if (game.settings?.settings?.get?.("core.messageMode")) {
      messageMode = game.settings.get("core", "messageMode");
    }
  } catch (_) { /* Resolve to the ordinary core default below. */ }
  const normalizedMessageMode = ({
    public: "publicroll", publicroll: "publicroll",
    gm: "gmroll", gmroll: "gmroll",
    blind: "blindroll", blindroll: "blindroll",
    self: "selfroll", selfroll: "selfroll"
  })[String(messageMode ?? "").toLowerCase()];
  if (normalizedMessageMode) return normalizedMessageMode;
  // Some Foundry versions expose a separate legacy rollMode setting.
  let legacyMode;
  try { legacyMode = game.settings.get("core", "rollMode"); } catch (_) { /* ignore */ }
  const normalizedLegacyMode = ({
    public: "publicroll", publicroll: "publicroll",
    gm: "gmroll", gmroll: "gmroll",
    blind: "blindroll", blindroll: "blindroll",
    self: "selfroll", selfroll: "selfroll"
  })[String(legacyMode ?? "").toLowerCase()];
  return normalizedLegacyMode ?? "publicroll";
}

function toChatMessageMode(rollMode) {
  return ({ publicroll: "public", gmroll: "gm", blindroll: "blind", selfroll: "self" })[resolveExternalRollMode({ rollMode })] ?? "public";
}

function setConfiguredRollMode(roll, flagData, recipient = null) {
  if (!roll) return;
  roll.options ??= {};
  const mode = resolveExternalRollMode(flagData, roll);
  roll.options.rollMode = mode;
  if (flagData?.rollMode && String(flagData.rollMode).trim()) {
    roll.options.externalReactionRollMode = resolveExternalRollMode(flagData, roll);
    if (recipient?.id) roll.options.externalReactionRollModeUserId = recipient.id;
  }
}

function getMidiDisplayBonusRollsSetting(midi) {
  // Midi-QoL's checkMechanic("displayBonusRolls") returns false when all
  // optional rules are toggled off; otherwise it reads
  // configSettings.optionalRules.displayBonusRolls. Prefer the persisted
  // ConfigSettings value because some Midi API builds expose configSettings
  // incompletely or as a stale snapshot.
  const candidates = [];
  try {
    const persisted = game.settings.get("midi-qol", "ConfigSettings");
    if (persisted && typeof persisted === "object") candidates.push(persisted);
  } catch (_) { /* Try the Midi API snapshot below. */ }
  if (midi?.configSettings && typeof midi.configSettings === "object" && !candidates.includes(midi.configSettings)) {
    candidates.push(midi.configSettings);
  }

  for (const settings of candidates) {
    if (settings.toggleOptionalRules === true) return false;
    const configured = readFlagBoolean(settings.optionalRules?.displayBonusRolls);
    if (configured !== undefined) return configured;
  }

  // Midi-QoL initializes optionalRules.displayBonusRolls to true when the
  // stored configuration has no value at all. Only use that documented
  // default after checking the persisted value and any API snapshot.
  return undefined;
}

function shouldDisplayExternalBonusRolls(flagData, midi) {
  // A per-option flag is an explicit override. If absent, mirror Midi-QoL's
  // current global mechanic setting (including the global optional-rules
  // toggle), rather than treating display as unconditionally enabled.
  const explicit = readFlagBoolean(flagData?.displayBonusRolls);
  if (explicit !== undefined) return explicit;
  const midiSetting = getMidiDisplayBonusRollsSetting(midi);
  return midiSetting ?? true;
}

function applyConfiguredModeToMessageData(messageData, roll, recipient = null) {
  const raw = roll?.options?.externalReactionRollMode ?? roll?.options?.rollMode;
  if (!raw) return messageData;
  const mode = resolveExternalRollMode({ rollMode: raw }, roll);
  ChatMessage.applyMode(messageData, toChatMessageMode(mode));
  if (mode === "selfroll" && recipient?.id) messageData.whisper = [recipient.id];
  return messageData;
}

async function displayExternalBonusRolls(previous, current, actor, flagData, title, midi, recipient = null) {
  if (!shouldDisplayExternalBonusRolls(flagData, midi)) return null;
  const before = (Array.isArray(previous) ? previous : [previous]).filter(Boolean);
  const after = (Array.isArray(current) ? current : [current]).filter(Boolean);
  if (!before.length || !after.length) return null;
  const render = async list => {
    const rendered = await Promise.all(
      list.map(roll => (midi?.midiRenderRoll ? midi.midiRenderRoll(roll) : roll.render()))
    );
    return rendered.join("<hr>");
  };
  try {
    const content = `${await render(before)}<hr>${await render(after)}`;
    const mode = resolveExternalRollMode(flagData, after[0]);
    const chatData = {
      flavor: title,
      content,
      speaker: ChatMessage.getSpeaker({ actor }),
      rolls: [...before, ...after],
      sound: CONFIG.sounds?.dice
    };
    ChatMessage.applyMode(chatData, toChatMessageMode(mode));
    if (mode === "selfroll" && recipient?.id) chatData.whisper = [recipient.id];
    return await ChatMessage.create(chatData);
  } catch (err) {
    error("Could not display external before/after bonus roll card.", err);
    return null;
  }
}

// Count handling adapted from Midi-QoL 14.6.4 getOptionalCountRemaining/removeEffectGranting.
// The count owner is always the defender (the actor receiving the external reaction), never the attack workflow actor.
/* ------------------------------------------------------------------------- *
 * Count values, resource eligibility, and consumption
 * ------------------------------------------------------------------------- */

function getItemForCount(actor, countValue) {
  const parts = countValue.split(".");
  if (parts[1] === "identifier") return actor.items.find(i => i.identifier === parts[2]);
  if (parts[1] === "partialNameMatch") return actor.items.find(i => i.name.includes(parts.slice(2).join(".")));
  if (parts[1] === "exactNameMatch") return actor.items.getName(parts.slice(2).join("."));
  return actor.items.getName(parts.slice(1).join(".")); // Midi-QoL backwards-compatible ItemUses.{itemName}
}
function getActivityForCount(actor, countValue) {
  const p = countValue.split(".");
  let item, activity;
  if (p[1] === "identifier") {
    item = actor.items.find(i => i.identifier === p[2]);
    activity = item?.system.activities?.contents?.find(a => a.identifier === p[3]);
  } else if (p[1] === "id") {
    item = actor.items.get(p[2]);
    activity = item?.system.activities?.get(p[3]);
  } else if (p[1] === "partialNameMatch") {
    item = actor.items.find(i => i.name.includes(p[2]));
    activity = item?.system.activities?.contents?.find(a => a.name.includes(p.slice(3).join(".") ));
  } else if (p[1] === "exactNameMatch") {
    item = actor.items.getName(p[2]);
    activity = item?.system.activities?.getName(p.slice(3).join("."));
  } else {
    item = actor.items.getName(p[1]);
    activity = item?.system.activities?.getName(p.slice(2).join("."));
  }
  return activity;
}
function parseSpellSlotCount(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^spellslot\s+([1-9])$/i);
  if (!match) return null;
  const level = Number(match[1]);
  return Number.isInteger(level) && level >= 1 && level <= 9 ? level : null;
}

function getSpellSlotMinimum(data) {
  const levels = [data?.count, data?.countAlt]
    .map(value => parseSpellSlotCount(value))
    .filter(level => Number.isInteger(level));
  return levels.length ? Math.max(...levels) : null;
}

function getAvailableExternalSpellSlots(actor, minimumLevel = 1) {
  const spells = actor?.system?.spells ?? {};
  const minLevel = Math.max(1, Number(minimumLevel) || 1);
  const slots = [];
  for (let level = minLevel; level <= 9; level += 1) {
    const slot = spells[`spell${level}`];
    const remaining = Number(slot?.value);
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    const levelLabel = CONFIG.DND5E?.spellLevels?.[level] ?? String(level);
    let label = `Level ${levelLabel} Spell Slot (${remaining} available)`;
    try {
      const localized = game.i18n.format("DND5E.SpellLevelSlot", { level: levelLabel, n: remaining });
      if (localized && !localized.includes("DND5E.SpellLevelSlot")) label = localized;
    } catch (_) { /* Use the readable fallback label. */ }
    slots.push({ key: `spell${level}`, level, remaining, kind: "spell", label });
  }
  const pact = spells.pact;
  const pactLevel = Number(pact?.level);
  const pactRemaining = Number(pact?.value);
  if (Number.isInteger(pactLevel) && pactLevel >= minLevel && pactLevel <= 9 && Number.isFinite(pactRemaining) && pactRemaining > 0) {
    const levelLabel = CONFIG.DND5E?.spellLevels?.[pactLevel] ?? String(pactLevel);
    slots.push({
      key: "pact", level: pactLevel, remaining: pactRemaining, kind: "pact",
      label: `Pact Magic — Level ${levelLabel} (${pactRemaining} available)`
    });
  }
  return slots.sort((a, b) => a.level - b.level || (a.kind === b.kind ? 0 : a.kind === "spell" ? -1 : 1));
}

async function chooseAndSpendExternalSpellSlot(actorUuid, minimumLevel) {
  const actor = await fromUuid(actorUuid);
  if (!actor?.system?.spells) {
    ui.notifications?.error("External Reaction: could not find the reactor's spell-slot data.");
    return false;
  }
  const slots = getAvailableExternalSpellSlots(actor, minimumLevel);
  trace("Opening spell-slot selector.", { actor: actor.name, minimumLevel, available: slots.map(({ key, level, kind, remaining }) => ({ key, level, kind, remaining })) });
  if (!slots.length) {
    ui.notifications?.warn(`External Reaction: no available spell slot or Pact Magic slot of level ${minimumLevel} or higher.`);
    return false;
  }
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (!DialogV2?.wait) throw new Error("Foundry DialogV2.wait is unavailable.");
  let selectedKey = slots[0].key;
  const options = slots.map(slot => `<option value="${escapeExternalActivityHTML(slot.key)}">${escapeExternalActivityHTML(slot.label)}</option>`).join("");
  const result = await DialogV2.wait({
    window: { title: "Choose Spell Slot" },
    classes: ["dnd5e2", "external-reaction-spell-slot-selector"],
    position: { width: 420 },
    content: `<form class="standard-form external-reaction-spell-slot-form"><p>Choose a spell slot to expend (minimum level ${minimumLevel}). Pact Magic slots are listed separately.</p><div class="form-group"><label for="external-reaction-spell-slot">Spell Slot</label><select id="external-reaction-spell-slot" name="spellSlot">${options}</select></div></form>`,
    buttons: [
      { action: "cast", label: "Cast", icon: "fas fa-wand-sparkles", callback: () => selectedKey },
      // DialogV2 falls back to the action string when a callback returns null/undefined.
      // Return false explicitly so Cancel cannot be mistaken for a selected slot key.
      { action: "cancel", label: "Cancel", icon: "fas fa-xmark", callback: () => false }
    ],
    default: "cancel",
    render: (_event, dialog) => {
      const root = dialog.element?.[0] ?? dialog.element;
      const select = root?.querySelector?.("#external-reaction-spell-slot");
      if (!select) return;
      selectedKey = select.value || slots[0].key;
      select.addEventListener("change", () => { selectedKey = select.value; });
    }
  });
  // DialogV2 returns false for the explicit Cancel button and null if the window is closed.
  // Both are intentional opt-outs: log at Warning when enabled, but never show a warning popup.
  const selectedSlotKey = typeof result === "string" && slots.some(slot => slot.key === result) ? result : null;
  if (!selectedSlotKey) {
    warn("Spell-slot selection cancelled; no slot was spent and the optional reaction was skipped.", {
      actor: actor.name, minimumLevel, reason: result === false ? "cancel-button" : result == null ? "dialog-closed" : "no-valid-slot-selection"
    });
    return false;
  }

  trace("Spell-slot selection confirmed.", { actor: actor.name, minimumLevel, selectedSlotKey });
  // Re-read the chosen pool after the dialog closes; another action may have spent it meanwhile.
  const current = getAvailableExternalSpellSlots(actor, minimumLevel).find(slot => slot.key === selectedSlotKey);
  if (!current || current.remaining <= 0) {
    warn("Selected spell slot became unavailable before payment; the optional reaction was cancelled.", {
      actor: actor.name, minimumLevel, selectedSlotKey
    });
    ui.notifications?.warn("External Reaction: that spell slot is no longer available. The reaction was cancelled.");
    return false;
  }
  const path = `system.spells.${current.key}.value`;
  await actor.update({ [path]: Math.max(0, current.remaining - 1) });
  log(`Spent ${current.kind === "pact" ? "Pact Magic " : ""}slot level ${current.level} for External Reaction on ${actor.name}.`);
  return true;
}

function getCountValue(actor, value, flagKey) {
  if (value === undefined || value === null || value === "") return 1;
  if (Number.isFinite(Number(value)) && String(value).trim() !== "") return Number(value);
  const spellSlotMinimum = parseSpellSlotCount(value);
  if (spellSlotMinimum !== null) return getAvailableExternalSpellSlots(actor, spellSlotMinimum).length > 0 ? 1 : 0;
  if (/^spellslot\b/i.test(String(value ?? "").trim())) return 0; // Invalid spellslot syntax fails closed.
  if (["each-round", "each-turn", "turn"].includes(value)) {
    if (!game.combat) return 1;
    const combat = game.combat;
    if (value === "turn" && combat.turns?.[combat.turn]?.actor?.uuid !== actor.uuid) return 0;
    const usedPath = `${FLAG_ROOT}.${flagKey}.used`;
    const used = foundry.utils.getProperty(actor, usedPath);
    // Midi-QoL resets each-turn on every combatant turn and each-round at round boundaries.
    // A scoped marker gives the same availability behavior without relying on a separate reset hook.
    const currentScope = value === "each-turn"
      ? `${combat.uuid}:${combat.round}:${combat.turn}`
      : value === "each-round"
        ? `${combat.uuid}:${combat.round}`
        : combat.uuid;
    return used === currentScope ? 0 : 1;
  }
  if (value === "reaction") return game.modules.get("midi-qol")?.api?.hasUsedReaction?.(actor) ? 0 : 1;
  if (value === "bonusAction") return game.modules.get("midi-qol")?.api?.hasUsedBonusAction?.(actor) ? 0 : 1;
  if (value === "every") return 1;
  if (value.startsWith("ItemUses.")) {
    const uses = getItemForCount(actor, value)?.system?.uses;
    const current = Number(uses?.value);
    if (Number.isFinite(current)) return current;
    const max = Number(uses?.max);
    const spent = Number(uses?.spent ?? 0);
    return Number.isFinite(max) && Number.isFinite(spent) ? Math.max(0, max - spent) : 0;
  }
  if (value.startsWith("ActivityUses.")) {
    const uses = getActivityForCount(actor, value)?.uses;
    const current = Number(uses?.value);
    if (Number.isFinite(current)) return current;
    const max = Number(uses?.max);
    const spent = Number(uses?.spent ?? 0);
    return Number.isFinite(max) && Number.isFinite(spent) ? Math.max(0, max - spent) : 0;
  }
  if (value.startsWith("@")) return foundry.utils.getProperty(actor.system ?? {}, value.slice(1)) ?? 0;
  // Match Midi-QoL behavior for unknown count formats: do not unexpectedly block the option.
  return 1;
}
function findGrantingEffect(actor, flagKey) {
  const prefix = `${FLAG_ROOT}.${flagKey}`;
  return (actor.appliedEffects ?? []).find(effect =>
    (effect.system?.changes ?? effect.changes ?? effect._source?.system?.changes ?? [])
      .some(change => String(change.key ?? "").startsWith(prefix))
  );
}

// AOE saves can be processed concurrently by Midi-QoL. Serialize each reactor's
// actor's optional processing from its final eligibility check through prompt,
// application, and consumption so overlapping target results/options cannot spend
// the same remaining actor-wide or item/activity use.
const externalCountProcessingQueues = new Map();
async function withExternalCountLock(actor, flagKey, callback) {
  // Lock by Actor, not just the option key: separate option flags may consume the
  // same actor-wide reaction or refer to the same limited-use Item/Activity.
  const lockKey = `${actor?.uuid ?? actor?.id ?? "unknown"}`;
  const previous = externalCountProcessingQueues.get(lockKey) ?? Promise.resolve();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const queued = previous.catch(() => {}).then(() => gate);
  externalCountProcessingQueues.set(lockKey, queued);
  await previous.catch(() => {});
  try {
    return await callback();
  } finally {
    release();
    if (externalCountProcessingQueues.get(lockKey) === queued) externalCountProcessingQueues.delete(lockKey);
  }
}

function getLiveCountData(actor, data, flagKey) {
  const effect = findGrantingEffect(actor, flagKey);
  if (!effect) return null;
  const prefix = `${FLAG_ROOT}.${flagKey}`;
  const live = { ...(data ?? {}) };
  for (const property of ["count", "countAlt"]) {
    const change = (effect.system?.changes ?? effect.changes ?? effect._source?.system?.changes ?? [])
      .find(entry => entry.key === `${prefix}.${property}`);
    if (change) live[property] = change.value;
  }
  return live;
}

function countAvailable(actor, data, flagKey, { ignorePaidSpellSlot = false } = {}) {
  // Never trust a stale roll-data/flag snapshot after a previous target has consumed
  // or decremented the Active Effect that grants this optional reaction.
  const liveData = getLiveCountData(actor, data, flagKey);
  if (!liveData) return false;
  const available = value => ignorePaidSpellSlot && parseSpellSlotCount(value) !== null
    ? true
    : getCountValue(actor, value, flagKey) > 0;
  return available(liveData.count) && available(liveData.countAlt);
}
async function consumeCount(actor, flagKey, data) {
  const effect = findGrantingEffect(actor, flagKey);
  const prefix = `${FLAG_ROOT}.${flagKey}`;
  const changes = effect?.system?.changes;
  const countChange = changes?.find(c => c.key === `${prefix}.count`);
  const countAltChange = changes?.find(c => c.key === `${prefix}.countAlt`);
  // If there is no explicit count, Midi-style optional effects are consumed by expiring the granting effect.
  if (!effect) return;
  if (!countChange && !countAltChange) {
    await effect.delete();
    return;
  }
  const updates = foundry.utils.deepClone(changes);
  const primary = updates.find(c => c.key === `${prefix}.count`);
  const alternate = updates.find(c => c.key === `${prefix}.countAlt`);
  const vals = [primary, alternate].filter(Boolean);
  const numeric = vals.find(c => Number.isFinite(Number(c.value)) && String(c.value).trim() !== "");
  if (numeric) {
    const n = Number(numeric.value);
    if (n <= 1) { await effect.delete(); return; }
    numeric.value = String(n - 1);
    await effect.update({ "system.changes": updates });
    return;
  }
  for (const change of vals) {
    const value = String(change.value ?? "");
    if (value.startsWith("ItemUses.")) {
      const item = getItemForCount(actor, value);
      if (item) await item.update({ "system.uses.spent": Math.min(item.system.uses.max ?? Infinity, (item.system.uses.spent ?? 0) + 1) });
    } else if (value.startsWith("ActivityUses.")) {
      const activity = getActivityForCount(actor, value);
      if (activity) await activity.update({ "uses.spent": Math.min(activity.uses.max ?? Infinity, (activity.uses.spent ?? 0) + 1) });
    } else if (value.startsWith("@")) {
      let path = value.slice(1).replace(/^system\./, "");
      const current = foundry.utils.getProperty(actor.system ?? {}, path);
      if (Number.isFinite(Number(current)) && Number(current) > 0) await actor.update({ [`system.${path}`]: Number(current) - 1 });
    } else if (["turn", "each-round", "each-turn"].includes(value)) {
      const combat = game.combat;
      const marker = value === "each-turn"
        ? `${combat?.uuid ?? "no-combat"}:${combat?.round ?? 0}:${combat?.turn ?? 0}`
        : value === "each-round"
          ? `${combat?.uuid ?? "no-combat"}:${combat?.round ?? 0}`
          : (combat?.uuid ?? "");
      const usedKey = change.key.replace(/\.(count|countAlt)$/, ".used");
      await actor.update({ [usedKey]: marker });
    } else if (value === "reaction") {
      await game.modules.get("midi-qol")?.api?.setReactionUsed?.(actor);
    } else if (value === "bonusAction") {
      await game.modules.get("midi-qol")?.api?.setBonusActionUsed?.(actor);
    }
  }
}

/* ------------------------------------------------------------------------- *
 * Actor/token discovery and activation-condition context
 * ------------------------------------------------------------------------- */

function getRollDataForWorkflow(workflow) {
  return { ...(workflow.activity ?? workflow.item ?? workflow.actor)?.getRollData?.() ?? {}, ...(workflow.attackRoll?.data ?? {}) };
}

function getCurrentHitState(workflow, target) {
  const roll = workflow.attackRoll;
  if (!roll || !target?.actor) return false;
  const descriptor = workflow.targetDescriptors?.get?.(target.actor.uuid);
  const ac = descriptor?.ac ?? target.actor.system?.attributes?.ac?.value ?? 10;
  const natural = roll.dice?.[0]?.total;
  return workflow.isCritical === true || (Number(roll.total ?? 0) >= Number(ac) && natural !== 1);
}

function parseDispositionValue(rawValue) {
  const text = String(rawValue ?? "").trim();
  const match = text.match(/\s+(friendly|enemy)\s*$/i);
  if (!match) return { value: text, qualifier: null };
  return { value: text.slice(0, match.index).trim(), qualifier: match[1].toLowerCase() };
}

function normalizeToken(tokenLike) {
  if (!tokenLike) return null;
  if (tokenLike.document && tokenLike.actor) return tokenLike;
  if (tokenLike.documentName === "Token") return tokenLike.object ?? tokenLike;
  if (tokenLike.object?.document && tokenLike.object?.actor) return tokenLike.object;
  return tokenLike;
}

function findTokenForActor(actor, preferredTokens = []) {
  for (const tokenLike of preferredTokens) {
    const token = normalizeToken(tokenLike);
    if (token?.actor?.uuid === actor?.uuid || token?.document?.actorId === actor?.id) return token;
  }
  for (const tokenLike of (canvas?.tokens?.placeables ?? [])) {
    const token = normalizeToken(tokenLike);
    if (token?.actor?.uuid === actor?.uuid || token?.document?.actorId === actor?.id) return token;
  }
  return null;
}

function getDisposition(tokenLike, actor) {
  const token = normalizeToken(tokenLike);
  const value = token?.document?.disposition ?? token?.disposition;
  if (value !== undefined && value !== null) return value;
  // External Reaction deliberately treats missing disposition data as Friendly.
  // This keeps unknown/unrepresented tokens from being classified as enemies by accident.
  return CONST.TOKEN_DISPOSITIONS.FRIENDLY;
}

function getDispositionName(tokenLike, actor) {
  const disposition = getDisposition(tokenLike, actor);
  const dispositions = CONST.TOKEN_DISPOSITIONS ?? {};
  if (disposition === dispositions.HOSTILE) return "hostile";
  if (disposition === dispositions.NEUTRAL) return "neutral";
  if (disposition === dispositions.SECRET) return "secret";
  // Unknown/missing dispositions intentionally fall back to Friendly.
  return "friendly";
}

// Midi-QoL evaluates activation expressions as JavaScript. A small string-like wrapper
// gives `actor.disposition.in('friendly', 'neutral')` the convenient helper syntax used
// in Midi activation examples, while remaining coercible to its normalized string value.
function makeDispositionConditionValue(tokenLike, actor) {
  const value = getDispositionName(tokenLike, actor);
  return Object.freeze({
    value,
    in: (...values) => values.flat().some(candidate => String(candidate).trim().toLowerCase() === value),
    includes: (...values) => values.flat().some(candidate => String(candidate).trim().toLowerCase() === value),
    toString: () => value,
    valueOf: () => value,
    [Symbol.toPrimitive]: () => value
  });
}

function getActorActiveEffects(actor) {
  const effects = [];
  const seen = new Set();
  for (const collection of [actor?.effects, actor?.appliedEffects]) {
    if (!collection) continue;
    let list;
    try { list = Array.from(collection); } catch (_) { list = collection.contents ? [...collection.contents] : []; }
    for (const effect of list) {
      if (!effect) continue;
      const identity = effect.uuid ?? effect.id ?? effect._id ?? effect;
      if (seen.has(identity)) continue;
      seen.add(identity);
      if (effect.disabled === true || effect.isSuppressed === true) continue;
      effects.push(effect);
    }
  }
  return effects;
}

// Actor.flags is normally the quickest source, but in some linked-token / applied-effect
// contexts the effective flag object can be incomplete. Reconstruct the External Reaction
// option groups from active effect change keys as a fallback, so scene-wide reactors don't
// depend on the defended actor being the one carrying the effect.
function collectActorExternalOptions(actor) {
  let options = {};
  try {
    const resolved = foundry.utils.getProperty(actor, FLAG_ROOT) ?? {};
    if (resolved && typeof resolved === "object") options = foundry.utils.deepClone(resolved);
  } catch (_) { /* Rebuild from ActiveEffect changes below. */ }
  const prefix = `${FLAG_ROOT}.`;
  for (const effect of getActorActiveEffects(actor)) {
    const changes = effect?.system?.changes ?? effect?.changes ?? effect?._source?.system?.changes ?? [];
    for (const change of changes) {
      const key = String(change?.key ?? "");
      if (!key.startsWith(prefix)) continue;
      const suffix = key.slice(prefix.length);
      const separator = suffix.indexOf(".");
      if (separator <= 0) continue;
      const flagKey = suffix.slice(0, separator);
      const path = suffix.slice(separator + 1);
      if (!flagKey || !path) continue;
      if (!options[flagKey] || typeof options[flagKey] !== "object") options[flagKey] = {};
      // Reconstruct individual AC leaves from changes later in collectExternalACSelectors,
      // which supports a scalar `ac` and nested `ac.*` selectors coexisting in one effect.
      try {
        const parts = path.split(".");
        let cursor = options[flagKey];
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!cursor[part] || typeof cursor[part] !== "object") cursor[part] = {};
          cursor = cursor[part];
        }
        cursor[parts[parts.length - 1]] = change.value;
      } catch (_) { /* Ignore an invalid option key; other options can still be read. */ }
    }
  }
  return options;
}

/**
 * Check an Actor's complete embedded Item collection, not just carried inventory.
 * D&D5e Actor.items contains embedded spells, feats/features, equipment, class items,
 * and other owned Item documents. A string matches an item name case-insensitively
 * (exact match by default), or an exact UUID/ID. Optional matchMode may be "partial".
 */
function externalActorHasItem(actor, search, matchMode = "exact") {
  if (!actor?.items || search === undefined || search === null) return false;
  const query = String(search).trim();
  if (!query) return false;
  const mode = String(matchMode ?? "exact").toLowerCase();
  const qLower = query.toLocaleLowerCase();
  try {
    return Array.from(actor.items).some(item => {
      if (!item) return false;
      const uuid = String(item.uuid ?? "").toLocaleLowerCase();
      const id = String(item.id ?? item._id ?? "").toLocaleLowerCase();
      const name = String(item.name ?? "").toLocaleLowerCase();
      if (uuid === qLower || id === qLower) return true;
      if (mode === "partial") return name.includes(qLower);
      return name === qLower;
    });
  } catch (err) {
    debug("Actor item lookup failed; treating item.has as false.", { actor: actor?.name, search, err });
    return false;
  }
}

function makeExternalItemConditionHelper(actor) {
  return Object.freeze({
    /** True when the actor owns an embedded Item matching the name, UUID, or ID. */
    has: (search, matchMode = "exact") => externalActorHasItem(actor, search, matchMode)
  });
}

function dispositionMatches(reactor, referenceToken, qualifier) {
  if (!qualifier) return true;
  const dispositions = CONST.TOKEN_DISPOSITIONS;
  const reactorDisposition = getDisposition(reactor?.token, reactor?.actor);
  const referenceActor = referenceToken?.actor ?? referenceToken?.document?.actor ?? null;
  const referenceDisposition = getDisposition(referenceToken, referenceActor);
  const neutralOrSecret = [dispositions.NEUTRAL, dispositions.SECRET].includes(reactorDisposition)
    || [dispositions.NEUTRAL, dispositions.SECRET].includes(referenceDisposition);
  if (neutralOrSecret) return qualifier === "friendly";
  if (reactorDisposition === referenceDisposition) return qualifier === "friendly";
  const opposingFriendlyHostile = (reactorDisposition === dispositions.FRIENDLY && referenceDisposition === dispositions.HOSTILE)
    || (reactorDisposition === dispositions.HOSTILE && referenceDisposition === dispositions.FRIENDLY);
  if (opposingFriendlyHostile) return qualifier === "enemy";
  // For unexpected/custom dispositions, don't classify a mismatch as an enemy.
  return qualifier === "friendly";
}

/**
 * Calculate distance between the reactor token and another token.
 * Prefer Midi-QoL's getDistance so the active distance-measurement mode, token sizes,
 * grid units, and configured fudge factor match Midi's own range checks. Walls are not
 * applied here; visibility / line-of-sight is evaluated independently by CanSee.
 * Returns undefined if either token or a usable distance value is unavailable.
 */
function getExternalActivationRange(midi, reactorToken, referenceToken) {
  if (!reactorToken || !referenceToken || typeof midi?.getDistance !== "function") return undefined;
  try {
    const distance = midi.getDistance(reactorToken, referenceToken, {
      wallsBlock: false,
      includeCover: false
    });
    return Number.isFinite(distance) && distance >= 0 ? distance : undefined;
  } catch (err) {
    debug("Range evaluation failed; range is unavailable.", err);
    return undefined;
  }
}

/**
 * Normalize a convenient negated disposition comparison such as
 * `!actor.disposition == "hostile"` to the ordinary JS comparison
 * `actor.disposition != "hostile"` before Midi-QoL evaluates it.
 *
 * This syntax is intentionally treated as shorthand for negating the comparison.
 * In ordinary JavaScript, unary `!` binds before `==`, so without normalization it
 * would negate the disposition object itself and compare the resulting boolean.
 * Standard expressions such as `actor.disposition != "hostile"` and
 * `!(actor.disposition == "hostile")` remain unchanged.
 */
function normalizeNegatedDispositionComparisons(expression) {
  const inverseOperator = { "==": "!=", "===": "!==", "!=": "==", "!==": "===" };
  const shorthandPattern = /(?<![\w=!])!\s*((?:actor|target)\s*\.\s*disposition)\s*(===|!==|==|!=)\s*(["'])(.*?)\3/g;
  let normalized = String(expression ?? "").replace(shorthandPattern, (_match, path, operator, quote, value) => {
    const normalizedPath = path.replace(/\s+/g, "");
    return `${normalizedPath} ${inverseOperator[operator]} ${quote}${value}${quote}`;
  });

  // `disposition` is a wrapper that provides .in(...). Loose == / != use its
  // primitive value, but strict comparisons require comparing the wrapper's .value.
  const strictComparisonPattern = /((?:actor|target)\s*\.\s*disposition)\s*(===|!==)\s*(["'])(.*?)\3/g;
  normalized = normalized.replace(strictComparisonPattern, (_match, path, operator, quote, value) => {
    return `${path.replace(/\s+/g, "")}.value ${operator} ${quote}${value}${quote}`;
  });
  return normalized;
}

/**
 * Normalize actor-reference comparisons such as `actor == self` and
 * `target == self` to UUID comparisons. The activation context intentionally uses
 * roll-data wrappers instead of the original Actor documents, so direct object
 * equality would compare wrapper identity rather than creature identity. `target`
 * exposes `actorUuid` separately because its `uuid` identifies the token.
 *
 * For user convenience, the shorthand `!actor == self` / `!target == self` means
 * the negation of the whole equality test, i.e. identity inequality. Prefer `actor !=
 * self` or `!(actor == self)` when writing new conditions.
 */
function normalizeActorIdentityComparisons(expression) {
  const inverseOperator = { "==": "!=", "===": "!==", "!=": "==", "!==": "===" };
  const identityPath = (reference) => reference === "target" ? "target.actorUuid" : `${reference}.uuid`;
  const shorthandPattern = /(?<![\w=!])!\s*(actor|target|self)\s*(===|!==|==|!=)\s*(actor|target|self)\b/g;
  let normalized = String(expression ?? "").replace(shorthandPattern, (_match, left, operator, right) => {
    return `${identityPath(left)} ${inverseOperator[operator]} ${identityPath(right)}`;
  });
  const comparisonPattern = /(?<![\w.])\b(actor|target|self)\s*(===|!==|==|!=)\s*\b(actor|target|self)\b/g;
  normalized = normalized.replace(comparisonPattern, (_match, left, operator, right) => {
    return `${identityPath(left)} ${operator} ${identityPath(right)}`;
  });
  return normalized;
}

/**
 * Evaluate an External Reaction optional flag's Midi-QoL-style activation expression.
 *
 * `self` remains the reactor (the owner of the optional flag). `actor` is the initiating
 * actor for the triggering workflow, while `target` is the actor the reaction concerns:
 * attacked creature for attacks/AC, saving creature for saves, checking creature for
 * checks/skills, and the affected target for damage. This explicit split avoids ambiguous
 * target semantics in third-party reactions.
 */
async function evaluateExternalActivation(reactor, workflow, referenceToken, context = {}, midi = game.modules.get("midi-qol")?.api) {
  const rawExpression = reactor?.flagData?.activation;
  if (rawExpression === undefined || rawExpression === null || rawExpression === "") return true;
  if (rawExpression === true) return true;
  if (rawExpression === false) return false;
  if (typeof rawExpression === "string" && rawExpression.trim() === "") return true;
  // Normalize the user-friendly negated-comparison shorthand before calling Midi's
  // evaluator, while leaving the standard JavaScript expression grammar intact.
  const expression = typeof rawExpression === "string"
    ? normalizeActorIdentityComparisons(normalizeNegatedDispositionComparisons(rawExpression))
    : rawExpression;
  if (!midi?.createConditionData || !midi?.evalCondition) {
    warn("Midi-QoL condition evaluation API unavailable; activation condition rejected.", { actor: reactor?.actor?.name });
    return false;
  }

  const reactorToken = normalizeToken(reactor?.token) ?? findTokenForActor(reactor?.actor);
  const targetToken = normalizeToken(referenceToken) ?? normalizeToken(context?.actionTargetToken);
  const targetActor = targetToken?.actor ?? targetToken?.document?.actor ?? null;
  const actionActorToken = normalizeToken(context?.actionActorToken)
    ?? getWorkflowToken(workflow)
    ?? findTokenForActor(context?.actionActor ?? workflow?.actor);
  const actionActor = context?.actionActor ?? actionActorToken?.actor ?? workflow?.actor ?? null;
  // Missing actor context must not pass an item-presence condition merely because Midi's
  // native optional-condition error fallback is permissive.
  if (/\btarget\s*\./i.test(String(expression)) && !targetActor) {
    debug("Activation condition references target data, but the action target is unavailable; condition rejected.", { expression });
    return false;
  }
  if (/\bactor\s*\./i.test(String(expression)) && !actionActor) {
    debug("Activation condition references actor data, but the initiating actor is unavailable; condition rejected.", { expression });
    return false;
  }
  if (/\bself\s*\.\s*item\s*\.\s*has\s*\(/i.test(String(expression)) && !reactor?.actor) {
    debug("Activation condition uses self.item.has, but the reactor actor is unavailable; condition rejected.");
    return false;
  }
  // The legacy bare `range` continues to mean reactor-to-action-target distance.
  // The explicit actor.range and target.range aliases let conditions choose the other
  // endpoint without changing existing worlds' behavior.
  const targetRange = getExternalActivationRange(midi, reactorToken, targetToken);
  const actorRange = getExternalActivationRange(midi, reactorToken, actionActorToken);
  const expressionText = String(expression);
  const usesBareRange = /(?<![.\w])range\b/i.test(expressionText);
  const usesActorRange = /\bactor\s*\.\s*range\b/i.test(expressionText);
  const usesTargetRange = /\btarget\s*\.\s*range\b/i.test(expressionText);
  // Avoid JS's coercion of undefined in comparisons when a referenced token distance
  // is unavailable. Only require the specific distance(s) the expression actually uses.
  if ((usesBareRange && !Number.isFinite(targetRange))
      || (usesActorRange && !Number.isFinite(actorRange))
      || (usesTargetRange && !Number.isFinite(targetRange))) {
    debug("Activation condition references a range whose token distance is unavailable; condition rejected.", {
      reactor: reactor?.actor?.name,
      actor: actionActor?.name,
      target: targetActor?.name,
      targetRange,
      actorRange,
      expression
    });
    return false;
  }
  let canSeeTarget = false;
  let targetCanSeeReactor = false;
  try {
    // forceVision asks Midi to evaluate the token's vision even when the token's own
    // Foundry vision toggle is disabled; Midi still accounts for LOS, scene lighting,
    // detection modes, and Foundry's blinded-vision handling.
    if (reactorToken && targetToken && typeof midi.canSee === "function") {
      canSeeTarget = !!midi.canSee(reactorToken, targetToken, { forceVision: true });
      targetCanSeeReactor = !!midi.canSee(targetToken, reactorToken, { forceVision: true });
    }
  } catch (err) {
    debug("CanSee evaluation failed; using false for visibility.", err);
    canSeeTarget = false;
    targetCanSeeReactor = false;
  }

  let conditionData;
  try {
    // Do NOT pass the triggering Midi workflow as `workflow` to createConditionData:
    // that would make its actor (usually the attacker) the root roll-data actor. The
    // reaction owner's actor must supply the root values; we add the triggering workflow
    // as a context variable afterwards.
    conditionData = midi.createConditionData({
      actor: reactor.actor,
      token: reactorToken,
      target: targetToken
    }) ?? {};
  } catch (err) {
    error("Midi-QoL could not create activation-condition data.", err);
    return false;
  }

  const actionItem = workflow?.item ?? workflow?.activity?.item ?? context?.item ?? null;
  const actionActivity = workflow?.activity ?? context?.activity ?? null;
  let itemData;
  try {
    const itemRollData = actionItem?.getRollData?.();
    itemData = itemRollData?.item ?? itemRollData ?? actionItem?.system ?? actionItem ?? undefined;
  } catch (_) {
    itemData = actionItem ?? undefined;
  }
  if (itemData !== undefined) {
    conditionData.item = itemData;
    if (actionActivity && conditionData.item && typeof conditionData.item === "object") {
      try {
        Object.defineProperty(conditionData.item, "actionType", {
          configurable: true,
          get: () => actionActivity.actionType ?? actionActivity.system?.actionType
        });
      } catch (_) { /* Roll data may be immutable; item.actionType remains available when supplied by Midi. */ }
    }
  }
  if (actionActivity) {
    conditionData.activity = actionActivity;
    conditionData.a = actionActivity;
  }
  if (workflow) {
    conditionData.workflow = workflow;
    conditionData.w = workflow;
  }

  const actor = reactor.actor;
  const actorRollData = actor?.getRollData?.() ?? {};
  const actorFlags = actor?.flags?.toObject?.() ?? actor?.flags ?? {};
  // Midi-QoL sets the legacy `flags.midiqol` alias in some of its own condition contexts.
  // Clone the plain flag data so adding that alias never mutates the Actor document.
  conditionData.flags = foundry.utils.deepClone(actorFlags);
  conditionData.flags.midiqol = conditionData.flags["midi-qol"] ?? conditionData.flags.midiqol;
  conditionData.source = {
    ...actorRollData,
    name: actor?.name,
    id: actor?.id,
    uuid: actor?.uuid,
    system: actor?.system,
    flags: conditionData.flags,
    effects: actor?.effects,
    appliedEffects: actor?.appliedEffects,
    statuses: actor?.statuses,
    items: actor?.items?.map(i => i.getRollData?.().item ?? i) ?? [],
    equippedItems: actor?.items?.filter(i => i.system?.equipped).map(i => i.getRollData?.().item ?? i) ?? []
  };
  // Actor-aware helpers deliberately inspect the entire embedded Item collection, not
  // just carried inventory. This includes spells, feats/features, equipment, class
  // items, and other Item documents actually owned by the Actor.
  conditionData.self = {
    ...actorRollData,
    name: actor?.name,
    id: actor?.id,
    uuid: actor?.uuid,
    system: actor?.system,
    flags: conditionData.flags,
    effects: actor?.effects,
    appliedEffects: actor?.appliedEffects,
    statuses: actor?.statuses,
    items: actor?.items?.map(i => i.getRollData?.().item ?? i) ?? [],
    item: makeExternalItemConditionHelper(actor)
  };

  // Keep explicit reactor aliases for ownership/count context. The root `self` remains
  // the reactor; `actor` is intentionally reassigned below to the initiating actor.
  conditionData.reactor = actor;
  conditionData.reactorActor = actor;
  conditionData.reactorToken = reactorToken;
  conditionData.reactorActorUuid = actor?.uuid;
  conditionData.reactorActorId = actor?.id;
  conditionData.actorUuid = actionActor?.uuid ?? conditionData.actorUuid;
  conditionData.actorId = actionActor?.id ?? conditionData.actorId;
  conditionData.actorToken = actionActorToken;
  conditionData.targetToken = targetToken;
  conditionData.itemUuid = actionItem?.uuid;
  conditionData.targetUuid = targetToken?.document?.uuid ?? targetActor?.uuid ?? conditionData.targetUuid;
  conditionData.targetId = targetToken?.id ?? targetToken?.document?.id ?? conditionData.targetId;

  const buildActorConditionData = (documentActor, token) => {
    if (!documentActor) return {};
    const rollData = documentActor.getRollData?.() ?? {};
    const actorFlags = foundry.utils.deepClone(documentActor.flags?.toObject?.() ?? documentActor.flags ?? {});
    actorFlags.midiqol = actorFlags["midi-qol"] ?? actorFlags.midiqol;
    const items = documentActor.items?.map(i => i.getRollData?.().item ?? i) ?? [];
    return {
      ...rollData,
      name: documentActor.name,
      id: documentActor.id,
      uuid: documentActor.uuid,
      system: documentActor.system,
      flags: foundry.utils.deepClone(actorFlags),
      effects: documentActor.effects,
      appliedEffects: documentActor.appliedEffects,
      statuses: documentActor.statuses,
      items,
      equippedItems: items.filter?.(item => item?.equipped) ?? [],
      item: makeExternalItemConditionHelper(documentActor),
      disposition: makeDispositionConditionValue(token, documentActor),
      dispositionName: getDispositionName(token, documentActor),
      tokenId: token?.id ?? token?.document?.id,
      tokenUuid: token?.document?.uuid ?? token?.uuid,
      isCombatTurn: game.combat?.combatant?.tokenId === (token?.id ?? token?.document?.id)
    };
  };

  // Native Midi condition data's actor normally describes the workflow initiator. Restore
  // that convention explicitly, while `self` describes the reactor who owns the flag.
  conditionData.actor = actionActor
    ? { ...(conditionData.actor ?? {}), ...buildActorConditionData(actionActor, actionActorToken) }
    : {};

  if (conditionData.target && targetActor) {
    conditionData.target = { ...conditionData.target, ...buildActorConditionData(targetActor, targetToken) };
    conditionData.target.name = targetToken?.name ?? targetActor.name;
    conditionData.target.id = targetToken?.id ?? targetToken?.document?.id;
    conditionData.target.uuid = targetToken?.document?.uuid ?? targetActor.uuid;
    conditionData.target.actorUuid = targetActor.uuid;
    conditionData.target.disposition = makeDispositionConditionValue(targetToken, targetActor);
    conditionData.target.dispositionName = getDispositionName(targetToken, targetActor);
    conditionData.target.effects ??= targetActor.effects;
    conditionData.target.appliedEffects ??= targetActor.appliedEffects;
    conditionData.target.statuses ??= targetActor.statuses;
    conditionData.target.flags ??= foundry.utils.deepClone(targetActor.flags?.toObject?.() ?? targetActor.flags ?? {});
    conditionData.target.flags.midiqol = conditionData.target.flags["midi-qol"] ?? conditionData.target.flags.midiqol;
    conditionData.target.items ??= targetActor.items?.map(i => i.getRollData?.().item ?? i) ?? [];
    conditionData.target.equippedItems ??= conditionData.target.items.filter?.(i => i?.equipped) ?? [];
    conditionData.target.canSee = targetCanSeeReactor;
    if (Number.isFinite(targetRange)) conditionData.target.range = targetRange;
    conditionData.target.item = makeExternalItemConditionHelper(targetActor);
  }

  if (conditionData.actor && Number.isFinite(actorRange)) conditionData.actor.range = actorRange;
  if (Number.isFinite(targetRange)) conditionData.range = targetRange;
  // Support both spellings in activation expressions. Existing examples use CanSee,
  // while users may naturally write canSee; both must resolve to the same visibility result.
  conditionData.CanSee = canSeeTarget;
  conditionData.canSee = canSeeTarget;
  // Friendly/enemy and range/CanSee now describe the reaction's actual target. Use
  // actor.disposition / target.disposition when the expression needs to inspect both sides.
  conditionData.friendly = dispositionMatches(reactor, targetToken, "friendly");
  conditionData.enemy = dispositionMatches(reactor, targetToken, "enemy");
  conditionData.actorFriendly = dispositionMatches(reactor, actionActorToken, "friendly");
  conditionData.actorEnemy = dispositionMatches(reactor, actionActorToken, "enemy");
  conditionData.actionType = context.actionType ?? actionActivity?.actionType ?? actionItem?.system?.actionType;
  if (conditionData.actor && typeof conditionData.actor === "object") {
    conditionData.actor.isCombatTurn = game.combat?.combatant?.tokenId === (actionActorToken?.id ?? actionActorToken?.document?.id);
  }
  conditionData.isCombatTurn = game.combat?.combatant?.tokenId === reactorToken?.id;
  if (conditionData.target) {
    conditionData.target.isCombatTurn = game.combat?.combatant?.tokenId === targetToken?.id;
    if (context.actionKind === "attack" && ["fail", "success"].includes(context.phase)) {
      conditionData.target.isHit = context.phase === "success";
    }
    if (context.actionKind === "save" && ["fail", "success"].includes(context.phase)) {
      conditionData.target.saved = context.phase === "success";
      conditionData.target.failedSave = context.phase === "fail";
    }
  }
  conditionData.externalReactionAction = context.actionKind ?? "unknown";
  conditionData.externalReactionPhase = context.phase ?? "normal";
  conditionData.ability = context.ability ?? conditionData.ability;
  conditionData.dc = context.dc ?? conditionData.dc;
  conditionData.roll = context.roll ?? conditionData.roll;
  conditionData.isAttack = context.actionKind === "attack";
  conditionData.isSave = context.actionKind === "save";
  conditionData.isCheck = context.actionKind === "check";
  conditionData.isSkill = context.actionKind === "skill";
  conditionData.isDamage = context.actionKind === "damage";
  conditionData.isACBonus = context.actionKind === "ac";
  conditionData.isAttackFail = conditionData.isAttack && context.phase === "fail";
  conditionData.isAttackSuccess = conditionData.isAttack && context.phase === "success";
  conditionData.isHit = conditionData.isAttack && context.phase === "success" ? true
    : conditionData.isAttack && context.phase === "fail" ? false : undefined;
  conditionData.isMiss = conditionData.isAttack && context.phase === "fail" ? true
    : conditionData.isAttack && context.phase === "success" ? false : undefined;
  conditionData.isSaveSuccess = conditionData.isSave && context.phase === "success";
  conditionData.isSaveFail = conditionData.isSave && context.phase === "fail";
  conditionData.isSaveFailure = conditionData.isSaveFail;
  conditionData.isCheckSuccess = conditionData.isCheck && context.phase === "success";
  conditionData.isCheckFail = conditionData.isCheck && context.phase === "fail";

  try {
    // Activation conditions can restrict whether an optional is offered. Fail closed on
    // evaluation errors: an unknown variable or malformed expression must never bypass
    // a range/visibility restriction by being treated as true.
    const result = await midi.evalCondition(expression, conditionData, { errorReturn: false, async: true });
    const allowed = !!result;
    debug("Evaluated optional activation condition.", {
      actor: actionActor?.name,
      target: targetActor?.name,
      reactor: actor?.name,
      expression: rawExpression,
      normalizedExpression: expression,
      allowed,
      action: conditionData.externalReactionAction,
      phase: conditionData.externalReactionPhase,
      friendly: conditionData.friendly,
      enemy: conditionData.enemy,
      actorDisposition: getDispositionName(actionActorToken, actionActor),
      targetDisposition: getDispositionName(targetToken, targetActor),
      CanSee: conditionData.CanSee,
      range: conditionData.range,
      actorRange: conditionData.actor?.range,
      targetRange: conditionData.target?.range
    });
    return allowed;
  } catch (err) {
    error("Could not evaluate External Reaction activation condition.", err);
    // Do not offer the optional when its activation condition cannot be evaluated.
    return false;
  }
}

function getWorkflowToken(workflow) {
  const direct = normalizeToken(workflow?.token);
  if (direct?.actor?.uuid === workflow?.actor?.uuid) return direct;
  if (workflow?.tokenUuid) {
    try {
      const document = fromUuidSync(workflow.tokenUuid);
      const token = normalizeToken(document);
      if (token) return token;
    } catch (_) { /* Try the active scene tokens below. */ }
  }
  return findTokenForActor(workflow?.actor);
}

function getSaveTargetTokens(workflow) {
  return [...new Set([
    ...(workflow?.hitTargets ?? []),
    ...(workflow?.hitTargetsEC ?? []),
    ...(workflow?.targets ?? [])
  ])].filter(token => token?.actor);
}

function collectSceneActors(preferredTokens = []) {
  const actorMap = new Map();
  let sceneTokenDocuments = [];
  try {
    const sceneTokens = canvas?.scene?.tokens;
    if (sceneTokens) sceneTokenDocuments = Array.from(sceneTokens);
  } catch (_) { /* Rendered token placeables are the fallback. */ }
  // Prefer action targets first (so a reactor token that is also the defended token is
  // represented accurately), then rendered tokens, then scene TokenDocuments that may not
  // currently have a placeable on canvas.
  for (const tokenLike of [...preferredTokens, ...(canvas?.tokens?.placeables ?? []), ...sceneTokenDocuments]) {
    const token = normalizeToken(tokenLike);
    const actor = token?.actor ?? token?.document?.actor;
    if (!actor) continue;
    const key = actor.uuid ?? actor.id;
    if (key && !actorMap.has(key)) actorMap.set(key, { actor, token });
  }
  return actorMap;
}

/* ------------------------------------------------------------------------- *
 * Triggered Activities and target selection
 * ------------------------------------------------------------------------- */

function escapeExternalActivityHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function activityCollection(item) {
  const activities = item?.system?.activities;
  if (!activities) return [];
  if (Array.isArray(activities.contents)) return activities.contents;
  try { return Array.from(activities); } catch (_) { return []; }
}

function findActivityOnItem(item, reference) {
  const text = String(reference ?? "").trim();
  if (!item || !text) return null;
  const activities = activityCollection(item);
  const idMatch = activities.find(activity => String(activity.id ?? activity._id ?? "") === text);
  if (idMatch) return idMatch;
  const identifierMatches = activities.filter(activity => String(activity.identifier ?? "").toLowerCase() === text.toLowerCase());
  if (identifierMatches.length === 1) return identifierMatches[0];
  const nameMatches = activities.filter(activity => String(activity.name ?? "").toLowerCase() === text.toLowerCase());
  return nameMatches.length === 1 ? nameMatches[0] : null;
}

async function findActorItemReference(actor, reference) {
  const text = String(reference ?? "").trim();
  if (!actor || !text) return null;
  const byId = actor.items?.get?.(text);
  if (byId) return byId;
  const byIdentifier = actor.items?.filter?.(item => String(item.identifier ?? "").toLowerCase() === text.toLowerCase()) ?? [];
  if (byIdentifier.length === 1) return byIdentifier[0];
  const byName = actor.items?.filter?.(item => String(item.name ?? "").toLowerCase() === text.toLowerCase()) ?? [];
  if (byName.length === 1) return byName[0];
  try {
    const resolved = await fromUuid(text);
    if (resolved?.documentName === "Item" && resolved.parent?.uuid === actor.uuid) return resolved;
    if (resolved?.documentName === "Item" && resolved.actor?.uuid === actor.uuid) return resolved;
  } catch (_) { /* The reference may be a name rather than a UUID. */ }
  return null;
}

/**
 * Resolve a triggered Activity from an activity UUID, ItemUUID::ActivityName,
 * ItemName::ActivityName, Item.<item reference>.<activity reference>, or a unique
 * Activity name on the reactor's actor.
 */
async function resolveExternalTriggeredActivity(actor, reference) {
  const raw = String(reference ?? "").trim();
  if (!raw) return null;
  const prefixedPath = /^Activity\./i.test(raw) ? raw.slice("Activity.".length) : raw;

  // Prefer a complete Activity UUID. Foundry resolves Actor/Item/Activity UUID paths.
  for (const candidate of [...new Set([raw, prefixedPath])]) {
    try {
      const byUuid = await fromUuid(candidate);
      if (byUuid && typeof byUuid.use === "function" && byUuid.item) return byUuid;
    } catch (_) { /* Try the supported name-based forms below. */ }
  }

  // Explicit UUID path support, useful on builds where fromUuid does not resolve an
  // Activity pseudo-document directly: Actor.<id>.Item.<id>.Activity.<id>.
  for (const candidate of [...new Set([raw, prefixedPath])]) {
    const activityPathIndex = candidate.lastIndexOf(".Activity.");
    if (activityPathIndex <= 0) continue;
    const itemUuid = candidate.slice(0, activityPathIndex);
    const activityRef = candidate.slice(activityPathIndex + ".Activity.".length);
    const item = await findActorItemReference(actor, itemUuid);
    const activity = findActivityOnItem(item, activityRef);
    if (activity) return activity;
  }

  // Names can contain spaces and dots. The double-colon separator avoids ambiguity.
  const explicitSeparator = prefixedPath.indexOf("::");
  if (explicitSeparator > 0) {
    const item = await findActorItemReference(actor, prefixedPath.slice(0, explicitSeparator));
    return findActivityOnItem(item, prefixedPath.slice(explicitSeparator + 2));
  }

  let path = prefixedPath;
  if (/^Item\./i.test(path)) path = path.slice(5);
  // Accept Item.<item name or id>.<activity name or id> by trying every split,
  // from right to left, so activity names containing dots remain possible.
  const splitPositions = [];
  for (let index = path.indexOf("."); index >= 0; index = path.indexOf(".", index + 1)) splitPositions.push(index);
  for (const splitIndex of splitPositions.reverse()) {
    const itemRef = path.slice(0, splitIndex);
    const activityRef = path.slice(splitIndex + 1);
    const item = await findActorItemReference(actor, itemRef);
    const activity = findActivityOnItem(item, activityRef);
    if (activity) return activity;
  }

  // A bare Activity name/identifier is supported only when unique on the actor.
  const matches = activityCollectionForActor(actor).filter(activity => {
    return String(activity.id ?? activity._id ?? "") === path
      || String(activity.identifier ?? "").toLowerCase() === path.toLowerCase()
      || String(activity.name ?? "").toLowerCase() === path.toLowerCase();
  });
  return matches.length === 1 ? matches[0] : null;
}

function activityCollectionForActor(actor) {
  return Array.from(actor?.items ?? []).flatMap(item => activityCollection(item));
}

async function evaluateExternalActivityNumber(rawValue, actor) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return undefined;
  const text = String(rawValue).trim();
  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;
  try {
    const roll = await new Roll(text, actor?.getRollData?.() ?? {}).evaluate();
    return Number.isFinite(roll.total) ? Number(roll.total) : undefined;
  } catch (_) { return undefined; }
}

function distanceUnitFactorToFeet(unit) {
  const normalized = String(unit ?? "").trim().toLowerCase().replace(/[.\s]/g, "");
  const factors = {
    ft: 1, foot: 1, feet: 1,
    yd: 3, yard: 3, yards: 3,
    mi: 5280, mile: 5280, miles: 5280,
    m: 3.280839895, meter: 3.280839895, meters: 3.280839895, metre: 3.280839895, metres: 3.280839895,
    km: 3280.839895, kilometer: 3280.839895, kilometers: 3280.839895,
    cm: 0.03280839895, centimeter: 0.03280839895, centimeters: 0.03280839895
  };
  return factors[normalized];
}

async function getExternalActivityRangeLimit(activity) {
  const range = activity?.range ?? {};
  const units = String(range.units ?? "").trim().toLowerCase();
  if (units === "self") return { selfOnly: true, maxDistance: 0 };
  if (units === "any" || units === "spec" || units === "special" || units === "unlimited") return { selfOnly: false, maxDistance: Infinity };
  let rawValue = range.value;
  if (units === "touch" && (rawValue === null || rawValue === undefined || String(rawValue).trim() === "")) rawValue = 5;
  const value = await evaluateExternalActivityNumber(rawValue, activity?.item?.actor);
  if (!Number.isFinite(value) || value < 0) return { selfOnly: false, maxDistance: Infinity };
  const sourceFactor = distanceUnitFactorToFeet(units === "touch" ? "ft" : units);
  const sceneUnits = canvas?.scene?.grid?.units || "ft";
  const sceneFactor = distanceUnitFactorToFeet(sceneUnits);
  if (sourceFactor && sceneFactor) return { selfOnly: false, maxDistance: value * sourceFactor / sceneFactor };
  // If the system uses a custom unit unknown to the converter, both Midi's distance
  // and the activity range are left in scene units where possible.
  return { selfOnly: false, maxDistance: value };
}

function getExternalActivityTargetType(activity) {
  return String(activity?.target?.affects?.type ?? activity?.target?.type ?? "creature").trim().toLowerCase();
}

async function getExternalActivityTargetLimit(activity) {
  const raw = activity?.target?.affects?.count;
  const value = await evaluateExternalActivityNumber(raw, activity?.item?.actor);
  if (!Number.isFinite(value)) return Infinity;
  return Math.max(1, Math.floor(value));
}

function getExternalSceneTokens() {
  const byId = new Map();
  const sceneDocs = Array.from(canvas?.scene?.tokens ?? []);
  const placeables = canvas?.tokens?.placeables ?? [];
  for (const tokenLike of [...placeables, ...sceneDocs]) {
    const normalized = normalizeToken(tokenLike);
    const tokenId = normalized?.id ?? normalized?.document?.id;
    if (!tokenId) continue;
    const token = canvas?.tokens?.get?.(tokenId) ?? normalized?.object ?? normalized;
    const actor = token?.actor ?? token?.document?.actor;
    if (!actor) continue;
    byId.set(tokenId, token);
  }
  return [...byId.values()];
}

async function collectExternalActivityTargets(activity, reactorToken, midi) {
  const actor = activity?.item?.actor;
  const type = getExternalActivityTargetType(activity);
  const range = await getExternalActivityRangeLimit(activity);
  const maxTargets = await getExternalActivityTargetLimit(activity);
  if (type === "self") {
    return { type, maxTargets, candidates: reactorToken ? [reactorToken] : [], range };
  }

  const targetMustBeSeen = !!activity?.midiProperties?.targetMustBeSeen;
  let mechanicSetting = "enforce";
  try {
    const config = midi?.configSettings ?? game.settings.get("midi-qol", "ConfigSettings");
    mechanicSetting = String(config?.optionalRules?.targetMustBeSeen ?? "enforce").toLowerCase();
  } catch (_) { /* Use Midi-QoL's documented default. */ }
  const enforceVision = targetMustBeSeen && mechanicSetting === "enforce";
  const reactorId = reactorToken?.id ?? reactorToken?.document?.id;
  const candidates = [];
  for (const token of getExternalSceneTokens()) {
    const tokenId = token?.id ?? token?.document?.id;
    const tokenActor = token?.actor ?? token?.document?.actor;
    if (!tokenId || !tokenActor) continue;
    if (!game.user.isGM && token?.document?.hidden) continue;
    const sameToken = tokenId === reactorId;
    if (range.selfOnly && !sameToken) continue;
    if (!sameToken && Number.isFinite(range.maxDistance)) {
      const distance = getExternalActivationRange(midi, reactorToken, token);
      if (!Number.isFinite(distance) || distance > range.maxDistance + 0.001) continue;
    }
    if (type === "ally" && getDispositionName(token, tokenActor) !== "friendly") continue;
    if (type === "enemy" && getDispositionName(token, tokenActor) !== "hostile") continue;
    if (enforceVision && !sameToken) {
      let canSee = false;
      try { canSee = typeof midi?.canSee === "function" && !!midi.canSee(reactorToken, token, { forceVision: true }); }
      catch (_) { canSee = false; }
      if (!canSee) continue;
    }
    candidates.push(token);
  }
  return { type, maxTargets, candidates, range, targetMustBeSeen, mechanicSetting };
}

async function chooseExternalActivityTargets(activity, candidates, maxTargets) {
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (!DialogV2?.wait) throw new Error("Foundry DialogV2.wait is unavailable.");
  if (!candidates.length) {
    ui.notifications?.warn(`External Reaction: no eligible targets were found for ${activity.item.name} — ${activity.name}.`);
    return null;
  }
  const limitLabel = Number.isFinite(maxTargets) ? String(maxTargets) : "any number";
  while (true) {
    const selected = new Set();
    const rows = candidates.map(token => {
      const id = token.id ?? token.document?.id;
      const name = token.name ?? token.document?.name ?? token.actor?.name ?? "Unknown token";
      const disposition = getDispositionName(token, token.actor);
      const dispositionLabel = disposition.charAt(0).toUpperCase() + disposition.slice(1);
      return `<label style="display:flex;align-items:center;gap:0.6rem;padding:0.3rem 0.1rem;border-bottom:1px solid var(--color-border-light-2);cursor:pointer;"><input type="checkbox" data-external-reaction-target="${escapeExternalActivityHTML(id)}"><span style="flex:1;">${escapeExternalActivityHTML(name)}</span><small style="opacity:.7;">${escapeExternalActivityHTML(dispositionLabel)}</small></label>`;
    }).join("");
    const result = await DialogV2.wait({
      window: { title: `${activity.item.name} — ${activity.name}` },
      classes: ["external-reaction", "external-reaction-target-selector"],
      position: { width: 460 },
      content: `<div class="external-reaction-target-selector"><p>Select at least one target, up to ${escapeExternalActivityHTML(limitLabel)}.</p><div style="max-height:340px;overflow-y:auto;">${rows}</div><p data-external-reaction-count style="margin-top:.6rem;opacity:.8;">0 selected</p></div>`,
      buttons: [
        { action: "use", label: "Use Activity", icon: "fas fa-check", callback: () => true },
        { action: "cancel", label: "Cancel", icon: "fas fa-xmark", callback: () => false }
      ],
      default: "cancel",
      render: (_event, dialog) => {
        const root = dialog.element?.[0] ?? dialog.element;
        const checkboxes = [...(root?.querySelectorAll?.("input[data-external-reaction-target]") ?? [])];
        const countLabel = root?.querySelector?.("[data-external-reaction-count]");
        for (const checkbox of checkboxes) {
          checkbox.addEventListener("change", () => {
            const id = checkbox.getAttribute("data-external-reaction-target");
            if (checkbox.checked) {
              if (Number.isFinite(maxTargets) && selected.size >= maxTargets) {
                checkbox.checked = false;
                ui.notifications?.warn(`Select no more than ${maxTargets} target${maxTargets === 1 ? "" : "s"}.`);
                return;
              }
              selected.add(id);
            } else selected.delete(id);
            if (countLabel) countLabel.textContent = `${selected.size} selected`;
          });
        }
      }
    });
    if (result !== true) return null;
    if (selected.size >= 1 && (!Number.isFinite(maxTargets) || selected.size <= maxTargets)) {
      const selectedTokens = candidates.filter(token => selected.has(String(token.id ?? token.document?.id)));
      if (selectedTokens.length) return selectedTokens;
    }
    ui.notifications?.warn("Select at least one eligible target before using this activity.");
  }
}

async function runExternalTriggeredActivity({ actorUuid, tokenUuid, trigger }) {
  const actor = await fromUuid(actorUuid);
  if (!actor?.items) throw new Error(`Could not resolve the reactor Actor: ${actorUuid}`);
  const reference = String(trigger ?? "").trim();
  const activity = await resolveExternalTriggeredActivity(actor, reference);
  if (!activity) {
    ui.notifications?.error(`External Reaction: couldn't resolve Activity '${reference}'. Use an Activity UUID or an item/activity reference.`);
    warn("Triggered Activity could not be resolved.", { actor: actor.name, trigger: reference });
    return false;
  }
  if (activity.item?.actor?.uuid !== actor.uuid) {
    ui.notifications?.error(`External Reaction: Activity '${activity.name}' must belong to the reactor's Actor (${actor.name}).`);
    warn("Triggered Activity belongs to a different Actor; not executing it.", { reactor: actor.name, activityActor: activity.item?.actor?.name, trigger: reference });
    return false;
  }
  if (!activity.item?.isEmbedded) {
    ui.notifications?.error(`External Reaction: Activity '${activity.name}' must be on an embedded Item owned by ${actor.name}.`);
    return false;
  }

  let tokenDocument = null;
  try { tokenDocument = tokenUuid ? await fromUuid(tokenUuid) : null; } catch (_) { /* Fall back to the actor's scene token. */ }
  const rawTokenId = tokenDocument?.id ?? tokenDocument?.document?.id;
  const reactorToken = (rawTokenId && canvas?.tokens?.get?.(rawTokenId))
    ?? normalizeToken(tokenDocument)
    ?? findTokenForActor(actor);
  if (!reactorToken?.actor) {
    ui.notifications?.error(`External Reaction: no scene token was found for ${actor.name}; cannot check Activity range/targets.`);
    return false;
  }
  const midi = game.modules.get("midi-qol")?.api;
  const templateType = String(activity.target?.template?.type ?? "").trim().toLowerCase();
  // Area activities should follow the normal Activity UI flow (template placement,
  // activation dialog, scaling, consumption, and subsequent actions remain system-owned).
  if (templateType && templateType !== "none") {
    await activity.use();
    return true;
  }

  const targeting = await collectExternalActivityTargets(activity, reactorToken, midi);
  if (targeting.type === "self") {
    if (!targeting.candidates.length) {
      ui.notifications?.warn(`External Reaction: no reactor token is available as a target for ${activity.name}.`);
      return false;
    }
  } else if (!targeting.candidates.length) {
    ui.notifications?.warn(`External Reaction: no eligible targets are within ${activity.range?.value ?? "the configured"} ${activity.range?.units ?? "range"} for ${activity.name}.`);
    return false;
  }

  let selectedTokens;
  if (targeting.type === "self") selectedTokens = targeting.candidates.slice(0, 1);
  else selectedTokens = await chooseExternalActivityTargets(activity, targeting.candidates, targeting.maxTargets);
  if (!selectedTokens?.length) return false;

  const selectedIds = selectedTokens.map(token => token.id ?? token.document?.id).filter(Boolean);
  if (!selectedIds.length) return false;
  // Foundry V14 no longer exposes game.user.updateTokenTargets(). Use the public
  // Token#setTarget API instead. The first target releases any previous targets;
  // subsequent targets are added without releasing the ones selected just before them.
  const targetPlaceables = selectedTokens.map(token => {
    const id = token?.id ?? token?.document?.id;
    return (id && canvas?.tokens?.get?.(id)) ?? normalizeToken(token);
  }).filter(token => typeof token?.setTarget === "function");
  if (!targetPlaceables.length) {
    throw new Error("Could not resolve any selected targets to Foundry Token placeables.");
  }
  for (const [index, token] of targetPlaceables.entries()) {
    token.setTarget(true, { releaseOthers: index === 0 });
  }
  await activity.use();
  return true;
}

function queueExternalTriggeredActivity(socket, reactor, workflow, trigger) {
  if (!workflow || !socket || !reactor?.actor || !reactor?.recipient?.id) return;
  const normalizedTrigger = String(trigger ?? "").trim();
  if (!normalizedTrigger) return;
  const reactorToken = normalizeToken(reactor?.token) ?? findTokenForActor(reactor?.actor);
  const tokenUuid = reactorToken?.document?.uuid ?? reactorToken?.uuid;
  workflow.__externalReactionPendingActivityTriggers ??= new Map();
  // The same optional flag can be accepted for multiple targets/counts during one
  // batch (e.g. an AOE save). It should open its Activity target selector only once
  // after the batch has completed, so deduplicate by reactor + option key + Activity.
  const key = `${reactor.actor.uuid}:${reactor.flagKey ?? ""}:${normalizedTrigger}`;
  if (workflow.__externalReactionPendingActivityTriggers.has(key)) return;
  workflow.__externalReactionPendingActivityTriggers.set(key, {
    actorUuid: reactor.actor.uuid,
    tokenUuid,
    trigger: normalizedTrigger,
    recipientId: reactor.recipient.id
  });
}

async function flushExternalTriggeredActivities(workflow, socket) {
  const pendingMap = workflow?.__externalReactionPendingActivityTriggers;
  if (!(pendingMap instanceof Map) || !pendingMap.size || !socket) return;
  // Clear before running activities: a triggered Activity may create a nested
  // workflow which queues its own independent Activity triggers.
  const pending = [...pendingMap.values()];
  pendingMap.clear();
  for (const trigger of pending) {
    try {
      const started = await socket.executeAsUser("triggerExternalActivity", trigger.recipientId, {
        actorUuid: trigger.actorUuid,
        tokenUuid: trigger.tokenUuid,
        trigger: trigger.trigger
      });
      if (started === false) debug("Triggered Activity did not start or was cancelled.", trigger);
    } catch (err) {
      error(`Could not trigger Activity '${trigger.trigger}' for ${trigger.actorUuid}.`, err);
    }
  }
}

/* ------------------------------------------------------------------------- *
 * Reaction prompts and saving-throw / attack roll integration
 * ------------------------------------------------------------------------- */

async function promptForReaction(socket, midi, reactor, workflow, roll, value, flagData, title) {
  let rollHTML = await midi.midiRenderRoll(roll);
  const rollMode = resolveExternalRollMode(flagData, roll);
  if (rollMode === "blindroll" && !reactor.recipient?.isGM) rollHTML = "Hidden Roll";
  const liveCountData = getLiveCountData(reactor.actor, flagData, reactor.flagKey) ?? flagData;
  const spellSlotMinimum = getSpellSlotMinimum(liveCountData);
  const response = await socket.executeAsUser("promptReaction", reactor.recipient.id, {
    actorName: workflow.actor?.name ?? "Unknown actor",
    itemName: workflow.item?.name ?? workflow.activity?.item?.name ?? "Unknown action",
    actorUuid: reactor.actor?.uuid,
    spellSlotMinimum,
    title,
    value,
    label: typeof flagData.label === "string" ? flagData.label : "",
    rollHTML,
    rollMode,
    timeout: Number(midi.configSettings?.reactionTimeout ?? game.settings.get("midi-qol", "ConfigSettings")?.reactionTimeout ?? 30)
  });
  const accepted = response === true || response?.accepted === true;
  if (!accepted) return false;
  const trigger = foundry.utils.getProperty(flagData, "activity.trigger");
  if (trigger !== undefined && trigger !== null && String(trigger).trim()) {
    // Do not show target selection while later targets / phases still have optional
    // reactions to resolve. The owning workflow flushes this queue after its full batch.
    queueExternalTriggeredActivity(socket, reactor, workflow, trigger);
  }
  // Return payment metadata so the post-prompt eligibility check doesn't reject the
  // reaction merely because its selected spell slot has now correctly been expended.
  return response?.spellSlotPaid ? { accepted: true, spellSlotPaid: true } : true;
}

async function modifySaveRoll(workflow, roll, value, reactor, flagKey, flagPath, target) {
  if (!roll) throw new Error("No saving throw roll is available to modify.");
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^ActivityMacro(?:\.|$)/.test(text)) {
    warn("ActivityMacro is intentionally unsupported for External Reaction optional bonuses.");
    return null;
  }
  const midi = game.modules.get("midi-qol")?.api;
  const saveRollData = { ...(target?.actor?.getRollData?.() ?? {}), ...(roll.data ?? {}) };
  let newRoll = roll;
  let applied = false;
  let macroSpec = text;
  const isMacro = /^(ItemMacro(?:\.|$)|Macro\.|function\.)/.test(text);
  if (isMacro) {
    if (text.startsWith("Macro.")) macroSpec = text.slice("Macro.".length);
    const macroData = workflow.getMacroData?.() ?? {};
    macroData.macroPass = `flags.${MODULE_ID}.optional.${flagKey}.${flagPath}`;
    macroData.workflow = workflow;
    macroData.tag = "optional";
    macroData.roll = roll;
    macroData.actor = reactor.actor;
    macroData.target = target;
    macroData.targetActor = target?.actor;
    const sourceEffect = findGrantingEffect(reactor.actor, flagKey);
    let macroItem = workflow.item;
    if (sourceEffect?.origin) {
      try {
        const origin = await fromUuid(sourceEffect.origin);
        if (origin instanceof Item) macroItem = origin;
        else if (origin instanceof ActiveEffect && origin.parent instanceof Item) macroItem = origin.parent;
        else if (origin?.item instanceof Item) macroItem = origin.item;
      } catch (_) { /* Fall back to the workflow item if the origin cannot be resolved. */ }
    }
    const result = await workflow.callMacro(macroItem, macroSpec, macroData, { roll, actor: reactor.actor, target, bonus: undefined });
    if (result instanceof Roll) { newRoll = result; applied = true; }
    else if (typeof result === "number" || (typeof result === "string" && result.trim() !== "")) {
      return modifySaveRoll(workflow, roll, String(result), reactor, flagKey, flagPath, target);
    }
  }
  if (!applied) {
    if (["reroll", "reroll-query", "reroll-kh", "reroll-kl", "reroll-max", "reroll-min"].includes(text)) {
      const opts = text === "reroll-max" ? { maximize: true } : text === "reroll-min" ? { minimize: true } : undefined;
      const reroll = await roll.reroll(opts);
      if (text === "reroll-query") {
        const accepted = await game.modules.get(MODULE_ID)?.api?.socket?.executeAsUser?.("confirmReroll", reactor.recipient.id, {
          originalHTML: await midi.midiRenderRoll(roll), rerollHTML: await midi.midiRenderRoll(reroll), timeout: 0
        });
        newRoll = accepted ? reroll : roll;
      } else if (text === "reroll-kh") newRoll = reroll.total > roll.total ? reroll : roll;
      else if (text === "reroll-kl") newRoll = reroll.total < roll.total ? reroll : roll;
      else newRoll = reroll;
      applied = true;
    } else if (text.startsWith("reroll-withBonus ")) {
      let bonusFormula = text.slice("reroll-withBonus ".length).trim();
      if (!bonusFormula.startsWith("+")) bonusFormula = `+ ${bonusFormula}`;
      newRoll = await new roll.constructor(`${roll.formula} ${bonusFormula}`, saveRollData).evaluate();
      applied = true;
    } else if (text.startsWith("replace ")) {
      newRoll = await new Roll(text.slice("replace ".length), saveRollData).evaluate();
      applied = true;
    } else if (text === "success" || text === "fail") {
      newRoll = await roll.clone().evaluate();
      const result = text === "success" ? 99 : -1;
      const firstDie = newRoll.terms?.find(term => term instanceof foundry.dice.terms.Die);
      if (firstDie?.results?.length) firstDie.results.forEach(r => { if (r.active) r.result = result; });
      newRoll._total = result;
      newRoll.options = foundry.utils.deepClone(roll.options ?? {});
      newRoll.options.success = text === "success";
      applied = true;
    } else if (text === "critical") {
      newRoll = CONFIG.Dice.D20Roll.fromRoll(roll);
      newRoll.options = foundry.utils.deepClone(roll.options ?? {});
      const die = newRoll.terms?.find(term => term instanceof foundry.dice.terms.Die);
      const activeResult = die?.results?.find(r => r.active)?.result ?? newRoll.total;
      if (die) {
        die.options ??= {};
        die.options.critical = activeResult;
        die.options.criticalSuccess = activeResult;
      }
      newRoll.options.criticalSuccess = activeResult;
      workflow.tracker?.critical?.force?.(`${flagKey}.${flagPath}`, "External Reaction optional bonus");
      applied = true;
    } else {
      // Match Midi-QoL's optional-bonus path: use its own addRollTo helper when available.
      // That helper evaluates operator terms before rebuilding the roll; omitting this can leave
      // the displayed formula/result out of sync with the success/failure calculation.
      const bonusRoll = await new Roll(text, saveRollData).evaluate();
      const copiedRoll = CONFIG.Dice.D20Roll.fromRoll(roll);
      if (typeof midi?.addRollTo === "function") {
        newRoll = midi.addRollTo(copiedRoll, bonusRoll);
      } else if (typeof globalThis.MidiQOL?.addRollTo === "function") {
        newRoll = globalThis.MidiQOL.addRollTo(copiedRoll, bonusRoll);
      } else {
        const OperatorTerm = foundry.dice.terms.OperatorTerm;
        // Fallback mirrors Midi-QoL's addRollTo: evaluated roll terms plus a genuinely evaluated operator.
        for (const term of [...copiedRoll.terms, ...bonusRoll.terms]) {
          if (term instanceof OperatorTerm && !term._evaluated) term.evaluate();
        }
        const terms = copiedRoll.terms.concat([new OperatorTerm({ operator: "+" })], bonusRoll.terms);
        terms[copiedRoll.terms.length].evaluate();
        newRoll = copiedRoll.constructor.fromTerms(terms);
        newRoll.resetFormula();
        newRoll.options = copiedRoll.options;
      }
      // Retain save-specific options and any roll metadata from the original D20 roll.
      newRoll.options = foundry.utils.mergeObject(
        foundry.utils.deepClone(roll.options ?? {}),
        foundry.utils.deepClone(newRoll.options ?? {}),
        { inplace: false }
      );
      applied = true;
    }
  }
  return applied ? newRoll : null;
}

async function determineSaveOutcome(workflow, target, rolls, context) {
  const result = Array.isArray(rolls) ? rolls : [rolls];
  const rollTotal = result.reduce((acc, r) => acc + (Number(r?.total) || 0), 0);
  const explicitTarget = result[0]?.options?.target;
  const dc = explicitTarget !== undefined && explicitTarget !== null && Number.isFinite(Number(explicitTarget))
    ? Number(explicitTarget) : Number(context?.rollDC ?? 0);
  const midi = game.modules.get("midi-qol")?.api;
  let isCritical = false;
  let isFumble = false;
  try {
    const criticalState = workflow.determineCriticalOrFumble?.(result[0], rollTotal) ?? {};
    isCritical = !!criticalState.isCritical;
    isFumble = !!criticalState.isFumble;
  } catch (_) { /* Fall back to the numeric DC check. */ }
  let coverBonus = 0;
  try {
    coverBonus = Number(await workflow.calculateCoverSaveBonus?.(target, context?.template, context?.rollAbility, context?.templateCoverOrigin) ?? 0);
  } catch (_) { coverBonus = 0; }
  let saved = coverBonus === Infinity || (rollTotal + (Number.isFinite(coverBonus) ? coverBonus : 0)) >= dc;
  if (midi?.checkRule?.("criticalSaves")) {
    saved = (isCritical || rollTotal + (Number.isFinite(coverBonus) ? coverBonus : 0) >= dc) && !isFumble;
  }
  if (workflow.checkSculptOrCarefulSpells?.(target)) saved = true;
  if (coverBonus === Infinity) saved = true;
  return saved;
}

async function processSaveReactionPhase(workflow, target, rolls, context, phase, reactors, midi, socket) {
  const rollType = context?.rollType ?? "save";
  if (rollType !== "save") return;
  const ability = String(context?.rollAbility || rolls?.[0]?.options?.midiChosenId || "").toLowerCase();
  const paths = phase === "save" ? [`save.${ability}`, "save.all"]
    : phase === "fail" ? [`save.fail.${ability}`, "save.fail.all"]
    : [`save.success.${ability}`, "save.success.all"];
  for (const reactor of reactors.values()) {
    await withExternalCountLock(reactor.actor, reactor.flagKey, async () => {
      const { actor, flagKey, flagData, usesCharacterReaction, recipient } = reactor;
      if (!countAvailable(actor, flagData, flagKey)) return;
      if (usesCharacterReaction && midi.hasUsedReaction?.(actor)) return;
      let rawValue;
      let usedPath;
      let parsed;
      for (const path of paths) {
        const candidate = foundry.utils.getProperty(flagData, path);
        if (candidate === undefined || candidate === null || String(candidate).trim() === "") continue;
        const candidateText = String(candidate).trim();
        const candidateParsed = parseDispositionValue(candidateText);
        if (!candidateParsed.value) continue;
        if (!dispositionMatches(reactor, target, candidateParsed.qualifier)) continue;
        rawValue = candidateText;
        parsed = candidateParsed;
        usedPath = path;
        break;
      }
      if (!usedPath) return;
      const activationAllowed = await evaluateExternalActivation(reactor, workflow, target, {
        actionKind: "save", phase, ability, roll: rolls?.[0], dc: context?.rollDC,
        actionType: workflow?.activity?.actionType,
        actionActorToken: getWorkflowToken(workflow),
        actionActor: workflow?.actor
      }, midi);
      if (!activationAllowed || !countAvailable(actor, flagData, flagKey)) return;
      const displayRoll = rolls?.[0];
      if (!displayRoll) return;
      const abilityName = ability ? ability.toUpperCase() : "Saving Throw";
      const title = `${target?.name ?? target?.actor?.name ?? "Target"} — ${abilityName} Saving Throw`;
      const accepted = await promptForReaction(socket, midi, reactor, workflow, displayRoll, rawValue, flagData, title);
      if (!accepted) return;
      if (!countAvailable(actor, flagData, flagKey, { ignorePaidSpellSlot: accepted?.spellSlotPaid === true }) || (usesCharacterReaction && midi.hasUsedReaction?.(actor))) return;
      try {
        const newRoll = await modifySaveRoll(workflow, displayRoll, parsed.value, reactor, flagKey, usedPath, target);
        if (newRoll) {
          setConfiguredRollMode(newRoll, flagData, recipient);
          rolls[0] = newRoll;
          await displayExternalBonusRolls(displayRoll, newRoll, actor, flagData, `${actor.name} — External Reaction Save Bonus`, midi, recipient);
          await consumeCount(actor, flagKey, flagData);
          log(`Applied optional value '${rawValue}' (${usedPath}) to ${target?.actor?.name ?? target?.name}'s saving throw; count owner: ${actor.name}`);
        }
      } catch (err) { error(`Could not apply optional save value '${rawValue}' from ${actor.name}.`, err); }
    });
  }
}

async function modifyAttackRoll(workflow, value, reactor, flagKey, flagPath) {
  const roll = workflow.attackRoll;
  if (!roll) throw new Error("No attack roll is available to modify.");
  const text = String(value ?? "").trim();
  if (!text) return false;
  const midi = game.modules.get("midi-qol")?.api;
  let newRoll = roll;
  let applied = false;
  let macroSpec = text;
  if (/^ActivityMacro(?:\.|$)/.test(text)) { warn("ActivityMacro is intentionally unsupported for External Reaction optional bonuses."); return false; }
  const isMacro = /^(ItemMacro(?:\.|$)|Macro\.|function\.)/.test(text);
  if (isMacro) {
    if (text.startsWith("Macro.")) macroSpec = text.slice("Macro.".length);
    const macroData = workflow.getMacroData?.() ?? {};
    macroData.macroPass = `flags.${MODULE_ID}.optional.${flagKey}.${flagPath}`;
    macroData.workflow = workflow;
    macroData.tag = "optional";
    macroData.roll = roll;
    const sourceEffect = findGrantingEffect(reactor.actor, flagKey);
    let macroItem = workflow.item;
    if (sourceEffect?.origin) {
      try {
        const origin = await fromUuid(sourceEffect.origin);
        if (origin instanceof Item) macroItem = origin;
        else if (origin instanceof ActiveEffect && origin.parent instanceof Item) macroItem = origin.parent;
        else if (origin?.item instanceof Item) macroItem = origin.item;
      } catch (_) { /* Fall back to the attack item if the effect origin cannot be resolved. */ }
    }
    const result = await workflow.callMacro(macroItem, macroSpec, macroData, { roll, actor: reactor.actor, bonus: isMacro ? undefined : text });
    if (result instanceof Roll) { newRoll = result; applied = true; }
    else if (typeof result === "number" || typeof result === "string") {
      if (String(result).trim() !== "") return modifyAttackRoll(workflow, String(result), reactor, flagKey, flagPath);
    }
  }
  if (!applied) {
    if (text === "reroll" || text === "reroll-query" || text === "reroll-kh" || text === "reroll-kl" || text === "reroll-max" || text === "reroll-min") {
      const opts = text === "reroll-max" ? { maximize: true } : text === "reroll-min" ? { minimize: true } : undefined;
      const reroll = await roll.reroll(opts);
      if (text === "reroll-query") {
        const accepted = await game.modules.get(MODULE_ID)?.api?.socket?.executeAsUser("confirmReroll", reactor.recipient.id, {
          originalHTML: await midi.midiRenderRoll(roll), rerollHTML: await midi.midiRenderRoll(reroll), timeout: 0
        });
        newRoll = accepted ? reroll : roll;
      } else if (text === "reroll-kh") newRoll = reroll.total > roll.total ? reroll : roll;
      else if (text === "reroll-kl") newRoll = reroll.total < roll.total ? reroll : roll;
      else newRoll = reroll;
      applied = true;
    } else if (text.startsWith("reroll-withBonus ")) {
      let bonusFormula = text.slice("reroll-withBonus ".length).trim();
      if (!bonusFormula.startsWith("+")) bonusFormula = `+ ${bonusFormula}`;
      newRoll = await new Roll(`${roll.formula} ${bonusFormula}`, getRollDataForWorkflow(workflow)).evaluate();
      applied = true;
    } else if (text.startsWith("replace ")) {
      newRoll = await new Roll(text.slice("replace ".length), getRollDataForWorkflow(workflow)).evaluate();
      applied = true;
    } else if (text === "success" || text === "fail") {
      newRoll = await roll.clone().evaluate();
      const result = text === "success" ? 99 : -1;
      const firstDie = newRoll.terms?.find(term => term instanceof foundry.dice.terms.Die);
      if (firstDie?.results?.length) firstDie.results.forEach(r => { if (r.active) r.result = result; });
      newRoll._total = result;
      newRoll.options = foundry.utils.deepClone(roll.options ?? {});
      newRoll.options.success = text === "success";
      applied = true;
    } else if (text === "critical") {
      newRoll = CONFIG.Dice.D20Roll.fromRoll(roll);
      newRoll.options = foundry.utils.deepClone(roll.options ?? {});
      const die = newRoll.terms?.find(term => term instanceof foundry.dice.terms.Die);
      const activeResult = die?.results?.find(r => r.active)?.result ?? newRoll.total;
      if (die) {
        die.options ??= {};
        die.options.critical = activeResult;
        die.options.criticalSuccess = activeResult;
      }
      newRoll.options.criticalSuccess = activeResult;
      workflow.tracker?.critical?.force?.(`${flagKey}.${flagPath}`, "External Reaction optional bonus");
      applied = true;
    } else {
      // Midi optional attack bonuses accept both numeric constants and dice formulas.
      const bonusRoll = await new Roll(text, getRollDataForWorkflow(workflow)).evaluate();
      const copiedRoll = CONFIG.Dice.D20Roll.fromRoll(roll);
      const OperatorTerm = foundry.dice.terms.OperatorTerm;
      const terms = copiedRoll.terms.concat([new OperatorTerm({ operator: "+" })], bonusRoll.terms);
      newRoll = copiedRoll.constructor.fromTerms(terms);
      newRoll.resetFormula();
      newRoll.options = foundry.utils.deepClone(copiedRoll.options ?? {});
      applied = true;
    }
  }
  if (applied && newRoll) await workflow.setAttackRoll(newRoll);
  return applied;
}

/* ------------------------------------------------------------------------- *
 * Foundry lifecycle and socket integration
 * ------------------------------------------------------------------------- */

Hooks.once("init", () => {
  log("Loaded");
  const style = document.createElement("style");
  style.id = "external-reaction-native-layout";
  style.textContent = `
    .application .dialog.midi-qol.optional.external-reaction-native-layout .external-reaction-prompt { margin: 0; padding: 0; }
    .application.external-reaction .dialog-buttons,
    .application .dialog.midi-qol.optional.external-reaction-native-layout .dialog-buttons.external-reaction-buttons {
      display: flex !important; flex-direction: column !important; flex-wrap: nowrap !important;
      align-items: stretch !important; justify-content: center !important; gap: 8px !important; margin-top: 12px;
    }
    .application.external-reaction .dialog-buttons button,
    .application .dialog.midi-qol.optional.external-reaction-native-layout .dialog-buttons.external-reaction-buttons button {
      display: block !important; width: 100% !important; min-width: 0; max-width: 100%;
      white-space: normal !important; overflow-wrap: anywhere; margin: 0 !important; flex: 0 0 auto !important;
    }
  `;
  document.head.appendChild(style);
});

Hooks.once("ready", () => {
  const socketlibModule = game.modules.get("socketlib");
  const socketlib = socketlibModule?.active ? (globalThis.socketlib ?? socketlibModule.api) : null;
  if (!socketlib) { error("socketlib is required; reaction prompts cannot be routed to another player."); return; }
  const socket = socketlib.registerModule(MODULE_ID);
  if (!socket || typeof socket.register !== "function") {
    error('socketlib.registerModule() did not return a usable socket. Confirm module.json contains "socket": true and fully reload the world.');
    return;
  }
  socket.register("confirmReroll", async ({ originalHTML, rerollHTML }) => {
    const DialogV2 = foundry.applications?.api?.DialogV2;
    if (!DialogV2?.wait) return false;
    const result = await DialogV2.wait({
      window: { title: "Confirm reroll" },
      content: `<div class="external-reaction-reroll"><p>Replace the original roll?</p><div>${originalHTML ?? ""}</div><hr><div>${rerollHTML ?? ""}</div></div>`,
      buttons: [
        { action: "replace", label: "Replace roll", callback: () => true },
        { action: "keep", label: "Keep original", callback: () => false }
      ],
      default: "keep"
    });
    return result === true;
  });
  socket.register("triggerExternalActivity", async ({ actorUuid, tokenUuid, trigger }) => {
    try {
      return await runExternalTriggeredActivity({ actorUuid, tokenUuid, trigger });
    } catch (err) {
      error(`Triggered Activity '${String(trigger ?? "")}' failed.`, err);
      ui.notifications?.error(`External Reaction: failed to use triggered Activity '${String(trigger ?? "")}'. Check the console for details.`);
      return false;
    }
  });
  socket.register("promptReaction", async ({ actorName, itemName, actorUuid, spellSlotMinimum, title, value, label, rollHTML, timeout = 30 }) => {
    const displayValue = String(value ?? "").trim();
    // Keep the body limited to Midi-QoL's roll preview. The optional action button
    // communicates the available bonus; custom explanatory text belongs to a later milestone.
    const content = `<div class="external-reaction-prompt"><div class="dice-roll" data-action="expandRoll">${rollHTML ?? ""}</div></div>`;
    const DialogV2 = foundry.applications?.api?.DialogV2;
    if (!DialogV2?.wait) throw new Error("Foundry DialogV2.wait is unavailable.");
    const duration = Math.max(0, Number(timeout) || 0);
    const titleBase = String(title ?? "").trim() || `${actorName ?? "Unknown attacker"} - Attack Roll`;
    let remaining = duration;
    let countdownId;
    let timeoutId;
    const result = await DialogV2.wait({
      window: { title: duration > 0 ? `${titleBase} — ${duration}` : titleBase },
      classes: ["midi-qol", "optional", "external-reaction"],
      position: { width: 400 },
      content,
      buttons: [
        { action: "accept", label: label?.trim() || `Bonus: ${displayValue}`, icon: "fas fa-dice-d20", callback: () => true },
        { action: "decline", label: "Cancel", icon: "fas fa-xmark", callback: () => false }
      ],
      default: "decline",
      render: (_event, dialog) => {
        const appRoot = dialog.element?.[0] ?? dialog.element;
        appRoot?.classList?.add("external-reaction");
        const root = appRoot?.querySelector?.(".dialog.midi-qol.optional") ?? appRoot;
        const titleEl = appRoot?.querySelector?.(".window-title");
        if (root) {
          root.classList.add("external-reaction-native-layout");
          root.querySelectorAll(".external-reaction-context, p").forEach(el => el.remove());
          // DialogV2 may place its footer outside the inner .dialog element. Find the
          // actual button container from the outer application root, not only `root`.
          const buttons = [...(appRoot?.querySelectorAll?.(".dialog-buttons button, .form-footer button, button.dialog-button") ?? [])];
          const buttonContainers = [...new Set(buttons.map(button => button.parentElement).filter(Boolean))];
          for (const buttonRow of buttonContainers) {
            buttonRow.classList.add("external-reaction-buttons");
            // Set the real flex parent inline: Foundry's footer layout can otherwise
            // keep buttons in two columns despite the module stylesheet.
            Object.assign(buttonRow.style, {
              display: "flex", flexDirection: "column", flexWrap: "nowrap",
              alignItems: "stretch", justifyContent: "center", gap: "8px",
              width: "100%", minWidth: "0", marginTop: "12px"
            });
          }
          for (const button of buttons) {
            button.classList.add("dialog-button", "external-reaction-button");
            Object.assign(button.style, {
              display: "block", boxSizing: "border-box", width: "100%",
              minWidth: "0", maxWidth: "100%", whiteSpace: "normal",
              overflowWrap: "anywhere", wordBreak: "normal", height: "auto",
              flex: "0 0 auto", margin: "0"
            });
          }
        }
        const setTimerColor = (seconds) => {
          if (!titleEl) return;
          const fraction = duration > 0 ? seconds / duration : 1;
          let color = "chartreuse";
          if (fraction < 0.25) color = "red";
          else if (fraction < 0.5) color = "orange";
          else if (fraction < 0.75) color = "yellow";
          titleEl.textContent = duration > 0 ? `${titleBase} — ${seconds}` : titleBase;
          titleEl.setAttribute("style", `color: ${color}`);
        };
        if (duration <= 0) return;
        setTimerColor(remaining);
        countdownId = setInterval(() => {
          remaining = Math.max(0, remaining - 1);
          setTimerColor(remaining);
          if (remaining <= 0) {
            clearInterval(countdownId);
            countdownId = undefined;
          }
        }, 1000);
        timeoutId = setTimeout(() => dialog.close(), duration * 1000);
      },
      close: () => {
        if (countdownId) clearInterval(countdownId);
        if (timeoutId) clearTimeout(timeoutId);
      }
    });
    if (result !== true) return false;
    if (Number.isInteger(Number(spellSlotMinimum)) && Number(spellSlotMinimum) >= 1 && Number(spellSlotMinimum) <= 9) {
      // Accepting the reaction only opens the slot selector. The optional reaction
      // is considered accepted after a slot is actually selected and expended.
      const paid = await chooseAndSpendExternalSpellSlot(actorUuid, Number(spellSlotMinimum));
      return paid ? { accepted: true, spellSlotPaid: true } : false;
    }
    return true;
  });
  game.modules.get(MODULE_ID).api = { socket };
  installAbilityCheckIntegration();
  log("Ready; waiting for Midi-QoL attack, saving throw, ability-check, skill, damage, and AC bonus workflows with Midi-QoL activation conditions");
});

Hooks.on("midi-qol.preAttackRoll", async (workflow) => {
  try {
    if (!workflow || patchedWorkflows.has(workflow)) return;
    const activity = workflow.activity ?? workflow.item?.system?.activities?.get?.(workflow.activityId);
    const targets = [...(workflow.targets ?? [])];
    const midi = game.modules.get("midi-qol")?.api;
    if (!midi?.playerForActor || !midi?.midiRenderRoll) {
      error("Required Midi-QoL API methods are unavailable (playerForActor, midiRenderRoll).");
      return;
    }
    const socket = game.modules.get(MODULE_ID)?.api?.socket;
    if (!socket) {
      debug("External AC integration not installed because the module socket is unavailable.");
      return;
    }
    // AC reactions are independent of attack-roll optional bonuses. Install this
    // workflow wrapper before the attack-bonus target-count/reactor checks, so an
    // AC-only effect can still trigger and multi-target attacks can process AC.
    installExternalACIntegration(workflow, midi, socket);
    if (targets.length !== 1) {
      debug("Skipping attack-roll bonus prompts: prototype currently requires exactly one target. AC integration remains installed.", { targetCount: targets.length });
      return;
    }
    const actorMap = new Map();
    for (const token of (canvas?.tokens?.placeables ?? [])) if (token?.actor) actorMap.set(token.actor.uuid, actorMap.get(token.actor.uuid) ?? token.actor);
    for (const target of targets) if (target?.actor) actorMap.set(target.actor.uuid, target.actor);
    const gm = game.users.find(u => u.active && u.isGM);
    const reactorMap = new Map();
    for (const actor of actorMap.values()) {
      if (actor.uuid === workflow.actor?.uuid) continue;
      const optional = foundry.utils.getProperty(actor, FLAG_ROOT) ?? {};
      for (const [flagKey, data] of Object.entries(optional)) {
        if (!data || typeof data !== "object") continue;
        const usesCharacterReaction = data.count === "reaction" || data.countAlt === "reaction";
        const user = midi.playerForActor(actor);
        const recipient = user?.active ? user : gm;
        if (!recipient) continue;
        if (usesCharacterReaction && midi.hasUsedReaction?.(actor)) continue;
        if (!countAvailable(actor, data, flagKey)) continue;
        reactorMap.set(`${actor.uuid}:${flagKey}`, { actor, token: findTokenForActor(actor, targets), flagKey, flagData: data, usesCharacterReaction, recipient, midi });
      }
    }
    if (!reactorMap.size) {
      debug("No external attack-roll bonus reactors found. AC integration remains active for this workflow.");
      return;
    }
    const original = workflow.processAttackRollBonusFlags;
    if (typeof original !== "function") {
      error("Workflow optional-bonus method not found; no changes made.");
      return;
    }
    patchedWorkflows.add(workflow);
    workflow.processAttackRollBonusFlags = async function (...args) {
      if (this.__externalReactionPromptHandled) return original.apply(this, args);
      this.__externalReactionPromptHandled = true;
      const processPhase = async (phase) => {
        const type = activity?.actionType;
        const successAttackTypes = ["mwak", "rwak", "msak", "rsak"];
        if (phase === "success" && !successAttackTypes.includes(type)) return;
        const paths = phase === "attack" ? [`attack.${type}`, "attack.all"]
          : phase === "fail" ? [`attack.fail.${type}`, "attack.fail.all"]
          : [`attack.success.${type}`, "attack.success.all"];
        for (const reactor of reactorMap.values()) {
          await withExternalCountLock(reactor.actor, reactor.flagKey, async () => {
            const { actor, flagKey, flagData, usesCharacterReaction, recipient } = reactor;
            if (!countAvailable(actor, flagData, flagKey)) return;
            if (usesCharacterReaction && midi.hasUsedReaction?.(actor)) return;
            let value;
            let modifierValue;
            let usedPath;
            const attackerToken = getWorkflowToken(this);
            for (const path of paths) {
              const candidate = foundry.utils.getProperty(flagData, path);
              if (candidate !== undefined && candidate !== null && String(candidate).trim() !== "") {
                const candidateText = String(candidate).trim();
                const parsed = parseDispositionValue(candidateText);
                if (!parsed.value || !dispositionMatches(reactor, attackerToken, parsed.qualifier)) continue;
                value = candidateText;
                modifierValue = parsed.value;
                usedPath = path;
                break;
              }
            }
            if (!usedPath) return;
            const activationAllowed = await evaluateExternalActivation(reactor, this, normalizeToken(targets[0]), {
              actionKind: "attack", phase, actionType: type, roll: this.attackRoll,
              dc: targets[0]?.actor?.system?.attributes?.ac?.value,
              actionActorToken: attackerToken,
              actionActor: this.actor
            }, midi);
            if (!activationAllowed || !countAvailable(actor, flagData, flagKey)) return;
            const accepted = await promptForReaction(socket, midi, reactor, this, this.attackRoll, value, flagData, `${this.actor?.name ?? "Unknown attacker"} - Attack Roll`);
            if (!accepted) return;
            if (!countAvailable(actor, flagData, flagKey, { ignorePaidSpellSlot: accepted?.spellSlotPaid === true }) || (usesCharacterReaction && midi.hasUsedReaction?.(actor))) return;
            try {
              const previousRoll = this.attackRoll;
              const applied = await modifyAttackRoll(this, modifierValue, reactor, flagKey, usedPath);
              if (applied) {
                setConfiguredRollMode(this.attackRoll, flagData, recipient);
                await displayExternalBonusRolls(previousRoll, this.attackRoll, actor, flagData, `${actor.name} — External Reaction Attack Bonus`, midi, recipient);
                await consumeCount(actor, flagKey, flagData);
                log(`Applied optional value '${value}' (${usedPath}) to ${this.actor?.name ?? "attacker"}'s attack; count owner: ${actor.name}`);
              }
            } catch (err) { error(`Could not apply optional value '${value}' from ${actor.name}.`, err); }
          });
        }
      };
      let originalCalled = false;
      let originalResult;
      try {
        // Pre-result attack modifiers can alter the attack roll before Midi determines hits/misses.
        await processPhase("attack");
        originalCalled = true;
        originalResult = await original.apply(this, args);
        // Midi's own method evaluates the roll and then processes its miss-only optional flags.
        // Re-evaluate the hit state after external miss modifiers, then run success-only flags.
        if (typeof this.processAttackRoll === "function") await this.processAttackRoll();
        const target = targets[0];
        if (!getCurrentHitState(this, target)) await processPhase("fail");
        if (typeof this.processAttackRoll === "function") await this.processAttackRoll();
        if (getCurrentHitState(this, target)) await processPhase("success");
        return this.attackRoll ?? originalResult;
      } catch (err) {
        error("External reaction processing failed.", err);
        if (!originalCalled) return original.apply(this, args);
        return this.attackRoll ?? originalResult;
      } finally {
        // AC reactions may have queued Activity triggers from inside checkHits;
        // flush only after Midi's attack/miss/hit optional phases also finish.
        await flushExternalTriggeredActivities(this, socket);
      }
    };
    debug("Prepared external-reaction workflow integration", {
      attacker: workflow.actor?.name, target: targets[0]?.actor?.name,
      reactors: [...reactorMap.values()].map(r => ({ actor: r.actor.name, flagKey: r.flagKey }))
    });
  } catch (err) { error("Error preparing external reaction", err); }
});


/* ------------------------------------------------------------------------- *
 * Roll result and chat-card synchronization
 * ------------------------------------------------------------------------- */

function synchronizeModifiedSave(workflow, target, previousRoll, newRoll, knownIndex = -1, updateTargetDetail = true) {
  if (!newRoll) return;
  // Midi-QoL keeps both per-target save details and a separate flattened saveResults array.
  // Replace references to the old Roll so the workflow and downstream consumers agree.
  if (Array.isArray(workflow?.saveResults)) {
    const index = knownIndex >= 0 ? knownIndex : workflow.saveResults.indexOf(previousRoll);
    if (index >= 0 && index < workflow.saveResults.length) workflow.saveResults[index] = newRoll;
  }
  const targetUuid = target?.document?.uuid ?? target?.document?.id;
  if (updateTargetDetail && targetUuid && workflow?.targetSaveDetails?.[targetUuid]) {
    workflow.targetSaveDetails[targetUuid].saveRoll = newRoll;
  }
}

/**
 * Update the original standalone saving-throw message after an external reaction.
 * Midi's built-in optional-bonus handler operates before final ChatMessage creation;
 * External Reaction operates later (after the roll has reached processTargetSaveResult),
 * so the original message's stored Roll and its already-rendered HTML both need updating.
 */
async function updateSaveRollChatCard(workflow, target, originalRoll, finalRoll) {
  if (!finalRoll) return false;
  const tokenId = target?.id ?? target?.document?.id;
  const originId = workflow?.itemCardId
    ?? workflow?.itemCardUuid?.split?.(".").at?.(-1)
    ?? workflow?.chatCardId;
  if (!tokenId || !originId) {
    debug("Could not match save-roll chat card: missing target token or originating item-card id.", { tokenId, originId });
    return false;
  }

  const candidates = [...(game.messages?.contents ?? [])]
    .filter(message => message?.speaker?.token === tokenId && Array.isArray(message.rolls) && message.rolls.length > 0)
    .filter(message => message.rolls.some(roll => roll?.options?.originatingMessage === originId));
  candidates.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  const message = candidates[0];
  if (!message) {
    debug("No matching standalone save-roll chat message was found; workflow summary remains updated.", {
      target: target?.name ?? target?.actor?.name, tokenId, originId
    });
    return false;
  }

  try {
    const oldContent = String(message.content ?? "");
    const parsedContent = new DOMParser().parseFromString(oldContent, "text/html");
    const newHtml = await finalRoll.render();
    const parsedRoll = new DOMParser().parseFromString(String(newHtml ?? ""), "text/html");
    const oldRollElement = parsedContent.body.querySelector(".dice-roll");
    const newRollElement = parsedRoll.body.querySelector(".dice-roll");
    if (oldRollElement && newRollElement) {
      oldRollElement.replaceWith(newRollElement);
    } else if (oldRollElement) {
      oldRollElement.innerHTML = parsedRoll.body.innerHTML;
    } else {
      // Basic D&D 5e save cards normally contain a .dice-roll element. This fallback
      // keeps any card wrapper and replaces only its content if a theme changes markup.
      parsedContent.body.innerHTML = String(newHtml ?? oldContent);
    }

    const storedRolls = [...message.rolls];
    let rollIndex = storedRolls.findIndex(roll =>
      roll?.options?.originatingMessage === originId
      && roll?.formula === originalRoll?.formula
      && Number(roll?.total) === Number(originalRoll?.total)
    );
    if (rollIndex < 0) rollIndex = storedRolls.findIndex(roll => roll?.options?.originatingMessage === originId);
    if (rollIndex < 0 && storedRolls.length === 1) rollIndex = 0;
    if (rollIndex < 0) {
      debug("Matched save-roll message but could not identify its stored Roll index; not updating the card.", { messageId: message.id });
      return false;
    }
    const rollData = storedRolls.map((roll, index) => {
      if (index === rollIndex) return finalRoll.toJSON();
      return typeof roll?.toJSON === "function" ? roll.toJSON() : roll;
    });
    const updateData = { content: parsedContent.body.innerHTML, rolls: rollData };
    applyConfiguredModeToMessageData(updateData, finalRoll, game.users.get(finalRoll.options?.externalReactionRollModeUserId));
    await message.update(updateData);
    debug("Updated the standalone save-roll chat card to match External Reaction's final Roll.", {
      messageId: message.id, oldTotal: originalRoll?.total, newTotal: finalRoll.total, formula: finalRoll.formula
    });
    return true;
  } catch (err) {
    error("Could not update the standalone save-roll chat card.", err);
    return false;
  }
}


function checkRollTargetDC(roll, config = {}, dialog = {}, message = {}) {
  const candidates = [
    roll?.options?.target,
    config?.target,
    config?.midiOptions?.target,
    dialog?.target,
    message?.target,
    foundry.utils.getProperty(message, "data.flags.midi-qol.target")
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") continue;
    const number = Number(candidate);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function checkRollOutcome(roll, dc, midi) {
  if (!roll || !Number.isFinite(dc)) return null;
  // External Reaction's success/fail values deliberately set sentinel totals.
  if (Number(roll.total) === 99 && roll.options?.success === true) return true;
  if (Number(roll.total) === -1 && roll.options?.success === false) return false;
  // Match Midi-QoL's Critical/Fumble always succeed/fail house rule for ability checks.
  if (midi?.checkRule?.("criticalSaves")) {
    if (roll.isCritical === true) return true;
    if (roll.isFumble === true) return false;
  }
  return Number(roll.total ?? 0) >= dc;
}

async function updateStandaloneRollChatCard(originalRoll, finalRoll, actor, originalInfo = {}) {
  if (!originalRoll || !finalRoll) return false;
  let message = originalRoll.parent ?? finalRoll.parent;
  if (typeof message === "string") message = game.messages?.get?.(message);
  if (!message?.update || !Array.isArray(message.rolls)) {
    // Roll.parent is set by Midi-QoL after ChatMessage creation. Use a conservative
    // fallback lookup in case another module stripped the reference from the Roll.
    const originalFormula = originalInfo.formula ?? originalRoll.formula;
    const originalTotal = Number(originalInfo.total ?? originalRoll.total);
    const speakerTokenId = findTokenForActor(actor)?.id;
    const candidates = [...(game.messages?.contents ?? [])].filter(m =>
      Array.isArray(m.rolls) && m.rolls.length > 0
      && (!speakerTokenId || m.speaker?.token === speakerTokenId)
      && m.rolls.some(r => r?.formula === originalFormula && Number(r?.total) === originalTotal)
    ).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    message = candidates[0];
  }
  if (!message?.update || !Array.isArray(message.rolls)) {
    debug("Could not find the standalone ability-check chat message to update.", { actor: actor?.name });
    return false;
  }
  try {
    const oldContent = String(message.content ?? "");
    const parsedContent = new DOMParser().parseFromString(oldContent, "text/html");
    const rollHtml = await finalRoll.render();
    const parsedRoll = new DOMParser().parseFromString(String(rollHtml ?? ""), "text/html");
    const oldRollElement = parsedContent.body.querySelector(".dice-roll");
    const newRollElement = parsedRoll.body.querySelector(".dice-roll");
    if (oldRollElement && newRollElement) oldRollElement.replaceWith(newRollElement);
    else if (oldRollElement) oldRollElement.innerHTML = parsedRoll.body.innerHTML;
    else parsedContent.body.innerHTML = String(rollHtml ?? oldContent);

    const storedRolls = [...message.rolls];
    const oldFormula = originalInfo.formula ?? originalRoll.formula;
    const oldTotal = Number(originalInfo.total ?? originalRoll.total);
    let index = storedRolls.findIndex(r => r?.formula === oldFormula && Number(r?.total) === oldTotal);
    if (index < 0 && storedRolls.length === 1) index = 0;
    if (index < 0) {
      debug("Found check chat message but could not identify its Roll entry; not updating the card.", { messageId: message.id });
      return false;
    }
    const rollsData = storedRolls.map((roll, i) => i === index ? finalRoll.toJSON() : (typeof roll?.toJSON === "function" ? roll.toJSON() : roll));
    const updateData = { content: parsedContent.body.innerHTML, rolls: rollsData };
    applyConfiguredModeToMessageData(updateData, finalRoll, game.users.get(finalRoll.options?.externalReactionRollModeUserId));
    await message.update(updateData);
    finalRoll.parent = message;
    return true;
  } catch (err) {
    error("Could not update ability-check chat card.", err);
    return false;
  }
}

function hasExternalCheckFlag(flagData) {
  return [
    "check.all", "check.fail.all", "check.success.all",
    ...["str", "dex", "con", "int", "wis", "cha"].flatMap(ab => [
      `check.${ab}`, `check.fail.${ab}`, `check.success.${ab}`
    ])
  ].some(path => {
    const value = foundry.utils.getProperty(flagData, path);
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

/* ------------------------------------------------------------------------- *
 * Ability checks and skill checks
 * ------------------------------------------------------------------------- */

const EXTERNAL_SKILL_IDS = ["acr", "ani", "arc", "ath", "dec", "his", "ins", "inv", "itm", "med", "nat", "prc", "per", "prf", "rel", "slt", "ste", "sur"];
function hasExternalSkillFlag(flagData) {
  return ["skill.all", "skill.fail.all", "skill.success.all", ...EXTERNAL_SKILL_IDS.flatMap(id => [`skill.${id}`, `skill.fail.${id}`, `skill.success.${id}`])]
    .some(path => {
      const value = foundry.utils.getProperty(flagData, path);
      return value !== undefined && value !== null && String(value).trim() !== "";
    });
}

async function getCheckMacroWorkflow(midi, reactor, macroSpec = "") {
  const DummyWorkflow = globalThis.MidiQOL?.Workflows?.DummyWorkflow
    ?? midi?.Workflows?.DummyWorkflow;
  if (typeof DummyWorkflow !== "function") {
    throw new Error("Midi-QoL DummyWorkflow is unavailable; cannot execute optional macros for ability checks.");
  }
  const sourceEffect = findGrantingEffect(reactor.actor, reactor.flagKey);
  let macroItem;
  if (sourceEffect?.origin) {
    try {
      const origin = await fromUuid(sourceEffect.origin);
      if (origin instanceof Item) macroItem = origin;
      else if (origin instanceof ActiveEffect && origin.parent instanceof Item) macroItem = origin.parent;
      else if (origin?.item instanceof Item) macroItem = origin.item;
    } catch (_) { /* Try explicit ItemMacro resolution below. */ }
  }
  // Mirror Midi-QoL's bonusDialog behavior for ItemMacro.NAME when there is no originating item.
  if (!macroItem && /^ItemMacro\./i.test(macroSpec)) {
    const itemReference = macroSpec.split(".").slice(1).join(".");
    try { macroItem = fromUuidSync(itemReference); } catch (_) { /* Fall back to actor item name. */ }
    if (!(macroItem instanceof Item)) macroItem = reactor.actor.items?.getName?.(itemReference);
  }
  const tokenDocument = reactor.token?.document ?? reactor.token;
  return new DummyWorkflow(
    reactor.actor,
    {},
    ChatMessage.getSpeaker({ actor: reactor.actor, token: tokenDocument }),
    [],
    { item: macroItem }
  );
}

async function processExternalCheckPhase({ checkActor, checkToken, ability, currentRoll, dc, phase, reactors, midi, socket, workflowContext, rollKind = "check" }) {
  const root = rollKind === "skill" ? "skill" : "check";
  const paths = phase === root ? [`${root}.${ability}`, `${root}.all`]
    : phase === "fail" ? [`${root}.fail.${ability}`, `${root}.fail.all`]
    : [`${root}.success.${ability}`, `${root}.success.all`];
  let roll = currentRoll;
  for (const reactor of reactors.values()) {
    await withExternalCountLock(reactor.actor, reactor.flagKey, async () => {
      const { actor, flagKey, flagData, usesCharacterReaction, recipient } = reactor;
      if (!countAvailable(actor, flagData, flagKey)) return;
      if (usesCharacterReaction && midi.hasUsedReaction?.(actor)) return;
      let selected;
      let usedPath;
      for (const path of paths) {
        const value = foundry.utils.getProperty(flagData, path);
        if (value === undefined || value === null || String(value).trim() === "") continue;
        const text = String(value).trim();
        const parsed = parseDispositionValue(text);
        if (!parsed.value || !dispositionMatches(reactor, checkToken, parsed.qualifier)) continue;
        selected = { raw: text, parsed };
        usedPath = path;
        break;
      }
      if (!selected || !usedPath) return;
      const activationAllowed = await evaluateExternalActivation(reactor, workflowContext, checkToken, {
        actionKind: rollKind, phase, ability, roll, dc,
        actionActorToken: getWorkflowToken(workflowContext) ?? checkToken,
        actionActor: workflowContext?.actor ?? checkActor
      }, midi);
      if (!activationAllowed || !countAvailable(actor, flagData, flagKey)) return;

      const title = `${checkActor.name} — ${rollKind === "skill" ? (CONFIG.DND5E?.skills?.[ability]?.label ? game.i18n.localize(CONFIG.DND5E.skills[ability].label) : ability.toUpperCase()) + " Skill Check" : (ability || "Ability").toUpperCase() + " Ability Check"}`;
      const promptContext = workflowContext ?? { actor: checkActor, item: null, activity: null };
      const accepted = await promptForReaction(socket, midi, reactor, promptContext, roll, selected.raw, flagData, title);
      if (!accepted) return;
      if (!countAvailable(actor, flagData, flagKey, { ignorePaidSpellSlot: accepted?.spellSlotPaid === true }) || (usesCharacterReaction && midi.hasUsedReaction?.(actor))) return;
      try {
        const valueText = selected.parsed.value;
        const needsMacroWorkflow = /^(ItemMacro(?:\.|$)|Macro\.|function\.)/.test(valueText);
        const modifierWorkflow = needsMacroWorkflow
          ? await getCheckMacroWorkflow(midi, reactor, valueText)
          : { actor: reactor.actor, tracker: undefined };
        const modified = await modifySaveRoll(modifierWorkflow, roll, valueText, reactor, flagKey, usedPath, checkToken ?? { actor: checkActor });
        if (!modified) return;
        if (Number.isFinite(dc) && modified.options?.target === undefined) modified.options.target = dc;
        setConfiguredRollMode(modified, flagData, recipient);
        const beforeRoll = roll;
        roll = modified;
        await displayExternalBonusRolls(beforeRoll, roll, actor, flagData, `${actor.name} — External Reaction ${rollKind === "skill" ? "Skill" : "Ability Check"} Bonus`, midi, recipient);
        await consumeCount(actor, flagKey, flagData);
        log(`Applied optional value '${selected.raw}' (${usedPath}) to ${checkActor.name}'s ability check; count owner: ${actor.name}`);
      } catch (err) {
        error(`Could not apply check value '${selected.raw}' from ${actor.name}.`, err);
      }
    });
  }
  return roll;
}

async function processExternalAbilityCheck(checkActor, args, result, rollKind = "check") {
  const midi = game.modules.get("midi-qol")?.api;
  const socket = game.modules.get(MODULE_ID)?.api?.socket;
  if (!midi?.playerForActor || !midi?.midiRenderRoll || !socket || !checkActor) return result;
  const originalArray = Array.isArray(result);
  const rolls = originalArray ? result : result instanceof Roll ? [result] : [];
  if (!rolls.length || !rolls[0]) return result;
  let roll = rolls[0];
  const config = args?.[0] ?? {};
  const dialog = args?.[1] ?? {};
  const messageData = args?.[2] ?? {};
  const ability = String(rollKind === "skill"
    ? (config?.skill ?? config?.skillId ?? config?.rollSkills?.[0] ?? config?.midiOptions?.skill ?? roll.options?.midiChosenId ?? roll.options?.skill ?? roll.options?.skillId ?? "")
    : (config?.ability ?? roll.options?.midiChosenId ?? roll.options?.ability ?? "")).toLowerCase();
  const dc = checkRollTargetDC(roll, config, dialog, messageData);
  // Ability checks initiated directly from an Actor do not always have a Midi Workflow.
  // Supply a small compatible context for activation conditions without pretending that a
  // full item workflow exists.
  const checkWorkflowContext = {
    actor: checkActor, item: config?.item ?? null, activity: config?.activity ?? null,
    ability, skill: rollKind === "skill" ? ability : undefined, roll, rollType: rollKind, dc,
    currentAction: rollKind === "skill" ? "skillCheck" : "abilityCheck",
    options: config?.options ?? {}, targets: new Set()
  };

  const rollMessage = roll.parent;
  const speakerTokenId = rollMessage?.speaker?.token;
  const speakerToken = speakerTokenId ? canvas?.tokens?.get?.(speakerTokenId) : null;
  const checkToken = findTokenForActor(checkActor, [speakerToken, checkActor.token]);
  const actorMap = collectSceneActors(checkToken ? [checkToken] : []);
  const gm = game.users.find(user => user.active && user.isGM);
  const reactors = new Map();
  for (const { actor, token } of actorMap.values()) {
    const optional = foundry.utils.getProperty(actor, FLAG_ROOT) ?? {};
    for (const [flagKey, flagData] of Object.entries(optional)) {
      if (!flagData || typeof flagData !== "object" || !(rollKind === "skill" ? hasExternalSkillFlag(flagData) : hasExternalCheckFlag(flagData))) continue;
      const user = midi.playerForActor(actor);
      const recipient = user?.active ? user : gm;
      if (!recipient) continue;
      const usesCharacterReaction = flagData.count === "reaction" || flagData.countAlt === "reaction";
      if (usesCharacterReaction && midi.hasUsedReaction?.(actor)) continue;
      if (!countAvailable(actor, flagData, flagKey)) continue;
      reactors.set(`${actor.uuid}:${flagKey}`, {
        actor, token: findTokenForActor(actor, checkToken ? [checkToken] : []) ?? token,
        flagKey, flagData, usesCharacterReaction, recipient, midi
      });
    }
  }
  if (!reactors.size) return result;

  const originalRoll = roll;
  const originalRollInfo = { formula: roll.formula, total: Number(roll.total) };
  try {
    if (processedExternalCheckRolls.has(roll)) return result;
    processedExternalCheckRolls.add(roll);
    const normalPhase = rollKind === "skill" ? "skill" : "check";
    roll = await processExternalCheckPhase({ checkActor, checkToken, ability, currentRoll: roll, dc, phase: normalPhase, reactors, midi, socket, workflowContext: checkWorkflowContext, rollKind });
    let outcome = checkRollOutcome(roll, dc, midi);
    if (outcome === false) {
      roll = await processExternalCheckPhase({ checkActor, checkToken, ability, currentRoll: roll, dc, phase: "fail", reactors, midi, socket, workflowContext: checkWorkflowContext, rollKind });
      outcome = checkRollOutcome(roll, dc, midi);
    }
    if (outcome === true) {
      roll = await processExternalCheckPhase({ checkActor, checkToken, ability, currentRoll: roll, dc, phase: "success", reactors, midi, socket, workflowContext: checkWorkflowContext, rollKind });
    }
    const rollChanged = roll !== originalRoll || roll.formula !== originalRollInfo.formula || Number(roll.total) !== originalRollInfo.total;
    if (rollChanged) {
      if (Number.isFinite(dc) && roll.options?.target === undefined) roll.options.target = dc;
      const updated = await updateStandaloneRollChatCard(originalRoll, roll, checkActor, originalRollInfo);
      if (updated) debug("Synchronized the ability-check chat card with External Reaction's final roll.", { actor: checkActor.name, oldTotal: originalRoll.total, newTotal: roll.total });
      else warn("Ability-check value applied, but the original chat card could not be matched for display update.", { actor: checkActor.name });
    }
  } catch (err) {
    error(`External Reaction ability-check integration failed for ${checkActor.name}.`, err);
  }
  await flushExternalTriggeredActivities(checkWorkflowContext, socket);
  if (roll && typeof roll === "object") processedExternalCheckRolls.add(roll);
  if (originalArray) {
    result[0] = roll;
    return result;
  }
  return roll;
}

function installAbilityCheckIntegration() {
  const prototype = CONFIG.Actor?.documentClass?.prototype;
  if (!prototype) {
    warn("Could not find CONFIG.Actor.documentClass.prototype; external check and skill reactions are unavailable.");
    return false;
  }
  let installed = false;
  for (const [methodName, rollKind] of [["rollAbilityCheck", "check"], ["rollSkill", "skill"]]) {
    const original = prototype[methodName];
    if (typeof original !== "function") {
      warn(`Could not find Actor.${methodName}; external ${rollKind} reactions may be unavailable.`);
      continue;
    }
    if (original.__externalReactionWrapped) { installed = true; continue; }
    const wrapped = async function (...args) {
      const result = await original.apply(this, args);
      try {
        return await processExternalAbilityCheck(this, args, result, rollKind);
      } catch (err) {
        error(`Unexpected error in external ${rollKind} wrapper.`, err);
        return result;
      }
    };
    Object.defineProperty(wrapped, "__externalReactionWrapped", { value: true });
    Object.defineProperty(wrapped, "__externalReactionOriginal", { value: original });
    prototype[methodName] = wrapped;
    installed = true;
    log(`Installed external ${rollKind} integration on ${methodName}`);
  }
  return installed;
}


// --- External AC bonus handling -------------------------------------------------
// AC bonuses belong to the attacked actor. They are applied during checkHits, after
// Midi's attack roll has been finalized but before Midi adjudicates hits/misses.
// The raw ActiveEffect changes are also inspected so the legacy scalar `ac` and
// nested selectors such as `ac.hit` can coexist even though they share a path prefix.
const EXTERNAL_AC_ATTACK_TYPES = ["mwak", "rwak", "msak", "rsak"];
const EXTERNAL_AC_SELECTORS = new Set([
  "", "hit", ...EXTERNAL_AC_ATTACK_TYPES,
  ...EXTERNAL_AC_ATTACK_TYPES.map(type => `${type}.hit`)
]);

/* ------------------------------------------------------------------------- *
 * Armor Class reactions
 * ------------------------------------------------------------------------- */

function collectExternalACSelectors(actor, flagKey, flagData) {
  const values = new Map();
  const acRoot = flagData?.ac;
  if (typeof acRoot === "string" || typeof acRoot === "number") values.set("", String(acRoot));
  else if (acRoot && typeof acRoot === "object") {
    for (const selector of EXTERNAL_AC_SELECTORS) {
      if (!selector) continue;
      const value = foundry.utils.getProperty(acRoot, selector);
      // Nested selectors make their parent paths objects, not valid AC values.
      // For example, ac.mwak.hit creates acRoot.mwak = { hit: "+5" }.
      // Never stringify that parent to "[object Object]" or it becomes a false
      // fallback selector that triggers even when the .hit condition is false.
      if (typeof value !== "string" && typeof value !== "number") {
        if (value !== undefined && value !== null) {
          debug("Ignoring non-scalar AC selector value (likely a nested selector parent).", {
            actor: actor?.name, flagKey, selector, valueType: typeof value
          });
        }
        continue;
      }
      const text = String(value).trim();
      if (text !== "") values.set(selector, text);
    }
  }

  // Actor.flags collapses dotted ActiveEffect paths into an object and cannot
  // represent a scalar `ac` alongside `ac.hit`. Read each supported AC leaf from
  // the granting ActiveEffects as well, preserving the user's exact flag paths.
  const prefix = `${FLAG_ROOT}.${flagKey}.ac`;
  for (const effect of getActorActiveEffects(actor)) {
    const changes = effect?.system?.changes ?? effect?.changes ?? effect?._source?.system?.changes ?? [];
    for (const change of changes) {
      const key = String(change?.key ?? "");
      let selector;
      if (key === prefix) selector = "";
      else if (key.startsWith(`${prefix}.`)) selector = key.slice(prefix.length + 1);
      else continue;
      if (!EXTERNAL_AC_SELECTORS.has(selector)) continue;
      if (typeof change.value !== "string" && typeof change.value !== "number") continue;
      const text = String(change.value).trim();
      if (text === "") continue;
      values.set(selector, text);
    }
  }
  return values;
}

function wouldAttackHitAtAC(workflow, targetToken, baseAC) {
  const roll = workflow?.attackRoll;
  if (!roll || !targetToken?.actor || !Number.isFinite(Number(baseAC))) return false;
  const natural = roll.dice?.[0]?.total ?? roll.terms?.find(term => term instanceof foundry.dice.terms.Die && term.faces === 20)?.results?.find(r => r.active)?.result;
  // `workflow.isCritical` includes Midi's critical handling. Natural 1 follows the
  // same miss behavior as the current External Reaction attack outcome check.
  return workflow.isCritical === true || (Number(roll.total ?? 0) >= Number(baseAC) && natural !== 1);
}

function selectExternalACValue(values, actionType, wouldHitNormally) {
  const candidates = [];
  if (EXTERNAL_AC_ATTACK_TYPES.includes(actionType)) {
    if (wouldHitNormally) candidates.push(`${actionType}.hit`);
    candidates.push(actionType);
  }
  if (wouldHitNormally) candidates.push("hit");
  candidates.push("");
  for (const selector of candidates) {
    const value = values.get(selector);
    if (value !== undefined && value !== null && String(value).trim() !== "") return { selector, value: String(value).trim() };
  }
  return null;
}

async function processExternalACBonuses(workflow, midi, socket) {
  const attackerToken = getWorkflowToken(workflow);
  if (!workflow?.targets?.size || !workflow?.attackRoll) {
    debug("External AC processing skipped: attack workflow is missing targets or an attack roll.", {
      workflowId: workflow?.id,
      targetCount: workflow?.targets?.size ?? 0,
      hasAttackRoll: Boolean(workflow?.attackRoll)
    });
    return;
  }

  const targets = [...workflow.targets].map(normalizeToken).filter(token => token?.actor);
  const actionType = String(workflow.activity?.actionType ?? workflow.item?.system?.actionType ?? "other").toLowerCase();
  // Capture each target's original AC once, before any External Reaction increases it.
  // A .hit selector means the attack would hit this target before *any* External AC bonus.
  const baseline = new Map();
  for (const targetToken of targets) {
    const targetActor = targetToken.actor;
    const descriptor = workflow.targetDescriptors?.get?.(targetActor.uuid);
    baseline.set(targetActor.uuid, Number(descriptor?.ac ?? targetActor.system?.attributes?.ac?.value ?? 10));
  }

  // Unlike Midi-QoL's built-in AC optional bonus, External Reaction allows a different
  // creature to react on the defender's behalf. Discover actors with External Reaction
  // flags anywhere on the active scene, not just flags on the attacked target. Prefer the
  // actual target token when a target actor also owns an AC option, so its disposition,
  // vision, and range context are correct for self-defence.
  const sceneReactors = collectSceneActors(targets);
  debug("Starting External AC processing with scene-wide reactor discovery.", {
    attacker: workflow.actor?.name,
    attackerActorUuid: workflow.actor?.uuid,
    attackerTokenId: attackerToken?.id ?? attackerToken?.document?.id,
    targetCount: targets.length,
    sceneReactorCount: sceneReactors.size,
    attackTotal: workflow.attackRoll.total,
    actionType
  });

  const gm = game.users.find(user => user.active && user.isGM);
  for (const targetToken of targets) {
    const targetActor = targetToken.actor;
    const targetTokenId = targetToken.id ?? targetToken.document?.id;
    const attackerTokenId = attackerToken?.id ?? attackerToken?.document?.id;
    if (attackerTokenId && targetTokenId && attackerTokenId === targetTokenId) {
      debug("Skipping External AC because the attacker's token is also the target token.", { targetTokenId });
      continue;
    }

    const baseAC = baseline.get(targetActor.uuid) ?? Number(targetActor.system?.attributes?.ac?.value ?? 10);
    const wouldHitNormally = wouldAttackHitAtAC(workflow, targetToken, baseAC);

    for (const { actor: reactorActor, token: reactorToken } of sceneReactors.values()) {
      // AC reactions may be used by the attacked creature, but not by the same Actor
      // that initiated the attack—even if that Actor is represented by another token.
      if (reactorActor?.uuid && workflow.actor?.uuid && reactorActor.uuid === workflow.actor.uuid) continue;
      const reactorTokenId = reactorToken?.id ?? reactorToken?.document?.id;
      if (attackerTokenId && reactorTokenId && attackerTokenId === reactorTokenId) continue;
      if (!reactorActor || !reactorToken) continue;

      const options = collectActorExternalOptions(reactorActor);
      for (const [flagKey, flagData] of Object.entries(options)) {
        await withExternalCountLock(reactorActor, flagKey, async () => {
          if (!flagData || typeof flagData !== "object") return;
          const selectors = collectExternalACSelectors(reactorActor, flagKey, flagData);
          if (!selectors.size) return;

          const selected = selectExternalACValue(selectors, actionType, wouldHitNormally);
          if (!selected) {
            debug("No External AC selector matches this attack.", {
              reactor: reactorActor.name,
              flagKey,
              target: targetActor.name,
              actionType,
              wouldHitNormally,
              availableSelectors: [...selectors.keys()]
            });
            return;
          }

          log(`Found External AC candidate on ${reactorActor.name} for ${targetActor.name}: ${flagKey}.ac${selected.selector ? `.${selected.selector}` : ""} = ${selected.value}`);
          const usesCharacterReaction = flagData.count === "reaction" || flagData.countAlt === "reaction";
          const player = midi.playerForActor(reactorActor);
          const recipient = player?.active ? player : gm;
          if (!recipient || !countAvailable(reactorActor, flagData, flagKey)) {
            debug("External AC option has no active recipient or count is unavailable.", {
              reactor: reactorActor.name, flagKey, recipient: recipient?.name,
              count: flagData.count, countAlt: flagData.countAlt, target: targetActor.name
            });
            return;
          }
          if (usesCharacterReaction && midi.hasUsedReaction?.(reactorActor)) {
            debug("External AC option skipped because the reactor's configured reaction is already used.", {
              reactor: reactorActor.name, flagKey, target: targetActor.name
            });
            return;
          }

          const rawValue = selected.value;
          const parsed = parseDispositionValue(rawValue);
          // Legacy `friendly` / `enemy` suffixes on bonus values remain attacker-relative.
          // Activation conditions receive both `actor` (attacker) and `target` (defender).
          if (!parsed.value || !dispositionMatches({ actor: reactorActor, token: reactorToken }, attackerToken, parsed.qualifier)) return;
          const activationAllowed = await evaluateExternalActivation(
            { actor: reactorActor, token: reactorToken, flagKey, flagData }, workflow, targetToken,
            {
              actionKind: "ac", phase: wouldHitNormally ? "success" : "fail", actionType,
              roll: workflow.attackRoll, dc: baseAC, defendedActor: targetActor, defendedToken: targetToken,
              actionActorToken: attackerToken,
              actionActor: workflow.actor
            }, midi
          );
          if (!activationAllowed || !countAvailable(reactorActor, flagData, flagKey)) {
            debug("External AC option rejected by activation condition or count.", {
              reactor: reactorActor.name, flagKey, expression: flagData.activation, target: targetActor.name
            });
            return;
          }

          // Build/modify the AC roll from the defender's data, but deliver the choice and
          // consume the counter on the reactor who owns this optional flag.
          const currentAC = Number(workflow.targetDescriptors?.get?.(targetActor.uuid)?.ac
            ?? targetActor.system?.attributes?.ac?.value ?? baseAC);
          const acRoll = await new Roll(String(currentAC), targetActor.getRollData?.() ?? {}).evaluate();
          acRoll.options ??= {};
          acRoll.options.rollType = "ac";
          const reactor = { actor: reactorActor, token: reactorToken, flagKey, flagData, recipient };
          const selectorLabel = `ac${selected.selector ? `.${selected.selector}` : ""}`;
          const title = `${reactorActor.name} — AC bonus for ${targetActor.name} (${selected.selector || "all attacks"})`;
          const accepted = await promptForReaction(socket, midi, reactor, workflow, acRoll, rawValue, flagData, title);
          if (!accepted || !countAvailable(reactorActor, flagData, flagKey, { ignorePaidSpellSlot: accepted?.spellSlotPaid === true })
              || (usesCharacterReaction && midi.hasUsedReaction?.(reactorActor))) return;

          try {
            const newACRoll = await modifySaveRoll(
              workflow, acRoll, parsed.value, reactor, flagKey, selectorLabel, { actor: targetActor, token: targetToken }
            );
            if (!newACRoll) return;
            setConfiguredRollMode(newACRoll, flagData, recipient);
            const delta = Number(newACRoll.total) - Number(acRoll.total);
            if (!Number.isFinite(delta) || delta === 0) return;

            workflow.targetACModifiers ??= new Map();
            workflow.targetACModifiers.set(targetActor.uuid,
              Number(workflow.targetACModifiers.get(targetActor.uuid) ?? 0) + delta);
            const descriptor = workflow.targetDescriptors?.get?.(targetActor.uuid);
            if (descriptor) descriptor.ac = Number(descriptor.ac ?? currentAC) + delta;

            await displayExternalBonusRolls(acRoll, newACRoll, reactorActor, flagData,
              `${reactorActor.name} — External Reaction AC Bonus for ${targetActor.name}`, midi, recipient);
            await consumeCount(reactorActor, flagKey, flagData);
            log(`Applied optional AC bonus '${rawValue}' (selector: ${selectorLabel}) from ${reactorActor.name} to ${targetActor.name}; added ${delta} AC before hit adjudication.`);
          } catch (err) {
            error(`Could not apply AC bonus '${rawValue}' from ${reactorActor.name} to ${targetActor.name}.`, err);
          }
        });
      }
    }
  }
}

function installExternalACIntegration(workflow, midi, socket) {
  if (!workflow || workflow.__externalReactionACWrapped || typeof workflow.checkHits !== "function") return;
  const original = workflow.checkHits;
  workflow.checkHits = async function (...args) {
    if (!processedACWorkflows.has(this)) {
      processedACWorkflows.add(this);
      try { await processExternalACBonuses(this, midi, socket); }
      catch (err) { error("External AC bonus processing failed.", err); }
    }
    return original.apply(this, args);
  };
  Object.defineProperty(workflow, "__externalReactionACWrapped", { value: true, configurable: true });
}

// --- External damage bonus handling --------------------------------------------
const EXTERNAL_DAMAGE_ACTION_TYPES = ["mwak", "rwak", "msak", "rsak", "heal", "other", "save", "util"];
/* ------------------------------------------------------------------------- *
 * Damage roll reactions
 * ------------------------------------------------------------------------- */

function entriesOfConfigTypes(value) {
  if (value instanceof Map) return [...value.entries()];
  if (value && typeof value === "object") return Object.entries(value);
  return [];
}
function getExternalDamageTypeEntries() {
  const systemConfig = globalThis.CONFIG?.DND5E ?? {};
  const midiConfig = globalThis.MidiQOL?.GameSystemConfig ?? {};
  // Keep common D&D damage keys available even if a system/module omits their display
  // labels from CONFIG; configured entries below take precedence over these fallbacks.
  const fallbackEntries = [
    ["acid", { label: "Acid" }], ["bludgeoning", { label: "Bludgeoning" }],
    ["cold", { label: "Cold" }], ["fire", { label: "Fire" }], ["force", { label: "Force" }],
    ["lightning", { label: "Lightning" }], ["necrotic", { label: "Necrotic" }],
    ["piercing", { label: "Piercing" }], ["poison", { label: "Poison" }],
    ["psychic", { label: "Psychic" }], ["radiant", { label: "Radiant" }],
    ["slashing", { label: "Slashing" }], ["thunder", { label: "Thunder" }],
    ["vitality", { label: "Vitality" }], ["maximum", { label: "Maximum Hit Points" }],
    ["mhp", { label: "Maximum Hit Points (alias)" }], ["none", { label: "No type" }],
    ["midi-none", { label: "No damage" }], ["nodamage", { label: "No damage" }]
  ];
  const entries = [
    ...fallbackEntries,
    ...entriesOfConfigTypes(systemConfig.damageTypes),
    ...entriesOfConfigTypes(systemConfig.healingTypes),
    ...entriesOfConfigTypes(midiConfig.damageTypes),
    ...entriesOfConfigTypes(midiConfig.healingTypes)
  ];
  const unique = new Map();
  for (const [rawId, data] of entries) {
    const id = String(rawId ?? "").trim().toLowerCase();
    if (!id) continue;
    const labelRaw = data?.label ?? data?.name ?? id;
    const label = game.i18n?.localize ? game.i18n.localize(labelRaw) : String(labelRaw);
    const compact = `${id} ${label}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
    // D&D5e/Midi represents untyped damage as type "none" (or an empty type
    // on the DamageRoll). That is a valid selectable bonus type. Only suppress
    // entries which explicitly mean that no damage is rolled at all.
    const isNoDamage = ["midi-none", "nodamage", "nodamages", "damagenone"].includes(id)
      || /(?:^|\s)no\s*damage(?:\s|$)/i.test(`${id} ${label}`)
      || ["nodamage", "nodamages", "damagenone"].some(t => compact.includes(t))
      || String(label).toLowerCase().trim() === "no damage";
    if (isNoDamage) continue;
    unique.set(id, { id, label: String(label) });
  }
  return [...unique.values()];
}
function getExternalDamageSelector(flagData, actionType) {
  const damageData = flagData?.damage;
  const damageOptions = damageData && typeof damageData === "object" && !Array.isArray(damageData)
    ? Object.entries(damageData)
    : [];
  const hasUsableValue = value => value !== undefined && value !== null
    && typeof value !== "object" && String(value).trim() !== "";
  const action = String(actionType ?? "").trim().toLowerCase();
  const supportedTypes = new Set(getExternalDamageTypeEntries().map(({ id }) => String(id).toLowerCase()));
  // Damage types may now contain a nested selector object, e.g. damage.fire.all
  // and damage.fire.mwak. Keep their authored order so multiple typed candidates
  // in one NAME remain deterministic; one NAME selects one path per damage pass.
  const typedOptions = damageOptions.filter(([rawId, value]) => {
    const id = String(rawId).toLowerCase();
    return id !== "all" && !EXTERNAL_DAMAGE_ACTION_TYPES.includes(id) && supportedTypes.has(id)
      && value && typeof value === "object" && !Array.isArray(value);
  });

  // Highest specificity: a particular damage type on a particular action type.
  // `heal` is intentionally excluded from nested typed-damage selectors.
  if (action && action !== "heal") {
    for (const [rawId, nested] of typedOptions) {
      const value = nested[action];
      if (hasUsableValue(value)) return { path: `damage.${rawId}.${action}`, damageType: String(rawId).toLowerCase() };
    }
  }

  // Preserve Midi-QoL's action-specific selector precedence for the general roll.
  const actionPath = action ? `damage.${action}` : null;
  const actionValue = actionPath ? foundry.utils.getProperty(flagData, actionPath) : undefined;
  if (hasUsableValue(actionValue)) return { path: actionPath, damageType: null };

  // A damage type's `.all` path applies to every non-healing damage action type.
  if (action !== "heal") {
    for (const [rawId, nested] of typedOptions) {
      if (hasUsableValue(nested.all)) return { path: `damage.${rawId}.all`, damageType: String(rawId).toLowerCase() };
    }
  }

  const allValue = foundry.utils.getProperty(flagData, "damage.all");
  if (hasUsableValue(allValue)) return { path: "damage.all", damageType: null };

  // Backward compatibility for the previous `damage.fire` style. New effects
  // should use `damage.fire.all` for all action types or `damage.fire.mwak` etc.
  for (const [rawId, rawValue] of damageOptions) {
    const id = String(rawId).toLowerCase();
    if (id === "all" || EXTERNAL_DAMAGE_ACTION_TYPES.includes(id) || !supportedTypes.has(id)) continue;
    if (hasUsableValue(rawValue)) return { path: `damage.${rawId}`, damageType: id };
  }
  return null;
}
function hasExternalDamageFlag(flagData, actionType) {
  return !!getExternalDamageSelector(flagData, actionType);
}
function midiAddExternalRollTo(baseRoll, extraRoll, midi) {
  const fn = midi?.addRollTo ?? globalThis.MidiQOL?.addRollTo;
  if (typeof fn === "function") return fn(baseRoll, extraRoll);
  const copied = baseRoll.constructor.fromRoll ? baseRoll.constructor.fromRoll(baseRoll) : baseRoll;
  const OperatorTerm = foundry.dice.terms.OperatorTerm;
  const op = new OperatorTerm({ operator: "+" });
  const terms = copied.terms.concat([op], extraRoll.terms);
  try { op.evaluate(); } catch (_) { /* fromTerms may evaluate it on construction */ }
  const Combined = copied.constructor.fromTerms(terms);
  Combined.resetFormula?.();
  Combined.options = foundry.utils.deepClone(baseRoll.options ?? {});
  return Combined;
}
async function callExternalDamageMacro(workflow, roll, text, reactor, flagKey, flagPath, targetToken) {
  const midi = game.modules.get("midi-qol")?.api;
  const macroData = workflow.getMacroData?.() ?? {};
  macroData.macroPass = `flags.${MODULE_ID}.optional.${flagKey}.${flagPath}`;
  macroData.workflow = workflow;
  macroData.tag = "optional";
  macroData.roll = roll;
  macroData.actor = reactor.actor;
  macroData.target = targetToken;
  macroData.targetActor = targetToken?.actor;
  const sourceEffect = findGrantingEffect(reactor.actor, flagKey);
  let macroItem = workflow.item ?? workflow.activity?.item;
  if (sourceEffect?.origin) {
    try {
      const origin = await fromUuid(sourceEffect.origin);
      if (origin instanceof Item) macroItem = origin;
      else if (origin instanceof ActiveEffect && origin.parent instanceof Item) macroItem = origin.parent;
      else if (origin?.item instanceof Item) macroItem = origin.item;
    } catch (_) { /* Fall back to the workflow's triggering item. */ }
  }
  let macroSpec = text;
  if (text.startsWith("Macro.")) macroSpec = text.slice(6);
  const result = await workflow.callMacro(macroItem, macroSpec, macroData, { roll, actor: reactor.actor, target: targetToken });
  return result;
}
function normalizeExternalDamageRollType(damageType) {
  const type = String(damageType ?? "").trim().toLowerCase();
  if (["none", "untyped", "notype"].includes(type)) return "";
  if (type === "mhp") return "maximum";
  return damageType;
}
async function createExternalDamageRoll(formula, workflow, baseRoll, flagData, damageType = null) {
  const DamageRoll = CONFIG.Dice?.DamageRoll ?? game.system?.dice?.DamageRoll;
  if (!DamageRoll) throw new Error("D&D 5e DamageRoll class is unavailable.");
  const actor = workflow?.actor;
  const item = workflow?.activity ?? workflow?.item ?? actor;
  const data = { ...(item?.getRollData?.() ?? actor?.getRollData?.() ?? {}), ...(baseRoll?.data ?? {}) };
  const options = foundry.utils.deepClone(baseRoll?.options ?? {});
  if (readFlagBoolean(flagData?.criticalDamage) === true) options.configured = false;
  const resolvedType = damageType === null || damageType === undefined ? null : normalizeExternalDamageRollType(damageType);
  if (resolvedType !== null) options.type = resolvedType;
  const roll = new DamageRoll(String(formula), data, options);
  await roll.evaluate();
  if (resolvedType !== null) roll.options.type = resolvedType;
  return roll;
}
async function modifyExternalDamageRolls(workflow, inputRolls, value, reactor, flagKey, flagPath, selector, midi, referenceToken) {
  const rolls = Array.isArray(inputRolls) ? [...inputRolls] : inputRolls ? [inputRolls] : [];
  if (!rolls.length || !rolls[0]) return { rolls: inputRolls, modified: false };
  const base = rolls[0];
  const text = String(value ?? "").trim();
  if (!text) return { rolls: inputRolls, modified: false };
  if (/^ActivityMacro(?:\.|$)/.test(text)) {
    warn("ActivityMacro is intentionally unsupported for External Reaction optional bonuses.");
    return { rolls: inputRolls, modified: false };
  }
  const isMacro = /^(ItemMacro(?:\.|$)|Macro\.|function\.)/.test(text);
  const isTyped = !!selector.damageType;
  let macroResult;
  if (isMacro) {
    macroResult = await callExternalDamageMacro(workflow, base, text, reactor, flagKey, flagPath, referenceToken);
    if (macroResult === undefined || macroResult === null) return { rolls: inputRolls, modified: false };
    if (macroResult instanceof Roll) {
      if (isTyped) {
        const DamageRoll = CONFIG.Dice?.DamageRoll ?? game.system?.dice?.DamageRoll;
        const typedOptions = foundry.utils.deepClone(macroResult.options ?? {});
        if (readFlagBoolean(reactor.flagData?.criticalDamage) === true) typedOptions.configured = false;
        typedOptions.type = normalizeExternalDamageRollType(selector.damageType);
        const typed = new DamageRoll(macroResult.formula, macroResult.data ?? {}, typedOptions);
        await typed.evaluate(); typed.options.type = normalizeExternalDamageRollType(selector.damageType);
        rolls.push(typed);
        return { rolls, modified: true, modifiedRoll: typed };
      }
      rolls[0] = macroResult;
      return { rolls, modified: true, modifiedRoll: macroResult };
    }
    if (typeof macroResult === "number" || typeof macroResult === "string") {
      if (String(macroResult).trim() === "") return { rolls: inputRolls, modified: false };
      return modifyExternalDamageRolls(workflow, inputRolls, String(macroResult), reactor, flagKey, flagPath, selector, midi, referenceToken);
    }
    return { rolls: inputRolls, modified: false };
  }
  if (isTyped) {
    if (["reroll", "reroll-query", "reroll-kh", "reroll-kl", "reroll-max", "reroll-min", "critical", "success", "fail"].includes(text) || text.startsWith("reroll-withBonus ")) {
      warn(`Damage type-specific flag ${flagPath} accepts a damage formula, replace formula, or macro. '${text}' is not a meaningful standalone typed-damage value.`);
      return { rolls: inputRolls, modified: false };
    }
    const formula = text.startsWith("replace ") ? text.slice(8).trim() : text;
    const typedRoll = await createExternalDamageRoll(formula, workflow, base, reactor.flagData, selector.damageType);
    setConfiguredRollMode(typedRoll, reactor.flagData, reactor.recipient);
    rolls.push(typedRoll);
    return { rolls, modified: true, modifiedRoll: typedRoll };
  }
  let newRoll = base;
  if (["reroll", "reroll-query", "reroll-kh", "reroll-kl", "reroll-max", "reroll-min"].includes(text)) {
    const opts = text === "reroll-max" ? { maximize: true } : text === "reroll-min" ? { minimize: true } : undefined;
    const reroll = await base.reroll(opts);
    if (text === "reroll-query") {
      const accepted = await game.modules.get(MODULE_ID)?.api?.socket?.executeAsUser?.("confirmReroll", reactor.recipient.id, {
        originalHTML: await midi.midiRenderRoll(base), rerollHTML: await midi.midiRenderRoll(reroll), timeout: 0
      });
      newRoll = accepted ? reroll : base;
    } else if (text === "reroll-kh") newRoll = reroll.total > base.total ? reroll : base;
    else if (text === "reroll-kl") newRoll = reroll.total < base.total ? reroll : base;
    else newRoll = reroll;
  } else if (text.startsWith("reroll-withBonus ")) {
    let bonus = text.slice("reroll-withBonus ".length).trim();
    if (!bonus.startsWith("+")) bonus = `+ ${bonus}`;
    newRoll = await createExternalDamageRoll(`${base.formula} ${bonus}`, workflow, base, reactor.flagData, base.options?.type ?? null);
  } else if (text.startsWith("replace ")) {
    newRoll = await createExternalDamageRoll(text.slice(8).trim(), workflow, base, reactor.flagData, base.options?.type ?? null);
  } else if (text === "critical") {
    newRoll = base.clone();
    newRoll.options = foundry.utils.deepClone(base.options ?? {});
    newRoll.options.isCritical = true;
    newRoll.options.configured = false;
    newRoll = await newRoll.reroll();
  } else if (text === "success" || text === "fail") {
    newRoll = await base.clone().evaluate();
    const result = text === "success" ? 99 : -1;
    const firstDie = newRoll.terms?.find(term => term instanceof foundry.dice.terms.Die);
    if (firstDie?.results?.length) firstDie.results.forEach(r => { if (r.active) r.result = result; });
    newRoll._total = result;
    newRoll.options = foundry.utils.deepClone(base.options ?? {});
    newRoll.options.success = text === "success";
  } else {
    const extra = await createExternalDamageRoll(text, workflow, base, reactor.flagData, null);
    newRoll = midiAddExternalRollTo(base, extra, midi);
    // A global/action-type damage modifier adds to the existing damage roll and retains its type.
    newRoll.options = foundry.utils.mergeObject(foundry.utils.deepClone(base.options ?? {}), foundry.utils.deepClone(newRoll.options ?? {}), { inplace: false });
  }
  setConfiguredRollMode(newRoll, reactor.flagData, reactor.recipient);
  rolls[0] = newRoll;
  return { rolls, modified: newRoll !== base || newRoll.total !== base.total || newRoll.formula !== base.formula, modifiedRoll: newRoll };
}
async function collectExternalDamageReactors(workflow, midi) {
  const actionType = workflow?.activity?.actionType ?? workflow?.item?.system?.actionType ?? "other";
  const actorMap = collectSceneActors(workflow?.targets ? [...workflow.targets] : []);
  const gm = game.users.find(user => user.active && user.isGM);
  const reactors = [];
  const actionActorToken = getWorkflowToken(workflow);
  const damageTargetCandidates = [
    ...(workflow?.hitTargets ?? []),
    ...(workflow?.hitTargetsEC ?? []),
    ...(workflow?.targets ?? [])
  ];
  const actionTargetToken = damageTargetCandidates.map(normalizeToken).find(token => token?.actor) ?? null;
  // Keep referenceToken for legacy value suffixes (the old damage direction), but use the
  // explicit action target in activation expressions.
  const referenceToken = actionActorToken;
  for (const { actor, token } of actorMap.values()) {
    if (actor.uuid === workflow?.actor?.uuid) continue;
    const optional = foundry.utils.getProperty(actor, FLAG_ROOT) ?? {};
    for (const [flagKey, flagData] of Object.entries(optional)) {
      if (!flagData || typeof flagData !== "object") continue;
      const selector = getExternalDamageSelector(flagData, actionType);
      if (!selector) continue;
      if (!countAvailable(actor, flagData, flagKey)) continue;
      const player = midi.playerForActor(actor);
      const recipient = player?.active ? player : gm;
      if (!recipient) continue;
      const usesCharacterReaction = flagData.count === "reaction" || flagData.countAlt === "reaction";
      if (usesCharacterReaction && midi.hasUsedReaction?.(actor)) continue;
      reactors.push({ actor, token, flagKey, flagData, selector, recipient, usesCharacterReaction, midi });
    }
  }
  return { reactors, referenceToken, actionActorToken, actionTargetToken, actionType };
}
async function processExternalDamageBonuses(workflow, inputRolls, runtime) {
  let rolls = Array.isArray(inputRolls) ? [...inputRolls] : inputRolls ? [inputRolls] : [];
  if (!rolls.length) return inputRolls;
  const midi = game.modules.get("midi-qol")?.api;
  const socket = game.modules.get(MODULE_ID)?.api?.socket;
  if (!midi?.midiRenderRoll || !socket || !runtime?.reactors?.length) return inputRolls;
  for (const reactor of runtime.reactors) {
    await withExternalCountLock(reactor.actor, reactor.flagKey, async () => {
      const { actor, flagKey, flagData, selector, recipient, usesCharacterReaction } = reactor;
      if (!countAvailable(actor, flagData, flagKey)) return;
      if (usesCharacterReaction && midi.hasUsedReaction?.(actor)) return;
      const rawValue = foundry.utils.getProperty(flagData, selector.path);
      if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return;
      const parsed = parseDispositionValue(rawValue);
      if (!parsed.value || !dispositionMatches(reactor, runtime.referenceToken, parsed.qualifier)) return;
      const activationAllowed = await evaluateExternalActivation(reactor, workflow, runtime.actionTargetToken, {
        actionKind: "damage", phase: "damage", actionType: runtime.actionType,
        roll: rolls[0], activity: runtime.activity, item: runtime.activity?.item ?? workflow.item,
        isDamage: true, dc: undefined,
        actionActorToken: runtime.actionActorToken,
        actionActor: workflow?.actor
      }, midi);
      if (!activationAllowed || !countAvailable(actor, flagData, flagKey)) return;
      const beforeRolls = [...rolls];
      const title = `${actor.name} — External Reaction Damage Bonus`;
      const accepted = await promptForReaction(socket, midi, reactor, workflow, rolls[0], String(rawValue), flagData, title);
      if (!accepted || !countAvailable(actor, flagData, flagKey, { ignorePaidSpellSlot: accepted?.spellSlotPaid === true }) || (usesCharacterReaction && midi.hasUsedReaction?.(actor))) return;
      try {
        const result = await modifyExternalDamageRolls(workflow, rolls, parsed.value, reactor, flagKey, selector.path, selector, midi, runtime.referenceToken);
        if (!result.modified) return;
        rolls = result.rolls;
        if (result.modifiedRoll) setConfiguredRollMode(result.modifiedRoll, flagData, recipient);
        await displayExternalBonusRolls(beforeRolls, rolls, actor, flagData, title, midi, recipient);
        await consumeCount(actor, flagKey, flagData);
        log(`Applied optional value '${rawValue}' (${selector.path}) to ${workflow.actor?.name ?? "the workflow actor"}'s damage roll; count owner: ${actor.name}`);
      } catch (err) { error(`Could not apply external damage value '${rawValue}' from ${actor.name}.`, err); }
    });
  }
  return rolls;
}

Hooks.on("midi-qol.preDamageRoll", async (workflow, activity) => {
  try {
    if (!workflow || typeof workflow.processDamageRollBonusFlags !== "function") return;
    const midi = game.modules.get("midi-qol")?.api;
    if (!midi?.playerForActor || !midi?.midiRenderRoll) return;
    workflow.__externalReactionDamageRuntime = {
      ...(await collectExternalDamageReactors(workflow, midi)),
      activity: activity ?? workflow.activity,
      phase: Number(workflow.__externalReactionDamageRuntime?.phase ?? 0) + 1
    };
    if (patchedDamageWorkflows.has(workflow)) return;
    const original = workflow.processDamageRollBonusFlags;
    workflow.processDamageRollBonusFlags = async function (...args) {
      const damageRolls = await original.apply(this, args);
      const runtime = this.__externalReactionDamageRuntime;
      if (!runtime || this.__externalReactionDamageProcessedPhase === runtime.phase) return damageRolls;
      this.__externalReactionDamageProcessedPhase = runtime.phase;
      try { return await processExternalDamageBonuses(this, damageRolls, runtime); }
      catch (err) { error("External damage bonus integration failed.", err); return damageRolls; }
      finally { await flushExternalTriggeredActivities(this, game.modules.get(MODULE_ID)?.api?.socket); }
    };
    patchedDamageWorkflows.add(workflow);
    debug("Prepared external damage reaction integration", {
      actor: workflow.actor?.name, actionType: workflow.activity?.actionType,
      reactors: workflow.__externalReactionDamageRuntime.reactors.map(r => ({ actor: r.actor.name, flagKey: r.flagKey, path: r.selector.path }))
    });
  } catch (err) { error("Could not prepare external damage reaction integration.", err); }
});

Hooks.on("midi-qol.preCheckSaves", async (workflow) => {
  try {
    if (!workflow || patchedSaveWorkflows.has(workflow)) return;
    const midi = game.modules.get("midi-qol")?.api;
    if (!midi?.playerForActor || !midi?.midiRenderRoll) {
      error("Required Midi-QoL APIs are unavailable for save reactions (playerForActor, midiRenderRoll).");
      return;
    }
    const preferredTokens = getSaveTargetTokens(workflow);
    const actorMap = collectSceneActors(preferredTokens);
    const gm = game.users.find(u => u.active && u.isGM);
    const reactors = new Map();
    for (const { actor, token } of actorMap.values()) {
      const optional = foundry.utils.getProperty(actor, FLAG_ROOT) ?? {};
      for (const [flagKey, flagData] of Object.entries(optional)) {
        if (!flagData || typeof flagData !== "object") continue;
        const hasSaveFlag = [
          "save.all", "save.fail.all", "save.success.all",
          ...["str", "dex", "con", "int", "wis", "cha"].flatMap(ab => [`save.${ab}`, `save.fail.${ab}`, `save.success.${ab}`])
        ].some(path => {
          const value = foundry.utils.getProperty(flagData, path);
          return value !== undefined && value !== null && String(value).trim() !== "";
        });
        if (!hasSaveFlag) continue;
        const usesCharacterReaction = flagData.count === "reaction" || flagData.countAlt === "reaction";
        const user = midi.playerForActor(actor);
        const recipient = user?.active ? user : gm;
        if (!recipient) continue;
        if (usesCharacterReaction && midi.hasUsedReaction?.(actor)) continue;
        if (!countAvailable(actor, flagData, flagKey)) continue;
        reactors.set(`${actor.uuid}:${flagKey}`, { actor, token: findTokenForActor(actor, preferredTokens) ?? token, flagKey, flagData, usesCharacterReaction, recipient, midi });
      }
    }
    if (!reactors.size) return;
    const original = workflow.processTargetSaveResult;
    if (typeof original !== "function") {
      error("Workflow processTargetSaveResult method not found; no save changes made.");
      return;
    }
    const activitySocket = game.modules.get(MODULE_ID)?.api?.socket;
    const originalCheckSaves = workflow.checkSaves;
    if (typeof originalCheckSaves === "function" && !workflow.__externalReactionActivityFlushWrapped) {
      workflow.checkSaves = async function (...args) {
        try {
          return await originalCheckSaves.apply(this, args);
        } finally {
          // checkSaves processes every target sequentially. This is the batch boundary:
          // all eligible target prompts and consumption checks have now completed.
          await flushExternalTriggeredActivities(this, activitySocket);
        }
      };
      Object.defineProperty(workflow, "__externalReactionActivityFlushWrapped", { value: true, configurable: true });
    }
    patchedSaveWorkflows.add(workflow);
    workflow.processTargetSaveResult = async function (target, result, context, ...args) {
      const rolls = Array.isArray(result) ? result : result ? [result] : [];
      if (!target?.actor || !rolls[0] || context?.rollType !== "save" || this.__externalReactionSaveBypass) {
        return original.call(this, target, result, context, ...args);
      }
      const socket = game.modules.get(MODULE_ID)?.api?.socket;
      if (!socket) return original.call(this, target, result, context, ...args);
      const originalSaveRoll = rolls[0];
      const saveResultsIndex = Array.isArray(this.saveResults) ? this.saveResults.indexOf(originalSaveRoll) : -1;
      try {
        // Normal bonuses adjust the actual roll before Midi-QoL adjudicates the save.
        await processSaveReactionPhase(this, target, rolls, context, "save", reactors, midi, socket);
        // Mirror Midi-QoL's pre-bookkeeping success calculation, including its critical-save rule,
        // cover bonus, and built-in automatic-success features. Midi then performs final bookkeeping.
        let saved = await determineSaveOutcome(this, target, rolls, context);
        if (!saved) {
          await processSaveReactionPhase(this, target, rolls, context, "fail", reactors, midi, socket);
          saved = await determineSaveOutcome(this, target, rolls, context);
        }
        // Match the attack flow: success-only bonuses are checked after miss-only bonuses, so a
        // failed save that becomes successful can then qualify for success-only reactions.
        if (saved) await processSaveReactionPhase(this, target, rolls, context, "success", reactors, midi, socket);
        synchronizeModifiedSave(this, target, originalSaveRoll, rolls[0], saveResultsIndex);
      } catch (err) {
        error(`External save reaction failed for ${target.actor.name}.`, err);
        synchronizeModifiedSave(this, target, originalSaveRoll, rolls[0], saveResultsIndex);
      }
      const processed = await original.call(this, target, rolls, context, ...args);
      // Midi may normalize the accepted roll to D20Roll during processing; synchronize the
      // flattened list, but don't overwrite targetSaveDetails because Midi's display builder
      // may have stored a later roll (e.g. a native fail bonus or concentration bonus).
      synchronizeModifiedSave(this, target, originalSaveRoll, rolls[0], saveResultsIndex, false);
      const targetUuid = target?.document?.uuid ?? target?.document?.id;
      const displayRoll = this.targetSaveDetails?.[targetUuid]?.saveRoll ?? rolls[0];
      await updateSaveRollChatCard(this, target, originalSaveRoll, displayRoll);
      return processed;
    };
    debug("Prepared external-reaction save integration", {
      workflowActor: workflow.actor?.name,
      targets: preferredTokens.map(t => t.actor?.name),
      reactors: [...reactors.values()].map(r => ({ actor: r.actor.name, flagKey: r.flagKey }))
    });
  } catch (err) { error("Error preparing external save reaction", err); }
});
