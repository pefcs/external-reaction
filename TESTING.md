## v0.11.1 — standalone save-card permission regression

Run in a disposable Foundry V14 world with D&D 5e 6.0.6+, Midi-QoL 14.6.4+, and socketlib.

- [ ] Trigger an External Reaction save bonus from a player client and confirm the standalone save-roll card displays the final Roll and total.
- [ ] Confirm the player console does not report `lacks permission to update ChatMessage` or the External Reaction save-card update stack trace.
- [ ] Confirm a GM-triggered save bonus still updates the card directly.
- [ ] Confirm a player who does not own the save message's speaker Actor cannot use the GM socket handler to update it.
- [ ] Confirm unrelated chat messages and messages without originating save-roll metadata are rejected by the handler.

## v0.11.0 — release verification

Run in a disposable Foundry V14 world with D&D 5e 6.0.6+, Midi-QoL 14.6.4+, and socketlib. Keep these cases unchecked until each is verified in-world.

- [ ] Confirm the installable release ZIP includes `packs/examples` and all three user-facing docs in `docs/`.
- [ ] Confirm the compiled **External Reaction — Practical Examples** compendium has 40 Active Effects, including both Tool entries and the direct Activity template.
- [ ] Drag **Tool — Artisan's Precision** onto an Actor; the Actor's own proficient tool checks offer +1d4, at most once per turn. Other Actors' checks must not prompt this self-only option.
- [ ] Confirm `activation = self` is true only when the option-owning Actor performs the relevant roll; `actor == self`, `target == self`, and `self.*` item/data access retain their previous meanings.
- [ ] Confirm `activation = tool` is true for tool checks, but false for skill and ability checks.
- [ ] Confirm `tool.all` applies to tool checks without a DC, and `tool.{tool}` wins over the matching `.all` fallback when the tool ID is available.
- [ ] Confirm `tool.fail.all` / `tool.fail.{tool}` are offered only for an initially failed check with a numeric DC, and that the modified roll can be adjudicated again.
- [ ] Confirm `tool.success.all` / `tool.success.{tool}` are offered only for a successful check with a numeric DC.
- [ ] Confirm `tool.prof` passes for proficiency/expertise, `tool.exp` only passes for expertise, and missing/ambiguous tool or roller data fails closed.
- [ ] Confirm `skill.prof` / `skill.exp` remain composable with `self` and still work only for skill checks. Test `self && (skill.prof || tool.prof)`.
- [ ] Repeat tool and self-only tests when the GM initiates a character's roll. Existing third-party attack, save, ability-check, skill-check, damage, and AC reactions must remain unchanged.
- [ ] Confirm `tool.fail.*` / `tool.success.*` do not appear when the workflow has no numeric DC.

## Local test build — Active Effect compendium

- [ ] Confirm the module exposes **External Reaction — Practical Examples** as a D&D 5e ActiveEffect compendium.
- [ ] Open several entries and verify their names, descriptions, and change lists survive import.
- [ ] Confirm only **Defense — Arcane Aegis** sets `displayBonusRolls = true` and **Check — Private Oracle's Insight** sets `displayBonusRolls = false`; the other entries should inherit Midi-QoL's configured setting.
- [ ] Drag an immediately usable example onto a test character, then confirm its effect changes and flags appear on the actor.
- [ ] Test Arcane Aegis / Shieldbearer's Brace against attacks; confirm only matching conditions offer a reaction.
- [ ] Test Protective Intercession and Agile Escape on failed saves.
- [ ] Test Trained Reflexes and Expert's Edge with proficient, half-proficient, and expertise skill checks.
- [ ] Test typed damage examples with Midi-QoL and verify each extra DamageRoll uses the configured damage type.
- [ ] Test count resources (reaction, bonus action, each-turn, each-round, spell slot, ItemUses) and confirm declined/cancelled prompts do not unexpectedly spend resources.
- [ ] Confirm the three Template entries are disabled (ActivityUses cost, direct Activity trigger, and damage-triggered Item Macro) and each description explains what to configure before enabling.
- [ ] Confirm all example Active Effects can be removed cleanly from the test character.

## v0.10.9 — release verification

Run in a disposable Foundry V14 world with D&D 5e 6.0.6+, Midi-QoL 14.6.4+, and socketlib.

Verified in-world:
- [x] Use `activation = damage` on an ItemMacro-backed option and confirm the reaction triggers when the target takes damage.
- [x] Use `skill.prof` and `skill.exp` to filter reactions according to the original workflow target's proficiency and expertise in the skill actually being rolled.
- [x] Return an Activity with the `actor` suffix and confirm it targets the original initiator without opening the module target picker.
- [x] Return an Activity without a suffix, select a target, and confirm the Activity uses the selected target rather than the reactor.

Additional regression checks:
- [ ] Verify a missed attack does not trigger a damage reaction or consume a count/reaction.
- [ ] Verify hits that result in zero HP and Temporary HP damage do not trigger a damage reaction.
- [ ] Verify AOE damage checks each target independently and skips targets that take no damage.
- [ ] Verify a non-skill check cannot pass `skill.prof` or `skill.exp`, and a non-tool check cannot pass `tool.prof` or `tool.exp`.
- [ ] Verify `self` is true for the Actor performing its own roll and false for other actors' options, including when a GM initiates the roll.
- [ ] Verify Check Activities with several associated skills use the workflow's selected skill, and fail closed if the skill cannot be identified.
- [ ] Verify a missing original target fails closed for `skill.prof` / `skill.exp` and a missing tool identifier or roller fails closed for `tool.prof` / `tool.exp`.
- [ ] Retest resource consumption, spell-slot spending, and the original damage workflow after a returned Activity is used.

# External Reaction v0.10.8 — Release verification

**Target environment:** Foundry VTT 14.369 · D&D 5e 6.0.6 · Midi-QoL 14.6.4 · socketlib.

The following end-to-end cases were verified in-world before promoting v0.10.8 from beta to stable. Other historical checklist sections below are regression cases and should still be exercised after relevant code or dependency changes.

- [x] **Player reactor, GM initiates action:** the accepted Item Macro and its ability-check UI execute on the reactor player's client.
- [x] **GM reactor, player initiates action:** the accepted Item Macro and its ability-check UI execute on the GM client when the reactor is GM-owned.
- [x] **Counterspell equal/lower level:** a spell cast at a level equal to or lower than Counterspell's selected slot is cancelled without an ability check.
- [x] **Counterspell higher level, successful check:** a successful spellcasting ability check against DC `10 + spell level` cancels the original cast.
- [x] **Counterspell higher level, failed check:** a failed ability check allows the original cast to continue.
- [x] **Roll result extraction:** the Item Macro reads the returned D&D 5e `D20Roll` total and can make the cancel/continue decision.
- [x] **Independent local macro declarations:** Item Macros can declare local `const` bindings such as `data` and `externalReaction` without a duplicate-identifier SyntaxError.
- [x] **Return-value contract:** `"cancel"` and `"continue"` return values correctly control the original workflow in the tested Counterspell cases.

