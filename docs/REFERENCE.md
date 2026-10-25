# External Reaction — Technical Reference

External Reaction lets an eligible creature represented by a token on the active scene react to another creature's attack, saving throw, or ability check. It extends Midi-QoL-style optional roll values to third-party reactions and uses Midi-QoL's own condition evaluator for activation expressions.

## Core reaction functionality

Core reaction functionality includes:

- Scene-wide reactors with role-aware identity handling: the same Actor may own save/check/skill reactions when appropriate, while outgoing attack/damage/AC actions do not prompt that same initiating Actor. Activation comparisons such as `actor != self` and `target != self` are evaluated against Actor UUIDs.
- Attack values: `attack.all` and `attack.{attackType}` before hit adjudication; miss-only `attack.fail.*`; hit-only `attack.success.*` for `mwak`, `rwak`, `msak`, and `rsak`.
- Saving throw values: `save.all`, `save.{ability}`, `save.fail.*`, and `save.success.*`.
- Ability-check values: `check.all`, `check.{ability}`, `check.fail.*`, and `check.success.*` when a numeric DC is available.
- Skill values: `skill.all`, `skill.{skill}`, `skill.fail.all`, `skill.fail.{skill}`, and External Reaction's `skill.success.all` / `skill.success.{skill}` when a numeric DC is available.
- Damage bonuses: `damage.{actionType}` or `damage.all` following Midi-QoL-style priority, plus typed damage selectors `damage.{damageType}.all` and `damage.{damageType}.{attackType}` to add a separate typed damage roll.
- AC bonuses: `ac` on the attacked/receiving actor, applied before Midi-QoL adjudicates attack hits; it does not automatically spend a reaction unless `count` / `countAlt` explicitly requests `reaction`.
- Optional roll controls: `criticalDamage`, `displayBonusRolls`, and `rollMode` are honored for the relevant bonus workflow.
- Roll values: numeric/dice formulas, `reroll`, `reroll-query`, `reroll-kh`, `reroll-kl`, `reroll-max`, `reroll-min`, `reroll-withBonus {expr}`, `replace {formula}`, `success`, `fail`, `critical`, `ItemMacro`, `ItemMacro.{name}`, `ItemMacro.{itemUuid}`, `Macro.{name}`, and `function.{name}`. `ActivityMacro` remains intentionally unsupported.
- **Triggered Activities:** add `activity.trigger` to an existing optional reaction to automatically use a D&D 5e Activity after the player accepts that reaction. Area activities follow the normal Activity use flow; direct-target activities get an Activity-aware target picker.
- **Foundry V14 targeting:** triggered Activities now set selected tokens with `Token#setTarget()` rather than the removed `game.user.updateTokenTargets()` method. Existing targets are released once, then all picker-selected tokens are added before the Activity is used.
- **Triggered Activity batching:** accepting an option queues its Activity until the current attack/save/check/skill/damage/AC reaction batch has finished. The queue deduplicates the same reactor + option key + Activity, preventing repeated target selectors for each accepted count across an AOE.
- Count availability/consumption: numeric counts, `each-turn`, `each-round`, `turn`, `reaction`, `bonusAction`, `every`, ItemUses, ActivityUses, `@system.path`, and the new `spellslot X` format for an interactively selected spell slot of level X or higher, including Pact Magic.
- **Count concurrency protection:** each optional reaction re-checks the current granting Active Effect and resource state immediately before prompting/applying; per-reactor processing is serialized so multi-target saves cannot reuse the same reaction or item use across parallel target results.
- **Actor identity handling:** self-owned save/check/skill/ac options are no longer excluded before activation evaluation. `actor == self` / `target == self` and their inverse conditions determine eligibility; the same Actor is still blocked from reacting to its own outgoing attack or damage workflow.

### Skill bonuses

Use the same Active Effect flag namespace and syntax as ability checks, with the skill identifier as the final path segment:

- `flags.external-reaction.optional.NAME.skill.all`
- `flags.external-reaction.optional.NAME.skill.{skill}`
- `flags.external-reaction.optional.NAME.skill.fail.all`
- `flags.external-reaction.optional.NAME.skill.fail.{skill}`
- `flags.external-reaction.optional.NAME.skill.success.all`
- `flags.external-reaction.optional.NAME.skill.success.{skill}`

The supported D&D 5e skill IDs are `acr`, `ani`, `arc`, `ath`, `dec`, `his`, `ins`, `inv`, `itm`, `med`, `nat`, `prc`, `per`, `prf`, `rel`, `slt`, `ste`, and `sur`. Fail/success-specific bonuses require a numeric DC to be available to the wrapper. Ordinary D&D 5e skill rolls often have no DC attached; in that case the normal `skill.*` modifier still works but fail/success phases cannot be inferred automatically.

### Damage bonuses

For normal Midi-QoL-style action-specific damage modifiers use `flags.external-reaction.optional.NAME.damage.{attackType}` or `...damage.all`. Attack-type IDs are `mwak`, `rwak`, `msak`, `rsak`, `heal`, `other`, `save`, and `util`. The action-specific path wins when present; otherwise `damage.all` is used.

External Reaction does not offer a third-party `damage.*` bonus for an attack workflow with an empty hit-target set (a missed attack). This guard applies only to attack workflows; saving-throw-based and other non-attack damage workflows remain eligible.