# External Reaction v0.9.5 — Regression, Logging, Spell-Slot Cost, and Triggered Activity Test Plan

**Target environment:** Foundry VTT 14.369 · D&D 5e 6.0.6 · Midi-QoL 14.6.4 · socketlib enabled.

This is a regression-focused patch release on top of the v0.9.0 Activity-trigger feature. v0.8.0 added skill reactions, typed damage additions, AC reactions, and handling for `criticalDamage`, `displayBonusRolls`, and `rollMode`; v0.8.2 extends typed damage selectors with action-type-specific variants; v0.8.3 adds AC selectors and v0.8.5 added scene-wide AC reactor discovery, and v0.8.6 improves third-party AC flag discovery and makes `actor` / `target` explicit in activation conditions; v0.8.9 adds Actor-identity comparisons between `actor`, `target`, and `self`; v0.9.0 adds `activity.trigger` to use an embedded D&D 5e Activity after a reaction is accepted; v0.9.1 fixes multi-target count races and actor/self eligibility for save/check/skill reactions. Previously tested attack, save, ability-check, activation-condition, count, visibility, range, and actor-owned item helpers should remain intact.

> Test in a copy of your world. Static code/manifest/ZIP checks have been run; the regression cases below still require verification inside Foundry. v0.9.2 fixes triggered Activity target application for Foundry V14; v0.9.3 queues/deduplicates Activity triggers until all optional reaction prompts in the batch are resolved; v0.9.4 adds `spellslot X` count/countAlt support with an ordinary/Pact Magic slot selector and cancel-safe payment; v0.9.5 aligns console logging with Midi-QoL Debug and makes spell-slot dialog cancellation a silent opt-out.

## Regression tests — v0.10.2 Item Macro source resolution

Test in a disposable world. These checks cover Item Macro source resolution and macro-stage behavior. Re-run them after changes to the corresponding code or dependency versions.

- [ ] A transferred External Reaction Active Effect on an Actor-owned Item whose macro is stored under `flags.dae.macro` is resolved and invoked.
- [ ] A transferred External Reaction Active Effect is matched back to the embedded source Item by its effect changes even if `fromUuid(effect.origin)` does not return that Item.
- [ ] An Item Macro stored under legacy `flags.itemacro.macro` still resolves and runs.
- [ ] If an Item's legacy `itemacro` flag scope is not registered/active, Item Macro lookup does not throw or block workflow dispatch; DAE/DIME `flags.dae.macro` still resolves normally, and missing macros fail gracefully.
- [ ] With `activation = cast`, a cantrip spell Activity triggers at the explicitly configured `preAttackRoll` stage; confirm the test dialog reports `preAttackRoll`.
- [ ] With no External Reaction `itemMacro` optional configured, ordinary Activities still enter their normal workflow; the `midi-qol.preTargeting` dispatcher-installation hook must not abort item use.
- [ ] For the Item Macro route, set `activity.trigger = ItemMacro` and return the Activity reference from the macro; do not put the Activity UUID in that `ItemMacro` dispatch value. Non-`ItemMacro` `activity.trigger` values are supported for direct Activity use and are tested separately below.
- [ ] `activity.trigger = itemMacro` with no pass dispatches at `postActiveEffects`, as External Reaction's configured default for a bare trigger. No prompt should appear before then.
- [ ] `activity.trigger = "ItemMacro, postAttackRoll"` and the equivalent separate `activity.macroPass = postAttackRoll` both prompt only after the attack roll has been adjudicated.
- [ ] At `postAttackRoll`, the macro sees the completed attack roll and known hit/miss result; if it returns `"cancel"`, the attack roll remains visible but the normal damage roll and later processing are aborted.
- [ ] `preCheckHits` triggers after the attack roll but before hit adjudication; when cancelled, verify Midi-QoL doesn't proceed to hit evaluation or damage.
- [ ] `postAttackRoll` triggers after hit/miss evaluation and before damage; when cancelled, the attack roll and result remain visible while damage is not rolled.
- [ ] `preDamageRoll` triggers at Midi-QoL's awaited pre-damage hook; when cancelled, the damage roll does not happen. `postDamageRoll` triggers after the damage roll and cancels later processing.
- [ ] `preSave` triggers through `midi-qol.preCheckSaves` when automatic save checking is enabled; when cancelled, verify save resolution doesn't continue.
- [ ] `preActiveEffects` uses Midi-QoL's `haltEffectsApplication` contract to stop later Active Effect application; damage or other earlier processing may already have happened. `postActiveEffects` runs after effects have already been applied and must not be treated as rollback.
- [ ] Invalid/unsupported stages such as `preDamageApplication`, `preAttackRollConfig`, `preDamageRollConfig`, and `damageBonus` are not treated as cancellation stages; confirm they are logged/skipped rather than running at an unsafe point.
- [ ] Invalid/unknown pass names are skipped with a debug message; `all` is not accepted to avoid repeated reactions.
- [ ] `activation = cast` matches spell items; `activation = attack` and `mwak`/`rwak`/`msak`/`rsak` match the appropriate activity type.
- [ ] `activation = canSee && actor.range <= 60 && cast` rejects a caster that is invisible or out of range and offers only for a qualifying spell cast.
- [ ] Accept with `count = spellslot 3`; verify the macro receives `externalReaction.resource.level`, slot pool, and before/after receipt.
- [ ] For a reaction-cost case, use `count = reaction` and `countAlt = spellslot 3`; verify the reaction and spell slot are both consumed exactly once.
- [ ] If the Item Macro launches a normal spell Activity, verify slot consumption occurs once—not once in External Reaction and again in the Activity.
- [ ] Accept with `count = ItemUses.SomeFeature`; verify exactly one use is spent on the reactor's client and a matching `itemUsage` receipt reaches the macro.
- [ ] Return `0`, `false`, or `continue`; the original action proceeds normally.
- [ ] Return `true` or `cancel` at `preItemRoll`; the original item workflow is aborted before its normal resource consumption.
- [ ] Return `cancel` at `postAttackRoll`; earlier attack roll and hit result remain visible, while later processing is aborted.
- [ ] Return `cancel` at `preCheckHits`; confirm hit adjudication and damage are both prevented. Return `cancel` at `preDamageRoll`; confirm the damage roll is prevented.
- [ ] Return an Activity UUID string; that Activity runs on the reactor's client and the original action continues.
- [ ] Return `{ action: "activity", activityUuid: "...", cancelOriginal: true }`; the Activity runs and the original action is cancelled.
- [ ] Confirm a flag with `activity.trigger = itemMacro` is not also processed as an ordinary roll-bonus/Activity-trigger option.
- [ ] Confirm an Item Macro error, unresolved Activity, missing source Item, or missing Item Macro leaves the original workflow unchanged and logs a useful message.
- [ ] **Counterspell 2014 resource caveat:** aborting at `preItemRoll` does not automatically spend the interrupted caster's slot. Test and configure the desired resource behavior separately; cancellation itself is not a rollback or resource-payment mechanism.
- [ ] For later-stage cancellation, confirm resources and effects already consumed/applied by that stage are not assumed to be automatically restored.

## Regression tests — 0.10.8 isolated Item Macro declaration scope

- [ ] Use a macro that declares `const data = args[0] ?? {};` and `const externalReaction = data.externalReaction ?? {};`; confirm it executes without an `Identifier has already been declared` SyntaxError and reads the expected context.
- [ ] Repeat with local declarations named `actor`, `item`, and `workflow`; confirm local declarations may safely shadow the outer compatibility bindings.
- [ ] Verify top-level `return "cancel"`, `return "continue"`, an Activity UUID, and `return { action: "activity", activityUuid: "..." }` keep their existing result behavior after wrapping.

## Regression tests — 0.10.7 reactor-client Item Macro execution

- [ ] With a player-owned reactor and a different player/GM initiating the action, accept an ItemMacro reaction and confirm the macro's `game.user.id` is the reactor owner's ID.
- [ ] Use a Counterspell ItemMacro that calls `actor.rollAbilityCheck()`; confirm any roll prompt and the roll are shown on the reactor owner's client, not the initiating caster's client.
- [ ] Give the reactor Actor to the GM only; confirm the macro and any roll UI run on the GM client.
- [ ] Temporarily disconnect/deactivate the reactor owner; confirm the GM fallback is selected and the execution is performed by the GM.
- [ ] Confirm the macro receives `args[0].reactor`, `actor`, `item`, `token`, `target`, `targetActor`, `externalReaction.resources`, `initiatingActor`, `initiatingItem`, `initiatingActivity`, and `workflow.castData.castLevel` when available.
- [ ] Return `"cancel"`, `"continue"`, and an Activity UUID from the ItemMacro; verify the original workflow behavior is unchanged except for the execution client.
- [ ] Run a macro that returns a structured object such as `{ action: "activity", activityUuid: "...", cancelOriginal: true }` and verify it still resolves.
- [ ] Confirm an ItemMacro with side effects on the reactor's client works; macros that rely on live methods of the initiating Midi-QoL Workflow or directly mutate its in-memory state may need to use the returned-value contract instead, because the remote context exposes a serializable workflow snapshot.
- [ ] Test both `preItemRoll` and a later configured stage such as `postAttackRoll`; the originating workflow must remain paused until the recipient-side ItemMacro completes.

## 1. Preparation

1. Back up the current world and install `external-reaction` v0.10.8 over the older copy. Fully reload Foundry after replacing the module.
2. Confirm Foundry, D&D 5e, Midi-QoL, and socketlib are active and versions are as listed above.
3. Put at least one actor with a token on the active scene as an external reactor and a separate token to perform the attack/save/check/damage workflow. Use player users when testing player-facing prompts/roll visibility; GM fallback is not a substitute for all roll-mode tests.
4. Use a temporary Active Effect on the reactor with changes in Override mode. The flag suffixes below are relative to `flags.external-reaction.optional.TEST.`.
5. Use `count = every` while testing repeated behavior. With no `count` or `countAlt`, accepting consumes the granting effect (but does not automatically consume the actor reaction).
6. In the first pass, leave `activation` blank/absent. Then test activation expressions as a separate pass.

Basic repeatable setup example:

| Active Effect change key suffix | Value |
|---|---|
| `count` | `every` |
| `label` | `External Reaction test` |
| `attack.all` | `+5` |
| `save.all` | `+5` |
| `check.all` | `+5` |
| `skill.all` | `+5` |
| `damage.all` | `1d4` |
| `damage.fire.all` | `1d6` |
| `damage.fire.mwak` | `1d6` |
| `ac` | `+2` |
| `ac.hit` | `+2` |
| `ac.mwak` | `+2` |
| `ac.mwak.hit` | `+2` |
| `activation` | `true` |

Only leave one bonus type enabled at a time unless a test explicitly calls for multiple groups. This makes it easier to isolate a failure.

## 2. Logging-level behavior (v0.9.5)

Use **Midi-QoL → Debug** in the world settings. Open the browser console and trigger a known External Reaction diagnostic (for example, a successful optional value application).

- [ ] **None:** normal External Reaction activity produces no warning/info/debug console output. Deliberate errors still use red `console.error` output.
- [ ] **Warnings:** yellow `console.warn` messages and red errors are shown; info/debug/trace output is hidden.
- [ ] **Debug:** warnings, info (`console.info`), debug (`console.debug`), and errors are shown; trace output remains hidden.
- [ ] **All:** warning, info, debug, and All-only trace output are shown.
- [ ] **Spell-slot Cancel button:** accept an optional reaction requiring `spellslot 1`, then click Cancel in the slot picker. No slot is spent, no optional value is applied, no Activity trigger is queued, and no on-screen warning appears. At `Warnings`, `Debug`, or `All`, a yellow console warning records the intentional opt-out; at `None`, it is suppressed.
- [ ] **Close the picker:** closing the spell-slot dialog has the same silent cancellation behavior as clicking Cancel.
- [ ] **Stale selection is different:** if another action actually depletes the selected slot between selection and payment, a warning remains appropriate because the selected resource became unavailable.
- [ ] **Errors remain visible:** confirm External Reaction errors still appear red in the console even with Midi-QoL Debug set to `None`.

## 2. Regression — previously confirmed features

- [ ] **Attack normal:** `attack.all = +5`; an external reactor prompts and accepted bonus changes attack result.
- [ ] **Attack type-specific:** `attack.mwak = +1d4`; it applies only to the matching action type.
- [ ] **Attack miss-only:** `attack.fail.all = reroll`; it prompts only when the post-normal-bonus attack misses.
- [ ] **Attack hit-only:** `attack.success.mwak = +1`; it prompts only after a successful eligible attack.
- [ ] **Save normal / fail / success:** `save.all = +5`, `save.fail.all = reroll`, `save.success.all = +1d4`; outcome and final roll card match.
- [ ] **Ability checks:** `check.all = +5` works. With a numeric DC, fail/success phases are evaluated as expected.
- [ ] **Activation:** `friendly`, `enemy`, `CanSee`, `range <= 40`, `self.item.has("Shield")`, and `target.item.has("Counterspell")` still behave as tested in v0.7.2.
- [ ] Bare `self` on an attack bonus permits the owning Actor's own attack, but does not change eligibility for other actors' reactions.
- [ ] Bare `self` on a damage bonus permits the owning Actor's own damage workflow, while missed-attack damage remains blocked and third-party behavior is unchanged.
- [ ] Bare `self` on save/check/skill/tool options only admits the Actor making that roll, including when the GM initiates it; `actor == self` and `target == self` keep their existing identity-comparison meanings.
- [ ] **Count:** repeat a small count format from the previously confirmed suite (`numeric`, `each-turn`, `each-round`, or `every`) and confirm availability/consumption.
- [ ] **Dialog:** long, short, and default button labels render vertically and remain readable.