External Reaction supports damage-type paths in the form `flags.external-reaction.optional.NAME.damage.{damageType}.all` and `...damage.{damageType}.{attackType}`. The value is rolled as a separate `DamageRoll` with the selected damage type rather than being added as untyped damage. For example, `damage.fire.all = 1d6` adds Fire damage for any supported damage action, while `damage.fire.mwak = 1d6` adds Fire damage only for a melee weapon attack. Supported nested action-type suffixes are `mwak`, `rwak`, `msak`, `rsak`, `other`, `save`, and `util`; `heal` is intentionally not supported as a suffix under a damage type. Common damage IDs are Acid (`acid`), Bludgeoning (`bludgeoning`), Cold (`cold`), Fire (`fire`), Force (`force`), Lightning (`lightning`), Necrotic (`necrotic`), Piercing (`piercing`), Poison (`poison`), Psychic (`psychic`), Radiant (`radiant`), Slashing (`slashing`), and Thunder (`thunder`). The module also recognizes configured non-standard types such as Vitality and Maximum Hit Points (`maximum`, with `mhp` accepted as an alias) where supported by D&D 5e or another module. Use `damage.none.all` or `damage.none.{attackType}` for untyped damage (No type). “No damage” (`midi-none`) is excluded because it does not represent a damage roll.

Damage-type IDs are resolved from the installed system's `CONFIG.DND5E.damageTypes` and `healingTypes`, with common fallbacks.

One optional `NAME` group selects one damage path per damage-roll pass. Priority is: a typed action-specific path such as `damage.fire.mwak`; the general action-specific path such as `damage.mwak`; a typed `.all` path such as `damage.fire.all`; the general `damage.all` path. If multiple damage-type subgroups match, the first matching type in the actor flag data is selected. Use separate `NAME` groups if you want multiple bonus options to be independently offered from the same damage pass. Typed damage selectors are intended for damage formulas (`1d6`, `+1d4`, `replace 2d6`, or a macro returning a roll/formula); roll-control values that need an existing roll to reroll are not meaningful as standalone typed damage additions.

### AC bonus

`flags.external-reaction.optional.NAME.ac` is owned by the actor being attacked (the AC receiver), not by the attack initiator. It prompts that actor's player (or the GM fallback), modifies the workflow's target AC before Midi-QoL evaluates hits, and is therefore able to turn a hit into a miss. The target's AC bonus does not automatically consume their character reaction. Use `count = reaction` only if you explicitly want a reaction to be the resource being tracked. Numeric/dice formulas, `replace`, and macro values use the shared external roll-modification path; roll outcomes such as `success` / `fail` have no useful AC meaning.

### Optional bonus display and roll mode

- `flags.external-reaction.optional.NAME.criticalDamage`: when `true`, the bonus `DamageRoll` is built with `configured = false`, matching Midi-QoL's critical-damage handling. It is used only for damage bonus rolls, not checks or saves.
- `flags.external-reaction.optional.NAME.displayBonusRolls`: an explicit boolean override for showing the before/after bonus roll card. When absent, External Reaction reads Midi-QoL's persisted `midi-qol.ConfigSettings.optionalRules.displayBonusRolls` value first, then the Midi API settings snapshot. It also respects Midi's `toggleOptionalRules` behavior; if the value is genuinely absent from both sources, it falls back to Midi's initialized default (`true`).
- `flags.external-reaction.optional.NAME.rollMode`: supports `publicroll`, `gmroll`, `blindroll`, and `selfroll`; absent values follow Midi-QoL’s `core.messageMode` behavior and fall back to the core roll-mode setting where applicable. This applies to External Reaction bonus display messages and to the modified roll/message where the workflow can still honor the option. As with native reactions, an already-seen message cannot be retroactively unseen from a player's memory; use blind mode before posting when secrecy is essential.

`ActivityMacro` remains intentionally unsupported. `ItemMacro`, `Macro`, and `function` continue through Midi-QoL's workflow macro system. `function.{name}` must identify a function actually registered with Midi-QoL; it is not a list of arbitrary globals.

### Activation conditions

Add an Active Effect change with the Override mode:

`flags.external-reaction.optional.NAME.activation`

The value is a Midi-QoL activation-condition expression. Empty or missing activation conditions allow the option, preserving previous behavior. Conditions are evaluated separately for the current reaction context before the prompt is displayed.

**Special ItemMacro trigger:** when an option uses `activity.trigger = ItemMacro...` and its activation value is exactly `damage` (case-insensitive), External Reaction treats it as a damage-event selector rather than a general expression. It dispatches from Midi-QoL's per-target post-application `midi-qol.damageApplied` hook and offers the reaction only to the actor whose damage application reports positive HP damage. This overrides that option's configured ItemMacro pass. Missed attacks, unused damage formulas, and targets that take zero damage must not trigger it. For damage-bonus options that do not use ItemMacro, `damage` remains the workflow event boolean in an activation expression.

Supported operators and syntax follow Midi-QoL's evaluator: `!`, `&&`, `||`, `===`, `==`, comparisons (`<`, `<=`, `>`, `>=`), parentheses, optional chaining, array/object operations, and JavaScript expression methods that work inside Midi's sandbox. `@` formula references are also handled by Midi's evaluator.