## 3. Skill bonuses

D&D 5e skill IDs: `acr`, `ani`, `arc`, `ath`, `dec`, `his`, `ins`, `inv`, `itm`, `med`, `nat`, `prc`, `per`, `prf`, `rel`, `slt`, `ste`, `sur`.

For a repeatable Active Effect, test each of these. Use a normal skill roll for `skill.all`; use a known proficient/known skill on the sheet for specific IDs.

- [ ] `skill.all = +5`: any skill roll by another actor prompts; adjusted formula/total appears on the individual chat card.
- [ ] `skill.arc = +5`: Arcana prompts, another skill does not.
- [ ] `skill.fail.all = reroll`: only prompts if a numeric DC is available and initial/modified result fails.
- [ ] `skill.fail.ste = reroll`: only a failed Stealth check with an accessible DC prompts.
- [ ] `skill.success.all = +1d4`: only prompts after a successful check with a known numeric DC.
- [ ] `skill.success.prc = +1d4`: only applies for successful Perception check with known DC.
- [ ] Apply `activation = friendly` and `activation = enemy`; for a direct ability/skill check, `target` is the checking creature, while `actor` is the triggering workflow actor (usually the same creature for a direct roll).
- [ ] If a regular D&D skill roll has no DC, confirm normal `skill.*` value still works and that fail/success-specific values do not guess the outcome.
- [ ] Test one Macro or `function.name` only if you already have a suitable registered example. Otherwise report it as untested rather than a failure.

## 4. Tool-check bonuses

Use a real D&D 5e tool check through the Actor sheet, and repeat with the GM initiating the check for a character. Test with a tool proficiency and, where possible, an Actor with expertise.

- [ ] `tool.all = +1`: any tool check offers the configured bonus.
- [ ] `tool.thief = +1`: the configured tool ID selects only that tool; a different tool check does not.
- [ ] `tool.fail.all = 1d4` and `tool.fail.thief = 1d4`: only failed checks with a numeric DC offer the respective bonus.
- [ ] `tool.success.all = 1d4` and `tool.success.thief = 1d4`: only successful checks with a numeric DC offer the respective bonus.
- [ ] `activation = tool` is true for tool checks and false for skill/ability checks.
- [ ] `activation = tool.prof` passes for proficiency/expertise and `tool.exp` only passes for expertise; missing tool identity fails closed.
- [ ] `activation = self && (skill.prof || tool.prof)`: the option is offered only for the owning Actor's own proficient skill or tool check. Another Actor's check does not prompt this option.
- [ ] The same self-only behavior works when the GM initiates the tool/skill check; existing third-party skill and ability-check reactions remain unchanged.

## 5. Damage — Midi-style action type and general values

These values go on a reactor that should be prompted when a separate actor's damage roll occurs. For formula tests, use repeatable counts.

- [ ] `damage.all = 1d4`: adds a bonus roll to the current damage roll.
- [ ] `damage.mwak = 1d6`: adds the bonus for a melee weapon attack damage roll.
- [ ] `damage.rwak = 1d6`: test a ranged weapon attack.
- [ ] `damage.msak = 1d6`: test a melee spell attack.
- [ ] `damage.rsak = 1d6`: test a ranged spell attack.
- [ ] `damage.save = 1d6`: test a save-based activity damage roll.
- [ ] `damage.heal = 1d6`: test a healing roll if your workflow supports it.
- [ ] Check that accepted damage changes the workflow's final damage detail, not only a detached preview.
- [ ] Check that the bonus roll/card uses the configured roll mode and display setting in Sections 8–9.

**Selector priority:** within one `NAME` flag group, the module selects the typed action-specific path first (e.g. `damage.fire.mwak`), then the general action-specific path (`damage.mwak`), then the typed `.all` path (`damage.fire.all`), then the general `damage.all`, and finally a legacy primitive typed path such as `damage.fire`. Use separate option names/effects to offer multiple independent bonus options.

## 6. Damage — typed damage values

The typed paths add a separate DamageRoll whose `options.type` is set to the selected damage type. Start with a simple formula (`1d6`), not a reroll command.

- [ ] `damage.fire.all = 1d6`: adds a separate Fire damage component for a supported damage action.
- [ ] `damage.fire.mwak = 1d6`: adds Fire damage only for a melee weapon attack; verify a ranged or spell attack does not select it.
- [ ] `damage.fire.rsak = 1d6`: adds Fire damage only for a ranged spell attack.
- [ ] `damage.cold.all = 1d4` and `damage.radiant.all = 1d6`: same typed `.all` behavior for Cold and Radiant.
- [ ] Test at least one physical type, e.g. `damage.slashing.all = 1d4` and `damage.slashing.mwak = 1d4`.
- [ ] If configured in your world, test `damage.vitality.all = 1d6` and `damage.vitality.mwak = 1d6`.
- [ ] Confirm `damage.fire.heal` is not selected for healing workflows; nested typed selector suffixes intentionally exclude `heal`.
- [ ] Confirm the old `damage.fire = 1d6` flag still works for backward compatibility, while new effects use `damage.fire.all` or a specific action-type suffix.
- [ ] If configured in your world, inspect the type list below for the exact Maximum Hit Points ID and test its path only if it is a supported DamageRoll type.
- [ ] `damage.none.all = 1d4`: bonus appears as untyped damage (No type), not as a named damage type.
- [ ] `damage.none.mwak = 1d4`: untyped damage is only selected for melee weapon attack damage.
- [ ] Confirm the legacy `damage.none = 1d4` still works for backwards compatibility.
- [ ] Confirm “No damage” (`midi-none`) is not offered as an additional damage type because it does not represent a damage roll.
- [ ] Confirm the additional typed roll is visible in the final damage detail and applies as that type (resistance/immunity should react to the type where applicable).
- [ ] Place `damage.fire.mwak = 1d6` and `damage.mwak = 1d4` in the same `NAME` group: the typed+action-specific `damage.fire.mwak` path should win.
- [ ] Remove `damage.fire.mwak`, keep `damage.mwak = 1d4` and `damage.fire.all = 1d6`: the general action-specific `damage.mwak` should win.
- [ ] Remove `damage.mwak` and add `damage.all = 1d4` with `damage.fire.all = 1d6`: `damage.fire.all` should win over the general `damage.all` path.
- [ ] Test multiple nested types in the same `NAME` group and confirm first matching typed entry follows actor flag-data order; use separate `NAME` groups for independently offered effects.

To verify exact damage/healing type IDs configured by your system, run in the Foundry browser console:

```js
console.table(Object.entries(CONFIG.DND5E?.damageTypes ?? {}).map(([id, data]) => ({
  id, label: game.i18n.localize(data.label ?? data.name ?? id)
})));
console.table(Object.entries(CONFIG.DND5E?.healingTypes ?? {}).map(([id, data]) => ({
  id, label: game.i18n.localize(data.label ?? data.name ?? id)
})));
```

If Vitality or Maximum Hit Points comes from a module rather than `CONFIG.DND5E`, note the ID and provider so the fallback path can be adjusted if needed.

## Activation actor/target context (v0.8.6)

For a third-party reaction, keep these roles separate:

- `self` = reactor with the External Reaction effect.
- `actor` = action initiator (attacker/caster/workflow user).
- `target` = action recipient (defender for attacks/AC, save/check/skill roller for those actions).

Try these activations on a third-party AC reactor:

- [ ] `true`: prompt appears for any attack matching the configured AC selector.
- [ ] `target.disposition.in('hostile', 'secret')`: inspect the defender's disposition.
- [ ] `actor.disposition.in('friendly', 'neutral')`: inspect the attacker's disposition.
- [ ] `target.disposition.in('hostile', 'secret') && actor.disposition.in('friendly', 'neutral')`: both comparisons must pass.
- [ ] `!target.disposition.in('hostile')`: negation inverts the target-disposition result.
- [ ] `target.item.has("Shield")` checks the defender's owned Items; `actor.item.has("Weapon")` checks the attacker's owned Items.
- [ ] `range <= 40 && CanSee` measures and checks visibility to the defended target.

## 7. AC bonus selectors (v0.8.5)

AC bonuses are flags on the **attacked/receiving actor**, not the attacker. They are processed during the attack workflow before Midi finalizes hit/miss adjudication. AC bonuses do not automatically consume the target's reaction unless `count` / `countAlt` explicitly specifies `reaction`.

Use one temporary Active Effect on a third-party Reactor (or directly on the target to test self-defence) with `count = every`. Selectors supported are `ac`, `ac.hit`, `ac.mwak`, `ac.rwak`, `ac.msak`, `ac.rsak`, and the four matching `.hit` variants. When the effect is on a third party, its count is consumed on that reactor, while the AC increase is applied to the defended target.

- [ ] `ac = +2`: prompt on an attack that would hit and on one that would miss. Accepting increases AC before hit adjudication.
- [ ] `ac.hit = +2`: prompt only if the attack would hit against the original effective AC; a normally missing attack must not prompt.
- [ ] `ac.mwak = +2`: prompt on melee weapon attacks whether they would hit or miss; don't prompt for ranged weapon or spell attacks.
- [ ] `ac.rwak = +2`: prompt on ranged weapon attacks only, whether hit or miss.
- [ ] `ac.msak = +2`: prompt on melee spell attacks only, whether hit or miss.
- [ ] `ac.rsak = +2`: prompt on ranged spell attacks only, whether hit or miss.
- [ ] `ac.mwak.hit = +2`: prompt only for a melee weapon attack that would hit normally.
- [ ] `ac.rwak.hit = +2`, `ac.msak.hit = +2`, and `ac.rsak.hit = +2`: each prompts only for its matching attack type when it would hit normally.
- [ ] Selector priority within the same `NAME`: set `ac = +1`, `ac.hit = +2`, `ac.mwak = +3`, `ac.mwak.hit = +4`. On a normal melee weapon hit, the selected value should be +4; on a normal melee weapon miss, +3; on a normal ranged weapon hit, +2; on a normal ranged weapon miss, +1.
- [ ] Reject a prompt and verify that AC is unchanged and Midi adjudicates the attack against the original AC.
- [ ] `ac = 1d4`: confirm the result shown in the AC prompt and the final hit adjudication use the same adjustment.
- [ ] `activation = friendly` / `enemy`: compares the reactor with the action target (the defender for AC). Use `actor.disposition.in(...)` to filter the attacker and `target.disposition.in(...)` to filter the defender.
- [ ] `activation = range <= 40 && CanSee`: range and visibility are measured to the actual action target (the defender for AC).
- [ ] `activation = target.disposition.in('hostile', 'secret')`: filter by Defender's disposition.
- [ ] `activation = actor.disposition.in('friendly', 'neutral')`: filter by Attacker's disposition.
- [ ] `activation = target.disposition.in('hostile', 'secret') && actor.disposition.in('friendly', 'neutral')`: verify both sides are evaluated independently.
- [ ] `activation = !target.disposition.in('hostile')`: verify negation works.
- [ ] `activation = actor.disposition == "hostile"`: only a Hostile initiator passes.
- [ ] `activation = target.disposition == "friendly"`: only a Friendly recipient passes.
- [ ] `activation = actor.disposition != "hostile"`: Friendly, Neutral, and Secret initiators pass.
- [ ] `activation = !actor.disposition == "hostile"`: shorthand behaves exactly like `actor.disposition != "hostile"`.
- [ ] `activation = !target.disposition == 'friendly'`: shorthand behaves exactly like `target.disposition != 'friendly'`.
- [ ] `activation = !(actor.disposition == "hostile")`: conventional JavaScript negation remains supported.
- [ ] `activation = actor == self`: prompt only when the initiating Actor is the reactor's same Actor.
- [ ] `activation = target == self`: prompt only when the action target is the reactor's same Actor (for attack/AC, the defended target; for saves/checks, the roller).
- [ ] `activation = actor != self`: prompt only when the initiating Actor differs from the reactor.
- [ ] `activation = target != self`: prompt only when the action target differs from the reactor.
- [ ] `activation = !actor == self`: convenience shorthand behaves like `actor != self`.
- [ ] `activation = !target == self`: convenience shorthand behaves like `target != self`.
- [ ] `activation = actor != self && target == self`: verify identity comparisons combine with `&&`.
- [ ] `activation = !(actor == self)`: conventional negation is equivalent to `actor != self`.
- [ ] Use two tokens linked to the same Actor and verify they compare as the same Actor; identity compares Actor UUIDs, not token UUIDs.
- [ ] Put `count = every`, `activation = true`, and `ac = +20` on a third Reactor token (not Attacker or Defender). The Reactor should receive the prompt and accepted AC should be applied to Defender.
- [ ] Repeat while the Reactor effect has `ac = +20` on an Active Effect change and confirm the option is discovered even if the actor's resolved flag object is incomplete.
- [ ] `.hit` selectors must use the effective AC captured before External Reaction applies any AC increases. An earlier AC bonus must not make a normally-missing hit selector eligible, or vice versa.
- [ ] With no `count`, accepting consumes the granting effect according to the module's normal one-use behavior without automatically consuming reaction. With `count = reaction`, confirm Midi's reaction state prevents a second use.