Activation-condition context:

- `self` is the reactor: the actor that owns the External Reaction flag.
- `actor` is the triggering action's initiator: the attacker for attack workflows, or the actor/item user (such as the caster) for a save workflow. For a direct check/skill roll, this is usually the checker too.
- `target` is the action recipient: the defended creature for attack/AC reactions, the creature rolling a save/check/skill, or the affected creature for damage bonuses. For damage, the current workflow's first available affected target is used.
- Root roll data (`abilities`, `attributes`, `traits`, and similar system data) remains reactor-oriented for compatibility. `source` and `reactor` refer to the reactor's actor data/document; `reactorToken` is its scene token. `item`, `activity`, `workflow` / `w` refer to the triggering action when available.
- `actor.disposition` and `target.disposition` expose normalized names (`friendly`, `hostile`, `neutral`, `secret`) and support `.in(...)`. Loose equality/inequality also works: `actor.disposition == "hostile"`, `target.disposition != "friendly"`. Missing disposition data defaults to `friendly`. For example, `target.disposition.in('hostile', 'secret') && actor.disposition.in('friendly', 'neutral')` checks the target and initiator independently.
- For convenience, a leading negation on a disposition equality is normalized as a negated comparison: `!actor.disposition == "hostile"` is treated as `actor.disposition != "hostile"`, and `!target.disposition != "friendly"` as `target.disposition == "friendly"`. This is a custom convenience syntax; in standard JavaScript, `!` would bind before `==`. You can always use the conventional `!=` or `!(actor.disposition == "hostile")` forms. Direct `==`/`!=` comparisons use JavaScript coercion; strict `===`/`!==` comparisons are normalized to compare the wrapper’s underlying `.value` string.
- `friendly` and `enemy` are booleans comparing the reactor with the action target. Neutral and Secret are treated as friendly; missing disposition defaults to Friendly. Use `actorFriendly` / `actorEnemy` when you need to compare the reactor's disposition to the initiating actor instead.
- `CanSee` reports whether the reactor can see the action target, using Midi-QoL's `canSee` with `forceVision: true`. If either token is unavailable or visibility cannot be determined, `CanSee` is false.
- `range` is the numeric distance between the reactor token and the action `target` token (legacy behavior), calculated with Midi-QoL's `getDistance` helper. It follows Midi-QoL's measurement mode and scene distance units. It does not apply wall blocking; combine it with `CanSee` when line of sight matters.
- `actor.range` is the distance between the reactor token and the initiating `actor` token (for example, the attacker or caster). Use it when the reaction's range should be measured to whoever started the workflow.
- `target.range` is the distance between the reactor token and the action `target` token. This is equivalent to the legacy bare `range` value, but is explicit and can be combined with `actor.range` in the same condition.
- Each range is measured independently. If a condition references a range whose required token is unavailable or whose distance cannot be measured, the activation condition is rejected rather than allowing JavaScript to compare an unavailable value as zero. All ranges use Midi-QoL's configured measurement behavior and do not independently account for walls; combine with `CanSee` when line of sight matters.
- Midi-QoL's built-in activation-condition helpers are available, including helpers such as `canSee(token, target)`, `canSense`, `findNearby`, `findNearbyCount`, `checkNearby`, `hasCondition`, `checkDefeated`, `checkIncapacitated`, `getDistance`, `computeDistance`, `checkDistance`, `checkActivityRange`, `fromUuidSync`, and `sizeNumeric`, plus helpers supplied by the installed Midi-QoL build.
- Module flags and roll data accessible to the evaluator can be referenced. Arbitrary global functions from another module are not automatically imported: they must be exposed to Midi-QoL's activation evaluator or available through the supplied data, just as with Midi-QoL conditions generally.
- Workflow event booleans can be used as bare identifiers: `cast`, `attack`, `mwak`, `rwak`, `msak`, `rsak`, `save`, `check`, `skill`, `damage`, `heal`, `concentration`, `deathSave`, `initiative`, `tool`, `utility`, and `itemUse`. They are Boolean flags, not functions. They are true only when the current workflow context identifies that event/type. The initial `itemMacro` interceptor runs at `midi-qol.preItemRoll`; it detects item/activity use. In this build, `concentration`, `deathSave`, and `initiative` are reserved flags and do not independently trigger on those events; dedicated hooks for concentration, death saves, initiative, or movement have not been implemented.
- For item/activity workflows, `cast` can be true at the same time as `attack`, `save`, `check`, or `skill`; for example, a spell with a saving-throw activity is still a cast. The action-type flags `mwak`, `rwak`, `msak`, and `rsak` match the workflow/activity action type.

Examples (set as the value of `flags.external-reaction.optional.NAME.activation`):