## 8. `criticalDamage`

This is a property of the optional flag, not a bonus value. Set it to boolean `true` or `false` in Override mode. Midi-QoL's behavior is mimicked when External Reaction constructs a bonus DamageRoll by setting `configured = false` when the property is true.

- [ ] With `criticalDamage = false`/absent, `damage.all = 1d6` follows the normal non-critical bonus roll configuration.
- [ ] With `criticalDamage = true` during a critical damage workflow, compare bonus dice with Midi-QoL's native `criticalDamage` option using the same formula.
- [ ] Test both weapon and spell damage if possible.
- [ ] Confirm this property doesn't change save or check rolls.

## 9. `displayBonusRolls`

- [ ] `displayBonusRolls = true`: accepting a bonus creates a before/after roll card.
- [ ] `displayBonusRolls = false`: accepting the bonus does not create the extra before/after card, but the modified roll still drives the workflow.
- [ ] Property absent and Midi-QoL setting unchecked: no before/after bonus card is created.
- [ ] Property absent and Midi-QoL setting checked: the before/after bonus card is created.
- [ ] Property absent while Midi-QoL's global optional-rules toggle disables mechanics: no before/after bonus card is created.
- [ ] Per-option `displayBonusRolls = true/false` overrides the global Midi setting.
- [ ] Confirm the final native workflow roll/card still contains the modified total even when the before/after card is disabled.

## 10. `rollMode`

For this set, use a GM and at least one player who owns the reactor actor. A previously seen public message cannot be made unseen retroactively; test privacy in a fresh test message.

- [ ] `rollMode = publicroll`: before/after bonus message is public.
- [ ] `rollMode = gmroll`: bonus message is visible to GMs, not ordinary players.
- [ ] `rollMode = blindroll`: message is blind to players; non-GM reactor sees a hidden roll preview in the prompt.
- [ ] `rollMode = selfroll`: bonus display is whispered to the reacting actor's assigned user.
- [ ] Omit `rollMode`: follows Midi-QoL's `core.messageMode` behavior and uses the core roll-mode setting where applicable.
- [ ] For save/check rolls, inspect both the original standalone roll card and the final Midi workflow summary. Record any case where message visibility or the content differs from the desired Midi behavior.

## 11. Activation condition interaction

- [ ] Combine skill with `activation = friendly && CanSee`.
- [ ] Combine damage with `activation = enemy && range <= 40`.
- [ ] Combine AC with `activation = friendly && target.item.has("Shield")` (for AC, `target` is the defended creature; use `actor.item.has("Weapon")` to check the attacker's owned item).
- [ ] Missing token/disposition data must use the agreed Friendly fallback for relationship checks. A missing token required by `range` still causes a condition referencing `range` to be rejected.

## 12. Results and diagnostics

For each failed test, record:

- Test section/checkbox name.
- Exact active effect change keys and values (including `count`, `rollMode`, `displayBonusRolls`, and `criticalDamage`).
- Actor making the action, reactor actor, target/receiver, action type, roll formula/total, and DC/AC.
- Whether the prompt appeared, whether accepting changed the workflow result, and whether the chat card displayed the final result.
- Any red Console errors or External Reaction debug output (enable Midi-QoL Debug `debug` temporarily if needed).

Please don't report “works/doesn't work” without the exact path/value when testing the new features; knowing which selector won (`damage.fire.mwak`, `damage.mwak`, `damage.fire.all`, `damage.all`, or a legacy `damage.fire`) matters for diagnosis.


### AC-only regression tests (v0.8.5)

- [ ] Put only `count = every`, `activation = true`, and `ac = +20` on the attacked actor. Do not configure any `attack.*` flags anywhere on the scene. This verifies self-defence AC still triggers independently of attack-bonus flags.
- [ ] Confirm accepting `ac = +20` changes the target's effective AC before Midi-QoL adjudicates the attack. In the Midi log, the attack should be checked against the increased AC.
- [ ] Repeat with the attacker and defender tokens created from the same linked Actor document (same actor UUID, different token IDs). Under v0.9.1 Actor-identity semantics, this is still the initiating Actor, so it must not react to its own outgoing attack/AC workflow. Use distinct Actor documents to verify ordinary defender self-defence.
- [ ] Repeat with an ordinary separate attacker and defender Actor as a regression check.
- [ ] If it still does not trigger, include the console line `external-reaction | Found External AC candidate...` if present. That diagnostic confirms the actor's effect was discovered and a selector was chosen. If it's absent, enable Midi-QoL Debug/All and include the full attack log so we can see whether scene discovery or flag reconstruction is failing.


## v0.8.5 — Third-party AC regression tests

### AC-only setup on a third-party reactor

1. Put three tokens on the same active scene: Attacker, Defender, and Reactor.
2. Apply the following Active Effect to **Reactor** (not Attacker or Defender):
   - `flags.external-reaction.optional.TEST.count` = `every`
   - `flags.external-reaction.optional.TEST.activation` = `true`
   - `flags.external-reaction.optional.TEST.ac` = `+20`
3. Have Attacker make a Midi-QoL attack against Defender.
4. Expected: Reactor receives the prompt. If accepted, Defender's effective AC receives +20 before Midi adjudicates hit/miss; the AC change is not applied to Reactor.
5. Decline and repeat; Defender's AC must remain unchanged.

### Count ownership

Use `count` = `2` on Reactor, accept an AC bonus against Defender, and verify the count is consumed on Reactor. Defender's flags/count must remain unchanged.

### Action type and hit selectors

Repeat with each selector on Reactor: `ac.mwak`, `ac.rwak`, `ac.msak`, `ac.rsak`, and their `.hit` variants. Confirm the generic and attack-type options trigger on the expected attack types. For `.hit`, arrange an attack whose pre-External-Reaction total would hit Defender's original AC.

### Disposition and activation context

Use `activation` = `enemy` / `friendly`, and test with Defender and Reactor having different dispositions. For attack/AC activation, `actor` refers to Attacker and `target` / `range` / `CanSee` refer to Defender.

### Compatibility check

Put `ac = +5` on Defender itself and verify self-defensive AC reactions still work as before. Re-run a normal attack-bonus test and a save-bonus test after the AC cases.


## v0.8.6 activation-context / third-party AC focused regression

Place three distinct tokens on the active scene: Attacker, Defender, and Reactor. Put `flags.external-reaction.optional.TEST.count = every`, `flags.external-reaction.optional.TEST.activation = true`, and `flags.external-reaction.optional.TEST.ac = +20` on Reactor. Attacker attacks Defender. Expected: the console logs a `Found External AC candidate` line for Reactor/Defender, Reactor receives the prompt, and accepting increases Defender's AC before Midi calculates hit/miss. It must not alter Reactor's AC.

Then test activation context: `target.disposition.in('hostile', 'secret')` inspects Defender, while `actor.disposition.in('friendly', 'neutral')` inspects Attacker. The combined expression must pass only when both sides match. If no prompt occurs, save the console output including the new `Found External AC candidate` diagnostics.


## v0.8.8 AC hit-selector regression

Use a third-party reactor and an attack where the raw attack total is below the defender's effective AC. Ensure the only applicable AC selector is the `.hit` variant for the action type being tested.

- [ ] `ac.mwak.hit = +5`: a normally-missing melee weapon attack must NOT prompt; a normally-hitting melee weapon attack must prompt.
- [ ] Repeat for `ac.rwak.hit`, `ac.msak.hit`, and `ac.rsak.hit`.
- [ ] Confirm the prompt button displays `Bonus: +5` (or your configured label), never `Bonus: [object Object]`.
- [ ] Configure both `ac.mwak.hit = +5` and a separate `ac.mwak = +2`: a normally-missing melee weapon attack may select the real general `ac.mwak` fallback, but the prompt must show `+2`, not an object.
- [ ] Repeat with `ac.hit` and `ac` to confirm generic selector fallback behavior remains correct.


## Direct Activity triggers (without an Item Macro)

Test in a disposable Foundry V14 world. The trigger reference must resolve to an Activity embedded on an Item owned by the reactor Actor.

- [ ] Configure `activity.trigger = Item.<Item Name>.Activity.<Activity Name>` alongside a selector such as `save.fail.all = 1d4`. Confirm the eligible reaction appears on the right failed save; accepting it modifies the roll and then launches the referenced Activity.
- [ ] Confirm a full Activity UUID and each documented Item/Activity reference form resolve to the intended owned Activity. Unique partial names resolve; ambiguous or missing references fail gracefully with a useful notification/diagnostic.
- [ ] Confirm no Item Macro is needed for a fixed direct Activity trigger, and no macro pass is applied to the direct reference.
- [ ] Test a direct-target Activity and an area/template Activity. The target picker/template placement should follow the Activity configuration, and the user's pre-existing targets should be restored after use.
- [ ] Verify the Activity is rejected when it belongs to a different Actor or is not embedded on the reactor's Actor.
- [ ] Confirm the three disabled setup templates (ActivityUses cost, direct Activity trigger, damage-triggered Item Macro) can each be configured, enabled, used in a test world, and then removed cleanly.

## Activity return values from Item Macros (supported path)

Test in a disposable Foundry V14 world. The Activity must belong to an Item embedded on the reactor's Actor. Configure the granting Active Effect's `flags.external-reaction.optional.NAME.activity.trigger` to invoke the reactor's stored Item Macro; that field selects the Item Macro/pass and must not contain the Activity UUID itself.

- [ ] **Macro invocation:** store the Item Macro through DAE/DIME or supported legacy Item Macro storage, set `activity.trigger = ItemMacro, postAttackRoll`, and accept the eligible option. Confirm the macro runs on the reactor owner's client after hit/miss adjudication.
- [ ] **No double registration:** do not add the same macro to Midi-QoL On Use Macro stages. Confirm it runs once and does not recursively prompt when it launches an Activity from its own Item.
- [ ] **Full UUID return:** return `"Actor.<reactorActorId>.Item.<itemId>.Activity.<activityId>"`. Confirm the Activity starts on the reactor's client and the original workflow continues.
- [ ] **Name/path return:** return a supported Item/Activity reference string. Confirm the correct embedded Activity resolves; ambiguous or missing references produce a useful diagnostic without crashing the original workflow.
- [ ] **Explicit initiator target:** return the Activity UUID with the ` actor` suffix, or `{ action: "activity", activityUuid: "...", target: "actor" }`. Confirm the original initiating Actor is targeted without the module's custom target picker.
- [ ] **Other target modes:** test `target` and `self` modes and confirm they refer to the original action target and the reactor respectively.
- [ ] **Direct-target Activity:** with no explicit return target, confirm the Activity-aware selector respects target type, range, target count, and visibility settings; chosen targets replace the previous target set through Foundry V14's `Token#setTarget()` API.
- [ ] **Area Activity:** return an Activity with an area shape configured. Confirm normal template placement / Activity configuration begins rather than the direct-target selector.
- [ ] **Structured cancellation:** return `{ action: "activity", activityUuid: "...", cancelOriginal: true }`. Confirm the Activity runs, then the remaining original workflow is aborted.
- [ ] **Continue/cancel:** return `"continue"` / `false` and verify the original workflow proceeds; return `"cancel"` / `true` and verify later workflow processing aborts without launching an Activity.
- [ ] **Missing Activity / macro error:** confirm a missing source Item, missing Item Macro, invalid Activity reference, or Item Macro error logs a useful message and does not crash or silently reroute the original workflow.
- [ ] **Item Macro dispatch config:** when `activity.trigger` starts with `ItemMacro`, keep the Activity UUID in the macro's return value rather than in the dispatcher value. Direct Activity references are valid when `activity.trigger` does not start with `ItemMacro`.

## v0.9.1 — Count concurrency and actor identity regressions

- [ ] **`count = reaction` across an AOE:** configure `save.all = +5` on one reactor with `count = reaction`. Roll a save against at least four targets in one AOE. Accept the first eligible reaction. The same reactor must not receive another offer for the remaining targets, and Midi-QoL must show the reaction as used.
- [ ] **`ItemUses` across an AOE:** use `count = ItemUses.<Item Name>` with exactly 2 uses. The reaction may be accepted twice, then must stop. Confirm item uses reach 0 and no additional prompt appears for other targets.
- [ ] **Numeric count across an AOE:** use `count = 1`. After the first accepted application, the granting Active Effect should expire, and later targets must not prompt for that option.
- [ ] **Actor owns a save option:** add `save.all = +5` to the initiating Actor and confirm it is considered for a save workflow when activation conditions allow it. `activation = actor != self` must block this case.
- [ ] **Actor owns check/skill option:** repeat with `check.all = +5` and `skill.all = +5`. The actor/self comparisons must be applied consistently.
- [ ] **No self-reaction on outgoing actions:** an initiating Actor must not react to its own outgoing attack/damage/AC workflow.
- [ ] **Incoming attack self-defense:** the attacked Actor should still be able to react to the incoming attack via `attack.all`, `damage.all`, or `ac`, subject to the flag and activation condition. Conditions such as `target == self` and `actor != self` should match the attacked Actor's perspective.



## v0.9.2 package note

The direct-target Activity path now uses Foundry V14's `Token#setTarget()` API. The first selected target is set with `releaseOthers: true`, and remaining selections use `releaseOthers: false`. Please verify single-target and multi-target behavior in the live world.


## v0.9.4 — Spell-slot costs in Count / CountAlt

Create a reactor with at least one ordinary spell slot and, if possible, a Pact Magic slot. Use an optional value that normally prompts reliably (for example, `save.all = +5`), with the spell-slot requirement set as an Active Effect change.

- [ ] **Minimum level eligibility:** set `count = spellslot 2`. The option is not offered when only level 1 slots remain, but is offered when a level 2+ ordinary or Pact Magic slot has remaining uses.
- [ ] **Ordinary slot selector:** when the option is accepted, the second dialog lists only ordinary slot levels at or above the minimum and with remaining uses. Selecting one and pressing **Cast** reduces that level's remaining slot count by exactly one, then applies the optional roll bonus.
- [ ] **Pact Magic eligibility/consumption:** configure a Warlock or multiclass Actor with Pact Magic. A Pact Magic slot qualifies only if its own `level` is at least the required minimum. The selector lists Pact Magic separately from ordinary slots, and selecting it reduces `system.spells.pact.value` by one.
- [ ] **Higher-level choice:** with `count = spellslot 2`, verify a level 3, 4, or higher ordinary slot can be selected and is consumed from its own level, not from a lower-level pool.
- [ ] **Cancel after accepting:** accept the first optional-reaction prompt, then cancel the spell-slot selector or close it. Confirm no slot is spent, the optional bonus does not apply, the option's other resources/counts are not consumed, and no Item Macro Activity is started.
- [ ] **Combined count and slot:** set `count = reaction` and `countAlt = spellslot 2`. Accept and choose a qualifying slot; verify the slot is spent and the character reaction is marked used. Then verify a second offer is blocked by the used reaction.
- [ ] **Combined item uses and slot:** set `count = ItemUses.<Item Name>` and `countAlt = spellslot 1`. Accept once and choose a slot. Confirm both the item use and selected slot are spent exactly once.
- [ ] **No eligible slot:** set `count = spellslot 5` when the Actor has no slot/Pact Magic pool at level 5 or higher. No optional prompt should appear.
- [ ] **Final available slot:** with one qualifying slot remaining, accept and spend it. The accepted reaction must still apply; the post-prompt eligibility check must not reject it just because the slot was correctly reduced to zero.
- [ ] **Two spell-slot requirements:** set `count = spellslot 2` and `countAlt = spellslot 4`. The selector should list only level 4+ slots and require just one selected slot; it should not prompt twice.

## v0.10.5 Item Macro hook regression cases

- [ ] Configure `ItemMacro, preItemRoll` on a spell attack. Confirm the reaction prompt triggers before attack/damage rolling. Continue proceeds; Cancel aborts before item rolling.
- [ ] If `preItemRoll` does not prompt, capture the `preItemRoll hook fired, but no usable live Workflow` or `Dispatching preItemRoll interception` debug entry and subsequent External Reaction log lines.
- [ ] Configure `ItemMacro, preDamageRoll` and choose Cancel. Verify the prompt runs from the real `midi-qol.preDamageRoll` hook and no Dice So Nice damage animation or damage roll occurs.
- [ ] Retest `preCheckHits` and `preSave` with Continue / Cancel / Activity because v0.10.5 moves them to their dedicated-hook path.
- [ ] Verify `postSave` Cancel still stops subsequent damage and `postDamageRoll` Cancel still prevents damage application.

## v0.10.5 Item Macro hook regression cases

- [ ] Configure `ItemMacro, preItemRoll` on a spell attack. Confirm the reaction prompt triggers before attack/damage rolling. Continue proceeds; Cancel aborts before item rolling.
- [ ] If `preItemRoll` does not prompt, capture the `preItemRoll hook fired, but no usable live Workflow` or `Dispatching preItemRoll interception` debug entry and subsequent External Reaction log lines.
- [ ] Configure `ItemMacro, preDamageRoll` and choose Cancel. Verify the prompt runs from the real `midi-qol.preDamageRoll` hook and no Dice So Nice damage animation or damage roll occurs.
- [ ] Retest `preCheckHits` and `preSave` with Continue / Cancel / Activity because v0.10.5 moves them to their dedicated-hook path.
- [ ] Verify `postSave` Cancel still stops subsequent damage and `postDamageRoll` Cancel still prevents damage application.

## v0.10.4 preItemRoll and postSave regression cases

- [ ] Configure `ItemMacro, preItemRoll`, cast a spell with the eligible reactor on the scene, and verify the reaction prompt appears before attack/save/damage rolling and before normal resource consumption.
- [ ] At `preItemRoll`, choose Continue and verify the original workflow proceeds; choose Cancel and verify the original item use is aborted before its roll.
- [ ] Configure `ItemMacro, postSave` on a save-and-damage spell. Choose Cancel after the saving throw result is determined; the save result may remain, but no subsequent damage should be rolled or applied.
- [ ] Configure `ItemMacro, preDamageRoll`. Choose Cancel and record whether a damage roll card/configurator is created. The intended result is that Midi-QoL's pre-damage hook blocks the roll itself and no damage is applied. If any roll is still created, preserve the console log from the reaction prompt through the end of the workflow for diagnosis.
- [ ] For an External Reaction-owned Item Macro, verify the command is stored on the source Item but `ItemMacro` is **not** assigned to any Midi-QoL On Use Macro stage on that Item. The reaction macro should run only through External Reaction; no duplicate/recursive call should occur.

## v0.10.3 workflow interception regression cases

- [ ] Configure `ItemMacro, preAttackRoll`, choose Cancel, and verify no Foundry/D&D 5e attack configurator opens and no attack roll/chat roll is produced.
- [ ] Configure `ItemMacro, preAttackRoll`, choose Continue, and verify the original attack proceeds against its original target.
- [ ] Choose Activity where the Activity belongs to the same Item that stores the Item Macro. Verify its native `postActiveEffects` ItemMacro does not re-open the reaction test dialog.
- [ ] After the triggered Activity finishes, verify the original user's targets are restored and the original attack still targets its original target.
- [ ] Repeat the Activity case with an Activity on a different Item; verify its own ItemMacro is not suppressed accidentally.

> Static checks do not replace the Foundry runtime tests above. In particular, cancellation and the same-Item Activity path require an in-world check on the target Midi-QoL version.