| Expression | Meaning |
|---|---|
| `true` | Always allow this optional flag |
| `false` | Never offer this optional flag |
| `friendly` | Reactor and action `target` have a friendly disposition relationship |
| `enemy` | Reactor and action `target` are enemies |
| `friendly && CanSee` | Target is friendly and reactor can see the target |
| `enemy \|\| !CanSee` | Target is an enemy, or the reactor cannot see the target |
| `range <= 40` | Reactor and action target are 40 scene units or closer |
| `range == 40` | Distance to the action target is exactly 40 scene units |
| `friendly && range <= 40 && CanSee` | Target is friendly, within range, and visible |
| `range > 5 && range <= 60` | Distance to the action target is greater than 5 and at most 60 scene units |
| `actor.range <= 30` | Reactor is within 30 scene units of the initiating actor (such as the attacker or caster) |
| `target.range <= 30` | Reactor is within 30 scene units of the action target; explicit equivalent of `range <= 30` |
| `actor.range <= 30 && target.range <= 10` | Initiating actor is within 30 units and the action target is within 10 units of the reactor |
| `actor.range < target.range` | Initiating actor is closer to the reactor than the action target is |
| `actor.range <= 60 && target.range <= 30 && CanSee` | Both actors are within their respective limits and the reactor can see the action target |
| `target.disposition.in('hostile', 'secret')` | Target has a Hostile or Secret disposition |
| `actor.disposition.in('friendly', 'neutral')` | The initiating actor has Friendly or Neutral disposition |
| `actor.disposition == "hostile"` | The initiating actor is Hostile (loose equality) |
| `actor == self` | The initiating actor is the same Actor as the reactor |
| `target == self` | The action target is the same Actor as the reactor |
| `actor != self` | The initiating Actor differs from the reactor |
| `target != self` | The target Actor differs from the reactor |
| `!actor == self` | External Reaction shorthand for `actor != self` |
| `!target == self` | External Reaction shorthand for `target != self` |
| `actor != self && target == self` | The reactor is not the initiator but is the action target |
| `!(actor == self)` | Conventional JavaScript negation; equivalent to `actor != self` |
| `target.disposition != "friendly"` | The target isn't Friendly |
| `!actor.disposition == "hostile"` | Convenience shorthand for `actor.disposition != "hostile"` |
| `target.disposition.in('hostile', 'secret') && actor.disposition.in('friendly', 'neutral')` | Target is Hostile/Secret, and initiator is Friendly/Neutral |
| `!target.disposition.in('hostile')` | Negated target-disposition test |
| `!target.statuses.has('incapacitated')` | The action target is not incapacitated |
| `target.attributes.hp.value < target.attributes.hp.max / 2` | The action target is below half HP |
| `flags["some-module"].someFlag === true` | Check a module flag present in the reactor's actor flags |

### Actor identity comparisons

External Reaction supports direct comparisons between the activation-context actor references: `actor == self`, `target == self`, and their inverse forms. Because these names refer to separate roll-data wrappers rather than the original Actor documents, the module normalizes comparisons to Actor UUIDs before Midi-QoL evaluates them. Because identity is Actor-UUID based, a second token linked to the same Actor document is still treated as the same Actor for `actor == self` / `target == self` checks; an initiating Actor is not allowed to react to its own outgoing attack, damage, or AC workflow. For `target`, it compares `target.actorUuid` (the Actor UUID), not `target.uuid` (which identifies the token in this context).

- `actor == self` — the initiator is the reactor's same Actor.
- `target == self` — the action target is the reactor's same Actor.
- `actor != self` / `target != self` — the corresponding Actors differ.
- `!actor == self` / `!target == self` — External Reaction convenience shorthand for identity inequality, just like the earlier negated-disposition shorthand. Standard forms `actor != self` and `!(actor == self)` are clearer and recommended.

These comparisons identify the Actor document, not a specific token. Two tokens linked to the same Actor therefore compare as the same Actor.

Midi-QoL's optional dialog uses `errorReturn: true` for activation-expression evaluation. External Reaction follows that behavior: if an expression errors, Midi logs the issue and its evaluator's permissive fallback can allow the option.

## Actor item possession conditions

External Reaction adds two explicit helper expressions for checking whether an actor owns a particular Item document:

- `self.item.has("Item Name")` checks the **reactor** (the actor whose External Reaction flag is being evaluated).
- `target.item.has("Item Name")` checks the **action target**: the attacked/defended creature for attack and AC reactions, the creature rolling the save/check/skill, or the affected creature for damage.
- `actor.item.has("Item Name")` checks the **initiating actor**: the attacker or the actor using the item/activity that starts the workflow.

These search the actor's complete embedded `Actor.items` collection, regardless of item type. That includes owned spells, feats/features, inventory/equipment, class items, and other embedded Item documents—not only items displayed as carried inventory. The default name lookup is an exact, case-insensitive match. Either helper also accepts an exact Item UUID or ID. For substring matching, pass `"partial"` as the second argument, for example `self.item.has("Protection", "partial")`.

Examples (use these expressions as the value of `flags.external-reaction.optional.NAME.activation`):

| Expression | Meaning |
|---|---|
| `self.item.has("Shield")` | Reactor owns an item named Shield |
| `actor.item.has("Counterspell")` | The initiating actor owns Counterspell |
| `target.item.has("Shield")` | The action target owns Shield |
| `self.item.has("War Caster") && CanSee` | Reactor owns War Caster and can see the action target |
| `target.item.has("Magic Missile", "partial")` | The action target owns an item whose name contains Magic Missile |
| `self.item.has("Compendium.pack.Item.abc123")` | Reactor owns an item with this exact UUID (if it matches an embedded owned item's UUID) |

The helpers return `false` when no owned item matches. If the expression references `target.*` but the action target cannot be resolved, the activation condition is rejected rather than treating the lookup as true. Only Item documents actually owned by the actor are searched; an item merely present in a compendium but not owned by the actor does not count.

## Range condition details

Use JavaScript comparison operators such as `==`, `===`, `<`, `<=`, `>`, and `>=`. The less-than-or-equal operator is `<=` (not `<==`). Prefer `range <= 40` for practical range checks: exact equality (`range == 40`) only matches a distance equal to the current distance measurement result. Distance is reported in the scene's distance units and follows Midi-QoL's Distance Measurement setting, including its configured center/perimeter/default behavior and gridless fudge factor. `range` measures distance independently of walls and sight; combine it with `CanSee` when both conditions matter.

### Triggered Activities

Add this Active Effect change to the same `flags.external-reaction.optional.NAME.*` group as the reaction's attack/save/check/skill/damage/AC/activity.trigger option:

| Active Effect change key | Example value |
|---|---|
| `flags.external-reaction.optional.NAME.activity.trigger` | `Actor.abc123.Item.def456.Activity.ghi789` |

The normal Activity trigger runs **after the reactor accepts** the optional-reaction prompt. It runs on the reactor's owning user's client (or the GM fallback), then the original optional bonus/reaction continues through its existing processing. If the player cancels the triggered Activity's target selector, the triggered Activity is skipped but the already-accepted optional bonus still resolves.

#### Item Macro workflow interception

**Do not assign the source Item's Item Macro to any Midi-QoL On Use Macro stage when External Reaction owns its invocation.** Keep the command stored on the Item using DAE/DIME Item Macro storage (or supported legacy storage), but leave `ItemMacro` out of that Item's Midi-QoL On Use Macro configuration. External Reaction calls the command itself at the configured pass. Registering it with Midi-QoL as well can cause duplicate or recursive execution when the macro launches an Activity from that Item.

Set `flags.external-reaction.optional.NAME.activity.trigger = itemMacro` to run an Item Macro at the `postActiveEffects` stage by default, as External Reaction’s configured default for a bare trigger. A bare `ItemMacro` with no pass extension therefore runs at `postActiveEffects`. The optional group must be granted by an Active Effect, just like other External Reaction options. The Item Macro is resolved from the Item that originated the granting Active Effect. If the effect origin cannot be resolved, External Reaction searches the reactor Actor’s embedded Items for the Item containing the matching External Reaction Active Effect. Macro data is read from the serialized DAE/DIME `flags.dae.macro` first, then legacy Item Macro `flags.itemacro.macro`. The name/identifier/ID match against `NAME` remains a final fallback. Optional `getFlag` fallbacks are guarded because Foundry V14 may throw when a legacy flag scope is not registered or active.

Choose a different stage in either of these equivalent ways:

| Configuration | Example |
|---|---|
| Midi-style trigger value | `flags.external-reaction.optional.NAME.activity.trigger = "ItemMacro, postAttackRoll"` |
| Separate field | `activity.trigger = itemMacro` and `activity.macroPass = postAttackRoll` |

The trigger name is case-insensitive. The pass name is matched case-insensitively and normalized to Midi-QoL's canonical pass name. The default is `postActiveEffects`. An explicit `activity.macroPass` or `activity.pass` overrides the pass suffix in `activity.trigger`. Supported passes include `preItemRoll`, `preAttackRoll`, `preCheckHits`, `postAttackRoll`, `preDamageRoll`, `postDamageRoll`, `preSave`, `postSave`, `preActiveEffects`, `postActiveEffects`, plus later workflow-state passes such as `preWaitForAttackRoll`, `postAttackRollComplete`, and `preCleanup`. The dispatcher is installed at `preItemRoll`, so earlier passes cannot be guaranteed. The `preCheckHits`, `preDamageRoll`, and `preSave` options are dispatched through Midi-QoL's awaited hooks so an abort is handled before their respective next operations. `preSave` relies on Midi-QoL reaching `midi-qol.preCheckSaves` (normally when automatic save checking is enabled). The special `all` pass is intentionally not accepted because it would make a reaction eligible at many unrelated points in the same workflow.

External Reaction awaits the configured Item Macro result at the selected pass. For the standard workflow-state passes, this wraps Midi-QoL's awaited `callMacros` dispatch; selected early stages use direct Midi-QoL hooks where the internal state method otherwise continues processing after its native macro pass. A cancellation aborts the remaining workflow where Midi-QoL supports that behavior. At `preActiveEffects`, External Reaction uses Midi-QoL's dedicated `{ haltEffectsApplication: true }` result contract; damage and earlier processing may already have happened. Not every documented Midi macro pass is enabled: `preAttackRollConfig`, `preDamageRollConfig`, `preDamageApplication`, and `damageBonus` are intentionally excluded because they are not reliable, general workflow-cancellation points in the targeted Midi-QoL source.

For a reaction that must expend both the character's Reaction and a minimum spell slot, configure `count = reaction` and `countAlt = spellslot 3` (or reverse the two). Using only `count = spellslot 3` spends the slot but does not itself mark the character's Reaction as used.

Activation conditions are checked immediately before the prompt at the configured stage. In the context, `actor` is the initiating actor (for Counterspell, the caster), `actor.range` is the reactor-to-initiator distance, `CanSee`/bare `canSee` describes the reactor seeing the initiating token, and flags such as `cast`/`attack` describe the initiating workflow.

The Item Macro executes on the **selected reactor recipient's client**. For a player-owned reactor this is the active player who owns the Actor; for a GM-owned reactor or the module's GM fallback it is the GM client. The initiating workflow waits for the remote result, so any rolls and dialogs created by the macro (for example, `actor.rollAbilityCheck(...)`) are initiated on the reactor's client rather than on the initiating caster's client.

The macro is executed in a nested async function scope. Its local `const` / `let` declarations may use names such as `data`, `externalReaction`, `actor`, `item`, and `workflow` without colliding with External Reaction's compatibility bindings.

The macro receives the original context through `args[0]` and these additional values:

- `externalReaction.trigger`: `type`, `eventFlags`, `phase` (the selected pass), `macroPass`, `workflowId`, `actorUuid`, `itemUuid`, `activityUuid`, `spellLevel`, `reactorUuid`, and `flagKey`.
- `externalReaction.resource`: the first resource receipt, or `null`.
- `externalReaction.resources`: an array of resource receipts.
- Top-level aliases `resource`, `resources`, `reactor`, and `reactorToken` are also provided. The macro's `actor` / `reactor` is the reactor; `target` is the initiating token; `targetActor` is the initiating actor.
- `workflow` is a **serializable snapshot** of selected initiating Workflow fields with supported Document references re-resolved on the reactor's client. It is not a live Midi-QoL Workflow instance: its methods cannot cross clients, and assigning to it does not mutate the original in-memory workflow. Use the returned-value contract to communicate the outcome to External Reaction.

Remote execution uses a one-time authorization created when the reactor accepts the prompt. The socket handler checks the authenticated sender and expected recipient, revalidates the flag, and consumes the authorization before executing the user-authored macro to reject replayed requests.

Supported Item Macro return values:

| Return value | Meaning |
|---|---|
| `true`, `"cancel"`, or `{ action: "cancel" }` | Abort the remaining original Midi-QoL workflow. At `preItemRoll`, this prevents the original item use from proceeding; at later stages, earlier work remains. |
| `0`, `false`, `null`, `undefined`, or `"continue"` | Continue the original workflow unchanged. |
| An Activity UUID/reference string or Activity document | Use that Activity on the reactor's client, then continue the original workflow. |
| `"Item.Test Item.Activity.Test Activity"` | Resolve the named embedded Item / Activity pair. |
| `"Item.Test Item.Activity.Test Activity actor"` | Skip the custom target picker and target the original initiating actor. Suffixes `target` and `self` target the original workflow target and reactor. |
| `{ action: "activity", activity: "...", target: "actor" }` | Structured alternative; `target` or `targetMode` accepts `actor`, `target`, or `self`. |
| `{ action: "activity", activityUuid: "...", cancelOriginal: true }` | Use the Activity, then abort the remaining original workflow. Omit `cancelOriginal` to continue it. |

For example, a macro configured with `ItemMacro, postAttackRoll` can inspect `workflow.attackRoll`, `workflow.hitTargets`, and `workflow.hitTargetsEC`, perform any custom check, and return `"cancel"` to stop later workflow processing while keeping the attack roll and hit result visible. In Midi-QoL's current workflow sequence, the attack roll has been processed and hit/miss evaluation has been performed, but damage has not yet been rolled. `preCheckHits` is earlier: the attack roll exists, but hit adjudication has not completed. `postDamageRoll` runs after the damage roll exists; `preActiveEffects` can prevent later Active Effect application, and `postActiveEffects` is after Active Effects have already been applied.

**Important: aborting is not rollback.** A later-stage cancellation never automatically erases earlier rolls or restores consumed resources/HP, and `postActiveEffects` cannot undo effects that have already been applied. Use the earliest pass that provides the information your macro needs. The exact stage behavior must be verified against the installed Midi-QoL version and each Activity type. `preItemRoll` runs before the initiating item's normal resource consumption; therefore, a rules-accurate 2014 Counterspell setup still needs a separately tested way to preserve the interrupted caster's spell-slot consumption. If the Item Macro launches a normal spell Activity that consumes a spell slot, verify that the same cast isn't charged twice and choose one owner for that payment.

A spell-slot receipt has `type: "spellSlot"`, `pool` (`spell` or `pact`), `slotKey`, `level`, `amount`, `consumed`, `before`, `after`, and `resourcePath`. An ItemUses/ActivityUses receipt has `type: "itemUsage"`, `actorUuid`, `itemUuid`, optional `activityUuid`, `amount`, `consumed`, availability `before`/`after`, spent `beforeSpent`/`afterSpent`, and the resource path/count expression.

Activity reference formats supported:

| Format | Meaning |
|---|---|
| `Actor.<actorId>.Item.<itemId>.Activity.<activityId>` | Full Activity UUID (recommended; copy the Activity UUID from Foundry) |
| `Activity.<activity UUID>` | Optional `Activity.` prefix before a full Activity UUID |
| `Item.<item name>.Activity.<activity name>` | Human-readable Item / Activity pair; supports spaces and dots in names |
| `Item.<item name>.<activity name>` | Compact Item / Activity path; the module checks possible splits so names with dots can resolve |
| `<item name>::<activity name>` | Explicit item/activity pair; recommended if either name contains dots |
| `<item UUID>::<activity name>` | Resolve the Item UUID and Activity name/ID |
| `<unique activity name>` | Resolve a name/identifier/ID only when it uniquely matches an Activity on the reactor's Actor |

Name and identifier matching is case-insensitive. A unique partial match is supported within a resolved Item or across the reactor Actor for a bare Activity name; ambiguous matches are rejected.

The Activity must belong to an embedded Item on the reactor's Actor. Activities on compendiums or other Actors cannot be used as this reactor's action, and unresolved/ambiguous references are reported in the console and to the user.

### Target selection behavior

- **Area activity:** if the Activity has an area template shape configured, External Reaction calls `activity.use()` directly. Foundry/D&D 5e/Midi-QoL retain responsibility for the normal activation dialog, template placement, scaling, resource consumption, targeting, and subsequent actions.
- **Self:** the reactor's own scene token is automatically selected.
- **Other direct-target activities:** a checkbox selector lists eligible tokens in the active Scene. The user must choose at least one token, and cannot select more than the Activity's configured target count. The count supports ordinary numeric values and roll-data formulas; an empty/unresolvable count is treated as no explicit maximum.
- **Range:** candidates are filtered using the Activity's configured range and Midi-QoL's `getDistance` measurement, with common feet/miles/meters/yards scene-unit conversion. `self` range restricts targets to the reactor token. Unrecognized/special range units do not impose an automatic distance limit.
- **Target type:** `enemy` only lists Hostile-disposition tokens; `ally` only lists Friendly-disposition tokens; `self` uses the reactor token; other target types list all otherwise eligible tokens with an Actor.
- **Midi Targeting — Targets you can see:** when the Activity has this setting enabled and Midi-QoL's global `Targets you can see` mechanic is set to `enforce`, unseen tokens are excluded from the selector. Midi-QoL keeps its own normal checks when the Activity starts.
- After selection, the module replaces the user's current target set with the chosen tokens and starts the Activity through its standard `use()` API, as if it had been clicked in the UI. The chosen tokens remain targeted after usage.

Example: a character has an optional `ac` or `attack.all` reaction and `activity.trigger` set to the UUID of an embedded *Shield* Activity. When the player accepts the reaction, the module invokes that Activity. For a direct-target Activity, the player selects one or more valid tokens; for an area Activity, normal area/template targeting begins.

## Spell-slot costs in Count / CountAlt

Use `spellslot X` as the value of either `flags.external-reaction.optional.NAME.count` or `flags.external-reaction.optional.NAME.countAlt`, where `X` is a minimum spell-slot level from 1 to 9. This requires the reactor to have at least one remaining ordinary spell slot or Pact Magic slot at that level or higher before the optional reaction is offered.

After the player accepts the optional reaction, a second selector lists only currently available slot pools at or above the minimum. Ordinary slots and Pact Magic are listed separately because they are separate resources, even when they are the same level. Confirming the selector spends one use from the selected pool, then the optional reaction is applied. Cancelling the selector cancels the optional reaction entirely: no slot is spent, the optional roll bonus is not applied, and its other count/resource values are not consumed.

Examples:

| Change key | Value | Meaning |
|---|---|---|
| `count` | `spellslot 2` | The reactor must have an available level 2+ slot; acceptance asks which qualifying slot to spend. |
| `countAlt` | `spellslot 1` | Requires and spends a selected level 1+ slot in addition to the primary count's requirement. |
| `count` | `reaction` and `countAlt` | `spellslot 3` | Requires both an unused reaction and an available level 3+ slot; accepting spends the selected slot and marks the reaction used. |

If both `count` and `countAlt` use `spellslot X`, the higher minimum determines the selector's available choices. Slot eligibility is re-checked after the picker opens; if the chosen pool has been depleted in the meantime, the reaction is cancelled rather than applied without payment.

## AC bonus selectors

AC bonuses are flags on the **attacked/receiving actor** and are processed during the attack workflow before Midi-QoL adjudicates the final hit. The basic `flags.external-reaction.optional.NAME.ac` selector can trigger on any supported attack, whether the attack would hit or miss. Add `.hit` to trigger only if the attack would hit against its original effective AC, before any External Reaction AC bonuses are applied. Attack-type selectors are also available:

| Flag | When it may trigger |
|---|---|
| `ac` | Any attack type, hit or miss |
| `ac.hit` | Any attack type, only if it would hit normally |
| `ac.mwak` | Melee weapon attacks, hit or miss |
| `ac.rwak` | Ranged weapon attacks, hit or miss |
| `ac.msak` | Melee spell attacks, hit or miss |
| `ac.rsak` | Ranged spell attacks, hit or miss |
| `ac.mwak.hit` | Melee weapon attack that would hit normally |
| `ac.rwak.hit` | Ranged weapon attack that would hit normally |
| `ac.msak.hit` | Melee spell attack that would hit normally |
| `ac.rsak.hit` | Ranged spell attack that would hit normally |

Within one optional `NAME` group, one selector is chosen in this order: `<attackType>.hit`, `<attackType>`, `hit`, then the general `ac`. Thus a type-specific selector takes precedence over the general hit-only selector if both are present. Use separate `NAME` groups for independently offered AC options. The module reads the raw Active Effect change keys for these selectors so `ac` and nested selectors can coexist even though their dotted paths share a prefix.

`ac.*.hit` uses a snapshot of the effective AC before External Reaction changes it; a bonus from an earlier reactor cannot make a later `.hit` selector eligible or ineligible.

## Current limitations

- Attack workflows currently require exactly one target; multi-target attack rolls are skipped. Save processing is handled per target.
- Reactors must have an Actor represented by a Token on the active scene. If no suitable token is available, disposition falls back to Friendly and `CanSee` evaluates to false.
- One matching optional flag per reactor is processed per phase; multiple matching flags on the same Actor are not displayed as a stacked Midi-QoL optional dialog.
- `function.{name}` must refer to a function registered in Midi-QoL's macro system. It is not a way to call arbitrary browser globals.
- The module integrates with Midi-QoL workflow functions and D&D 5e roll methods that are not stable public extension APIs. Future Foundry, D&D 5e, or Midi-QoL updates may require compatibility changes.
- Damage bonuses are processed after Midi-QoL's own damage bonus flags. Each optional flag group selects one matching damage path per damage pass. Use separate optional names for independently selectable bonuses.

## Setup and testing

1. Back up the world before installing or updating the module.
2. Install and enable External Reaction, Midi-QoL, and socketlib. The manifest declares D&D 5e 6.0.6 or later and Foundry VTT 14 as its supported baseline.
3. Add Active Effect changes using `flags.external-reaction.optional.NAME.*` keys. Use Override mode unless a specific flag requires otherwise.
4. For a repeatable test, use `count = every`. Without `count` or `countAlt`, accepting an option consumes the granting effect but does not automatically consume the character's reaction.
5. Use `TESTING.md` as the regression checklist. Test changes in a disposable world before using them in a live campaign.

## Diagnostics and logging

External Reaction follows the world setting **Midi-QoL → Debug** for browser-console output. Errors are never suppressed.

| Midi-QoL Debug setting | External Reaction console output |
|---|---|
| `None` | Errors only (`console.error`, red). |
| `Warnings` | Warnings (`console.warn`, yellow) and errors. |
| `Debug` | Warnings, informational messages, debug messages, and errors. |
| `All` | All of the above, plus verbose trace messages. |


## Item Macro hook-only stages and early preItemRoll context

The generic `Workflow.callMacros` pass name is compared in lowercase. The hook-only stage set must therefore use lowercase keys (`precheckhits`, `predamageroll`, `presave`). Otherwise, cancelling `preDamageRoll` from the generic On Use dispatcher can mark the Workflow aborted before Midi-QoL's actual cancellable pre-damage hook, while the damage-roll state continues into `rollDamage` and can show a Dice So Nice animation even if no damage card is produced.

Midi-QoL may expose `preItemRoll` through legacy or V2 hook argument shapes. External Reaction normalizes both callback shapes, recursively searches nested hook arguments for the Workflow's `callMacro` helper, and supplements the early Workflow with Activity/Token/Item/Actor/target context when available. If no executable Workflow is present yet, the debug log describes the received arguments; no synthetic Workflow is created because macro execution and safe cancellation require Midi's live `callMacro` helper.


## preItemRoll and postSave cancellation notes

Midi-QoL V14 calls the legacy `midi-qol.preItemRoll` hook with positional arguments `(activity, token, config, dialog, message)`; the live Workflow is exposed as `config.workflow`. Its V2 hook passes `(workflow, usage, dialog, message)`. External Reaction handles both signatures and uses per-workflow pass deduplication to avoid a double prompt. A callback with incomplete actor/token context must not consume the pass as seen; a later callback may be the first one with a usable context.

For `postSave`, the native Midi-QoL save-complete state invokes the `postSave` macro and ordinarily transitions to the state that processes damage details. Merely setting `workflow.aborted` in the callback does not reliably stop that transition. External Reaction wraps the instance save-complete state and returns `WorkflowState_Abort` after the native state code if the `postSave` pass was cancelled, preventing later damage processing.

For `preDamageRoll`, External Reaction uses Midi-QoL's cancellable `midi-qol.preDamageRoll` hook; Midi-QoL's implementation returns before the core damage roll when the hook result is false. If a damage roll is still produced, obtain the runtime log because that would imply a separate or fallback roll path.

## Nested Activity use and workflow cancellation

When an Item Macro returns an Activity from the same embedded Item that stores its macro command, External Reaction uses a one-shot context to suppress that Item's ordinary native on-use ItemMacro for the nested Activity; this avoids recursively prompting the same reaction. Other macro calls and Activities from other Items are not intentionally suppressed. The user's existing target selection is restored after the triggered Activity use completes.

At `preAttackRoll`, External Reaction marks the live workflow as aborted and does not return `false` from the hook. In Midi-QoL V14's `AttackActivity.rollAttack`, a `false` result from `configureAttackRoll` falls through to the core D&D 5e `rollAttack` implementation, so returning `false` would unexpectedly open the normal roll configurator. Cancellation at this stage prevents the remaining Midi-QoL roll path; later stages cannot roll back earlier work. The live Workflow is intercepted through `preTargetingV2` to cover non-attack Activities as well.
