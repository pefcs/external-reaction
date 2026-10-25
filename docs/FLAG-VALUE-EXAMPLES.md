# External Reaction — Flag + Value Examples

This document is a practical catalogue of Active Effect change examples for External Reaction. It complements [REFERENCE.md](REFERENCE.md), which describes the underlying behavior and edge cases in more detail.

## How to read the tables

- **Flag** is the complete Active Effect change key, including the optional group's name.
- **Type** is the Active Effect change mode. Use **Override** for the flags below unless a future version of the reference explicitly says otherwise. These are module configuration flags, not ordinary actor statistics; do not change the mode to Add just because the value is numeric.
- **Value** contains the literal value to enter and a short explanation of its effect.
- Replace `NAME` with a unique group name, such as `Shield`, `InspiringLeader`, or `FireBrand`. The group name is an arbitrary key; avoid reusing it for unrelated options on the same Actor.
- Add each row as its own Active Effect change. A group can contain multiple trigger flags plus one of each settings such as `count`, `activation`, `rollMode`, and `displayBonusRolls`.
- Unless otherwise noted, formulas are examples and should be adjusted to suit the feature/item. Confirm the exact change key and value in a disposable world before using them in a live campaign.

## 1. Attack-roll numeric bonuses

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.attack.all` | Override | `+1` — Offer a +1 modifier to any supported attack roll. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `1d4` — Roll an extra d4 and add it to the attack roll. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `@prof` — Add the reactor's proficiency bonus, if that reference is available in the roll data. |
| `flags.external-reaction.optional.NAME.attack.mwak` | Override | `1d4` — Add 1d4 to melee weapon attacks. |
| `flags.external-reaction.optional.NAME.attack.rwak` | Override | `+2` — Add +2 to ranged weapon attacks. |
| `flags.external-reaction.optional.NAME.attack.msak` | Override | `1d4` — Add 1d4 to melee spell attacks. |
| `flags.external-reaction.optional.NAME.attack.rsak` | Override | `+1` — Add +1 to ranged spell attacks. |
| `flags.external-reaction.optional.NAME.attack.fail.all` | Override | `1d4` — If the triggering attack would miss, offer a bonus that can potentially turn it into a hit. |
| `flags.external-reaction.optional.NAME.attack.fail.mwak` | Override | `+2` — Offer +2 only when a melee weapon attack would miss. |
| `flags.external-reaction.optional.NAME.attack.fail.rwak` | Override | `1d6` — Offer 1d6 only when a ranged weapon attack would miss. |
| `flags.external-reaction.optional.NAME.attack.success.all` | Override | `1d4` — Offer a bonus after a supported attack has hit; this is useful only if modifying the already-successful roll is appropriate to the feature. |
| `flags.external-reaction.optional.NAME.attack.success.mwak` | Override | `+2` — Success-phase bonus for a melee weapon attack. |
| `flags.external-reaction.optional.NAME.attack.success.rwak` | Override | `+2` — Success-phase bonus for a ranged weapon attack. |
| `flags.external-reaction.optional.NAME.attack.success.msak` | Override | `1d4` — Success-phase bonus for a melee spell attack. |
| `flags.external-reaction.optional.NAME.attack.success.rsak` | Override | `1d4` — Success-phase bonus for a ranged spell attack. |

**Attack type IDs:** `mwak` (melee weapon), `rwak` (ranged weapon), `msak` (melee spell), and `rsak` (ranged spell). Success-only attack selectors are supported for these four attack types.

## 2. Saving-throw numeric bonuses

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.save.all` | Override | `+1` — Offer +1 on any supported saving throw. |
| `flags.external-reaction.optional.NAME.save.str` | Override | `1d4` — Offer +1d4 on Strength saves. |
| `flags.external-reaction.optional.NAME.save.dex` | Override | `1d4` — Offer +1d4 on Dexterity saves. |
| `flags.external-reaction.optional.NAME.save.con` | Override | `1d4` — Offer +1d4 on Constitution saves. |
| `flags.external-reaction.optional.NAME.save.int` | Override | `1d4` — Offer +1d4 on Intelligence saves. |
| `flags.external-reaction.optional.NAME.save.wis` | Override | `1d4` — Offer +1d4 on Wisdom saves. |
| `flags.external-reaction.optional.NAME.save.cha` | Override | `1d4` — Offer +1d4 on Charisma saves. |
| `flags.external-reaction.optional.NAME.save.fail.all` | Override | `1d4` — Offer a bonus only when the save initially fails; the roll can be recalculated afterward. |
| `flags.external-reaction.optional.NAME.save.fail.dex` | Override | `1d6` — Offer +1d6 on a failed Dexterity save. |
| `flags.external-reaction.optional.NAME.save.fail.con` | Override | `1d4` — Offer +1d4 on a failed Constitution save. |
| `flags.external-reaction.optional.NAME.save.success.all` | Override | `1d4` — Offer a success-phase modifier after the save succeeds. |
| `flags.external-reaction.optional.NAME.save.success.wis` | Override | `1d4` — Success-phase option for Wisdom saves. |
| `flags.external-reaction.optional.NAME.save.success.cha` | Override | `1d4` — Success-phase option for Charisma saves. |

## 3. Ability-check numeric bonuses

Fail/success-specific check selectors require a numeric DC to be available to the workflow. If the roll has no DC, use the ordinary `check.*` selectors.

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.check.all` | Override | `+1` — Offer +1 on any supported ability check. |
| `flags.external-reaction.optional.NAME.check.str` | Override | `1d4` — Strength checks, such as forcing a door. |
| `flags.external-reaction.optional.NAME.check.dex` | Override | `1d4` — Dexterity checks, such as balancing or escaping a restraint. |
| `flags.external-reaction.optional.NAME.check.con` | Override | `1d4` — Constitution checks. |
| `flags.external-reaction.optional.NAME.check.int` | Override | `1d4` — Intelligence checks, such as recalling information. |
| `flags.external-reaction.optional.NAME.check.wis` | Override | `1d4` — Wisdom checks, such as noticing a hidden creature. |
| `flags.external-reaction.optional.NAME.check.cha` | Override | `1d4` — Charisma checks, such as persuading a guard. |
| `flags.external-reaction.optional.NAME.check.fail.all` | Override | `1d4` — Offer +1d4 when a check with a known DC fails. |
| `flags.external-reaction.optional.NAME.check.fail.str` | Override | `1d4` — Offer a bonus on a failed Strength check. |
| `flags.external-reaction.optional.NAME.check.fail.dex` | Override | `1d4` — Offer a bonus on a failed Dexterity check. |
| `flags.external-reaction.optional.NAME.check.success.all` | Override | `1d4` — Offer a bonus after a check succeeds against a known DC. |
| `flags.external-reaction.optional.NAME.check.success.wis` | Override | `1d4` — Success-phase option for Wisdom checks. |

## 4. Skill-check numeric bonuses

Skill IDs are D&D 5e identifiers, not the displayed skill names. Fail/success-specific selectors require a numeric DC.

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.skill.all` | Override | `+1` — Offer +1 on any supported skill check. |
| `flags.external-reaction.optional.NAME.skill.acr` | Override | `1d4` — Acrobatics (`acr`). |
| `flags.external-reaction.optional.NAME.skill.ani` | Override | `1d4` — Animal Handling (`ani`). |
| `flags.external-reaction.optional.NAME.skill.arc` | Override | `1d4` — Arcana (`arc`). |
| `flags.external-reaction.optional.NAME.skill.ath` | Override | `1d4` — Athletics (`ath`). |
| `flags.external-reaction.optional.NAME.skill.dec` | Override | `1d4` — Deception (`dec`). |
| `flags.external-reaction.optional.NAME.skill.his` | Override | `1d4` — History (`his`). |
| `flags.external-reaction.optional.NAME.skill.ins` | Override | `1d4` — Insight (`ins`). |
| `flags.external-reaction.optional.NAME.skill.inv` | Override | `1d4` — Investigation (`inv`). |
| `flags.external-reaction.optional.NAME.skill.itm` | Override | `1d4` — Intimidation (`itm`). |
| `flags.external-reaction.optional.NAME.skill.med` | Override | `1d4` — Medicine (`med`). |
| `flags.external-reaction.optional.NAME.skill.nat` | Override | `1d4` — Nature (`nat`). |
| `flags.external-reaction.optional.NAME.skill.prc` | Override | `1d4` — Perception (`prc`). |
| `flags.external-reaction.optional.NAME.skill.per` | Override | `1d4` — Performance (`per`). |
| `flags.external-reaction.optional.NAME.skill.prf` | Override | `1d4` — Persuasion (`prf`). |
| `flags.external-reaction.optional.NAME.skill.rel` | Override | `1d4` — Religion (`rel`). |
| `flags.external-reaction.optional.NAME.skill.slt` | Override | `1d4` — Sleight of Hand (`slt`). |
| `flags.external-reaction.optional.NAME.skill.ste` | Override | `1d4` — Stealth (`ste`). |
| `flags.external-reaction.optional.NAME.skill.sur` | Override | `1d4` — Survival (`sur`). |
| `flags.external-reaction.optional.NAME.skill.fail.all` | Override | `1d4` — Offer a bonus on a failed skill check when a numeric DC is known. |
| `flags.external-reaction.optional.NAME.skill.fail.prc` | Override | `1d4` — Offer a bonus on a failed Perception check with a known DC. |
| `flags.external-reaction.optional.NAME.skill.fail.ste` | Override | `1d4` — Offer a bonus on a failed Stealth check with a known DC. |
| `flags.external-reaction.optional.NAME.skill.success.all` | Override | `1d4` — Offer a success-phase bonus when a numeric DC is known. |
| `flags.external-reaction.optional.NAME.skill.success.ins` | Override | `1d4` — Success-phase option for Insight checks with a known DC. |

The complete supported skill IDs are `acr`, `ani`, `arc`, `ath`, `dec`, `his`, `ins`, `inv`, `itm`, `med`, `nat`, `prc`, `per`, `prf`, `rel`, `slt`, `ste`, and `sur`.

## 5. Tool-check numeric bonuses

Tool identifiers are the keys exposed by the installed D&D 5e system configuration (use the identifier, not the displayed name). Normal tool selectors work without a DC; fail/success selectors require a numeric DC.

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.tool.all` | Override | `+1` — Offer +1 on any supported tool check. |
| `flags.external-reaction.optional.NAME.tool.thief` | Override | `1d4` — Apply to a Thieves' Tools check when `thief` is the configured tool identifier. Replace this example key if your system uses another ID. |
| `flags.external-reaction.optional.NAME.tool.fail.all` | Override | `1d4` — Offer a bonus on any failed tool check with a known DC. |
| `flags.external-reaction.optional.NAME.tool.fail.thief` | Override | `1d4` — Offer a bonus on a failed Thieves' Tools check with a known DC. |
| `flags.external-reaction.optional.NAME.tool.success.all` | Override | `1d4` — Offer a bonus on any successful tool check with a known DC. |
| `flags.external-reaction.optional.NAME.tool.success.thief` | Override | `1d4` — Offer a bonus on a successful Thieves' Tools check with a known DC. |

The tool-specific selector is checked before the matching phase's `.all` fallback. The system obtains valid tool identifiers from the installed D&D 5e configuration and the Actor's tool data. If a roll does not expose its tool identifier, `.all` selectors can still apply but `tool.{tool}` and `tool.prof` / `tool.exp` cannot safely infer the specific tool.

## 6. Damage bonuses

For untyped/action-specific bonuses, the action-specific selector takes priority over `damage.all`. Typed damage selectors create a separate damage roll of the specified type. One group selects one matching damage path per damage pass; use separate `NAME` groups for independent bonus options.

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.damage.all` | Override | `+1` — Add an untyped +1 to a supported damage roll. |
| `flags.external-reaction.optional.NAME.damage.mwak` | Override | `1d6` — Add untyped 1d6 to melee weapon attack damage. |
| `flags.external-reaction.optional.NAME.damage.rwak` | Override | `1d6` — Add untyped 1d6 to ranged weapon attack damage. |
| `flags.external-reaction.optional.NAME.damage.msak` | Override | `1d8` — Add untyped 1d8 to melee spell attack damage. |
| `flags.external-reaction.optional.NAME.damage.rsak` | Override | `1d8` — Add untyped 1d8 to ranged spell attack damage. |
| `flags.external-reaction.optional.NAME.damage.save` | Override | `1d6` — Add untyped 1d6 to a save-based damage roll. |
| `flags.external-reaction.optional.NAME.damage.other` | Override | `1d4` — Add untyped 1d4 to an Other-type damage roll. |
| `flags.external-reaction.optional.NAME.damage.util` | Override | `1d4` — Add untyped 1d4 to a utility-type damage roll where a damage roll is present. |
| `flags.external-reaction.optional.NAME.damage.heal` | Override | `1d4` — Add a healing roll modifier for a Heal-type action. |
| `flags.external-reaction.optional.NAME.damage.fire.all` | Override | `1d6` — Add a separate 1d6 Fire damage roll to any supported damage action. |
| `flags.external-reaction.optional.NAME.damage.fire.mwak` | Override | `1d6` — Add a separate 1d6 Fire damage roll only to melee weapon attack damage. |
| `flags.external-reaction.optional.NAME.damage.fire.rwak` | Override | `1d6` — Add a separate 1d6 Fire damage roll only to ranged weapon attack damage. |
| `flags.external-reaction.optional.NAME.damage.cold.all` | Override | `1d4` — Add a separate 1d4 Cold damage roll. |
| `flags.external-reaction.optional.NAME.damage.lightning.mwak` | Override | `1d8` — Add a separate 1d8 Lightning damage roll to melee weapon attacks. |
| `flags.external-reaction.optional.NAME.damage.radiant.all` | Override | `1d6` — Add a separate 1d6 Radiant damage roll. |
| `flags.external-reaction.optional.NAME.damage.necrotic.all` | Override | `1d6` — Add a separate 1d6 Necrotic damage roll. |
| `flags.external-reaction.optional.NAME.damage.force.all` | Override | `1d4` — Add a separate 1d4 Force damage roll. |
| `flags.external-reaction.optional.NAME.damage.poison.all` | Override | `1d4` — Add a separate 1d4 Poison damage roll. |
| `flags.external-reaction.optional.NAME.damage.psychic.all` | Override | `1d6` — Add a separate 1d6 Psychic damage roll. |
| `flags.external-reaction.optional.NAME.damage.thunder.all` | Override | `1d6` — Add a separate 1d6 Thunder damage roll. |
| `flags.external-reaction.optional.NAME.damage.acid.all` | Override | `1d4` — Add a separate 1d4 Acid damage roll. |
| `flags.external-reaction.optional.NAME.damage.bludgeoning.all` | Override | `1d6` — Add a separate 1d6 Bludgeoning damage roll. |
| `flags.external-reaction.optional.NAME.damage.piercing.all` | Override | `1d6` — Add a separate 1d6 Piercing damage roll. |
| `flags.external-reaction.optional.NAME.damage.slashing.all` | Override | `1d6` — Add a separate 1d6 Slashing damage roll. |
| `flags.external-reaction.optional.NAME.damage.none.all` | Override | `1d4` — Add a separate untyped (No type) damage roll. |
| `flags.external-reaction.optional.NAME.damage.maximum.all` | Override | `1d4` — Example for a configured Maximum Hit Points damage type where the installed system/module supports it. |
| `flags.external-reaction.optional.NAME.damage.mhp.all` | Override | `1d4` — Alias for the `maximum` damage type where supported. |
| `flags.external-reaction.optional.NAME.criticalDamage` | Override | `true` — Build the bonus DamageRoll with `configured = false`, matching Midi-QoL critical-damage handling. Damage-only setting. |

Supported action suffixes for typed damage include `mwak`, `rwak`, `msak`, `rsak`, `other`, `save`, and `util`. Do not use `heal` beneath a damage type. `midi-none` is not a damage type; use `none` for untyped damage. Typed damage values should be damage formulas or a macro returning a roll/formula, not standalone reroll controls.

## 7. Armour Class (AC) bonuses

AC options belong on the Actor being attacked, because that Actor is the one whose AC is adjusted before Midi-QoL adjudicates the hit. An AC bonus does not spend the character's reaction unless the count settings request it.

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.ac` | Override | `+2` — Offer +2 AC against any supported attack, whether it would hit or miss. |
| `flags.external-reaction.optional.NAME.ac` | Override | `1d4` — Roll 1d4 and add the result to AC for this attack workflow. |
| `flags.external-reaction.optional.NAME.ac.hit` | Override | `+2` — Offer +2 AC only if the attack would hit against the original effective AC. |
| `flags.external-reaction.optional.NAME.ac.mwak` | Override | `+2` — AC bonus against a melee weapon attack. |
| `flags.external-reaction.optional.NAME.ac.rwak` | Override | `+2` — AC bonus against a ranged weapon attack. |
| `flags.external-reaction.optional.NAME.ac.msak` | Override | `+2` — AC bonus against a melee spell attack. |
| `flags.external-reaction.optional.NAME.ac.rsak` | Override | `+2` — AC bonus against a ranged spell attack. |
| `flags.external-reaction.optional.NAME.ac.mwak.hit` | Override | `+2` — AC bonus only against a melee weapon attack that would normally hit. |
| `flags.external-reaction.optional.NAME.ac.rwak.hit` | Override | `+2` — AC bonus only against a ranged weapon attack that would normally hit. |
| `flags.external-reaction.optional.NAME.ac.msak.hit` | Override | `+2` — AC bonus only against a melee spell attack that would normally hit. |
| `flags.external-reaction.optional.NAME.ac.rsak.hit` | Override | `+2` — AC bonus only against a ranged spell attack that would normally hit. |

Within one group, selector priority is attack-type-and-hit, attack type, hit-only, then general AC. Use separate groups if you want multiple AC options to be offered independently.

## 8. Activation conditions

Bare `self` is a boolean self-only predicate, distinct from `actor == self`. Proficiency predicates are composable: use `self && (skill.prof || tool.prof)` for an option that requires the owner to be rolling and requires proficiency in a skill or tool.


Set the following as the value of `flags.external-reaction.optional.NAME.activation`. Conditions are evaluated in the context of the current reaction. Empty or missing conditions allow the option. Use single quotes inside expressions where convenient, and test expressions carefully: Midi-QoL's evaluator can permissively allow an option if evaluation errors.

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.activation` | Override | `true` — Always allow this option. |
| `flags.external-reaction.optional.NAME.activation` | Override | `false` — Never allow this option. |
| `flags.external-reaction.optional.NAME.activation` | Override | `self` — Allow only when the Actor owning the option is the Actor performing the relevant roll. |
| `flags.external-reaction.optional.NAME.activation` | Override | `skill.prof` or `tool.prof` — Require proficiency or expertise in the skill/tool being rolled. |
| `flags.external-reaction.optional.NAME.activation` | Override | `skill.exp` or `tool.exp` — Require expertise in the skill/tool being rolled. |
| `flags.external-reaction.optional.NAME.activation` | Override | `self && (skill.prof || tool.prof)` — Example self-only proficiency condition for Psi-Bolstered Knack. |
| `flags.external-reaction.optional.NAME.activation` | Override | `enemy` — Allow only when reactor and action target are enemies. |
| `flags.external-reaction.optional.NAME.activation` | Override | `friendly` — Allow only when reactor and action target have a friendly relationship. |
| `flags.external-reaction.optional.NAME.activation` | Override | `CanSee` — Allow only when the reactor can see the action target. |
| `flags.external-reaction.optional.NAME.activation` | Override | `enemy && CanSee` — Require an enemy target that the reactor can see. |
| `flags.external-reaction.optional.NAME.activation` | Override | `range <= 30` — Require the reactor to be within 30 scene distance units of the action target. |
| `flags.external-reaction.optional.NAME.activation` | Override | `range <= 30 && CanSee` — Require range and visibility. |
| `flags.external-reaction.optional.NAME.activation` | Override | `range > 5 && range <= 30` — Require distance greater than 5 and no more than 30 units. |
| `flags.external-reaction.optional.NAME.activation` | Override | `actor.range <= 30` — Require the reactor to be within 30 scene units of the initiating actor, such as the attacker or caster. |
| `flags.external-reaction.optional.NAME.activation` | Override | `target.range <= 30` — Require the reactor to be within 30 scene units of the action target; explicit equivalent of `range <= 30`. |
| `flags.external-reaction.optional.NAME.activation` | Override | `actor.range <= 30 && target.range <= 10` — Require the initiating actor to be within 30 units and the action target to be within 10 units of the reactor. |
| `flags.external-reaction.optional.NAME.activation` | Override | `actor.range < target.range` — Require the initiating actor to be closer to the reactor than the action target is. |
| `flags.external-reaction.optional.NAME.activation` | Override | `actor.range <= 60 && target.range <= 30 && CanSee` — Require both distance limits and visibility to the action target. |
| `flags.external-reaction.optional.NAME.activation` | Override | `actor != self` — Require the initiating Actor to differ from the reactor. |
| `flags.external-reaction.optional.NAME.activation` | Override | `target == self` — Require the action target to be the same Actor as the reactor. |
| `flags.external-reaction.optional.NAME.activation` | Override | `actor != self && target == self` — Require another Actor to initiate an action targeting the reactor. |
| `flags.external-reaction.optional.NAME.activation` | Override | `target.disposition.in('hostile', 'secret')` — Require a Hostile or Secret action target. |
| `flags.external-reaction.optional.NAME.activation` | Override | `actor.disposition == "hostile"` — Require the initiating Actor to have Hostile disposition. |
| `flags.external-reaction.optional.NAME.activation` | Override | `!target.statuses.has('incapacitated')` — Disallow the option if the target has the incapacitated status. |
| `flags.external-reaction.optional.NAME.activation` | Override | `target.attributes.hp.value < target.attributes.hp.max / 2` — Require the action target to be below half HP. |
| `flags.external-reaction.optional.NAME.activation` | Override | `self.item.has("Shield")` — Require the reactor to own an embedded Item named Shield. |
| `flags.external-reaction.optional.NAME.activation` | Override | `actor.item.has("Counterspell")` — Require the initiating Actor to own Counterspell. |
| `flags.external-reaction.optional.NAME.activation` | Override | `target.item.has("Shield")` — Require the action target to own Shield. |
| `flags.external-reaction.optional.NAME.activation` | Override | `self.item.has("War Caster") && CanSee` — Require the reactor to own War Caster and see the target. |
| `flags.external-reaction.optional.NAME.activation` | Override | `target.item.has("Magic Missile", "partial")` — Require the target to own an Item whose name contains “Magic Missile”. |
| `flags.external-reaction.optional.NAME.activation` | Override | `flags["some-module"].someFlag === true` — Check a module flag exposed in the reactor's actor data. |
| `flags.external-reaction.optional.NAME.activation` | Override | `friendly && range <= 30 && CanSee` — Require a friendly target within range and visible. |
| `flags.external-reaction.optional.NAME.activation` | Override | `target.disposition != "friendly" && CanSee` — Require a non-Friendly target the reactor can see. |

Context reminder: `self` / `reactor` is the Actor owning the option; `actor` is the initiating Actor; `target` is the action recipient. For damage reactions, `target` is the first available affected target. Bare `range` remains the distance from the reactor to `target` for backward compatibility. `actor.range` measures reactor-to-initiator distance, while `target.range` explicitly measures reactor-to-action-target distance. All use Midi-QoL's distance measurement and do not themselves account for walls; combine with `CanSee` when appropriate. If a required token/distance is unavailable, the condition is rejected.

## 9. Usage counts and resource costs

The count fields control availability and resource consumption. Add them to the same optional group as the triggering bonus. Without `count` or `countAlt`, accepting the option does not automatically spend the character's reaction; the granting effect is still subject to its own lifecycle.

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.count` | Override | `1` — Allow one use of the option while the granting Active Effect/resource remains available. |
| `flags.external-reaction.optional.NAME.count` | Override | `2` — Allow up to two uses according to the effect's count lifecycle. |
| `flags.external-reaction.optional.NAME.count` | Override | `each-turn` — Refresh/use count on a per-turn basis. |
| `flags.external-reaction.optional.NAME.count` | Override | `each-round` — Refresh/use count on a per-round basis. |
| `flags.external-reaction.optional.NAME.count` | Override | `turn` — Use the turn-based count behavior. |
| `flags.external-reaction.optional.NAME.count` | Override | `reaction` — Require and consume the Actor's reaction through Midi-QoL's reaction tracking. |
| `flags.external-reaction.optional.NAME.count` | Override | `bonusAction` — Use Midi-QoL's bonus-action resource tracking. |
| `flags.external-reaction.optional.NAME.count` | Override | `every` — Test/development setting that does not impose a normal limited-use count; useful for repeatable tests. |
| `flags.external-reaction.optional.NAME.count` | Override | `ItemUses.{itemName}` — Use the relevant item's available uses as the count resource. (e.g.: ItemUses.Bardic Inspiration) |
| `flags.external-reaction.optional.NAME.count` | Override | `ActivityUses.{itemName}.{activityName}` — Use the relevant Activity's available uses as the count resource. (e.g.: ActivityUses.Bardic Inspiration.Sing Song) |
| `flags.external-reaction.optional.NAME.count` | Override | `@system.uses.value` — Read a count from a system data path; replace the example path with a valid path for the intended Actor/item data. |
| `flags.external-reaction.optional.NAME.count` | Override | `spellslot 1` — Require the player to select and spend an available spell slot of level 1 or higher. |
| `flags.external-reaction.optional.NAME.count` | Override | `spellslot 3` — Require and spend an available ordinary or Pact Magic slot of level 3 or higher. |
| `flags.external-reaction.optional.NAME.countAlt` | Override | `reaction` — Require an unused reaction as an additional count condition. |
| `flags.external-reaction.optional.NAME.countAlt` | Override | `bonusAction` — Require the bonus-action resource as an additional count condition. |
| `flags.external-reaction.optional.NAME.countAlt` | Override | `spellslot 2` — Require an additional selected level 2+ spell slot alongside the primary count. |
| `flags.external-reaction.optional.NAME.count` | Override | `reaction` plus `flags.external-reaction.optional.NAME.countAlt` = `spellslot 3` — Require both an unused reaction and a level 3+ slot; acceptance spends the selected slot and marks the reaction used. |

Use the exact literal values shown for special count formats. A `spellslot X` selector is cancelled if the user cancels the picker; no slot is spent and the optional reaction is not applied. If both count fields specify spell slots, the higher minimum controls which slots can be selected.

## 10. Start a D&D 5e Activity from an Item Macro return value

The supported route for launching a D&D 5e Activity from an External Reaction is to invoke an Item Macro and return the Activity reference from that macro. The Activity must be embedded in an Item on the reactor's Actor. Do **not** set `activity.trigger` directly to an Activity UUID; that field selects the Item Macro to run and the workflow pass.

### Configure the granting Active Effect

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.activity.trigger` | Override | `ItemMacro` — Run the stored Item Macro at `postActiveEffects` by default. |
| `flags.external-reaction.optional.NAME.activity.trigger` | Override | `ItemMacro, postAttackRoll` — Run the macro after attack adjudication, before damage. Use another supported Midi-QoL pass when it better matches the feature. |
| `flags.external-reaction.optional.NAME.activity.macroPass` | Override | `preItemRoll` — Optional separate pass setting; it overrides a pass embedded in `activity.trigger`. |
| `flags.external-reaction.optional.NAME.count` | Override | `reaction` — Require and expend the reactor's Reaction when accepted. |

Keep the Item Macro command on the source Item using the supported DAE/DIME or legacy Item Macro storage. **Do not also register the same command in Midi-QoL's On Use Macro stages** when External Reaction owns its invocation, or it may run twice or recurse when it launches an Activity.

### Return the Activity from the Item Macro

A simple macro can return the Activity UUID:

```js
// Use the real UUID of an Activity embedded on the reactor's Actor.
return "Actor.<reactorActorId>.Item.<itemId>.Activity.<activityId>";
```

Use a structured return when you need to control targeting or whether the original workflow continues:

```js
return {
  action: "activity",
  activityUuid: "Actor.<reactorActorId>.Item.<itemId>.Activity.<activityId>",
  target: "actor",
  cancelOriginal: true
};
```

Supported targeting modes are `actor` (the Actor that initiated the original workflow), `target` (the original workflow target), and `self` (the reactor). A plain Activity UUID/reference uses the normal Activity flow: area Activities use template placement; direct-target Activities show an Activity-aware picker. You can also append ` actor`, ` target`, or ` self` to a string reference, e.g. `"Actor.<reactorActorId>.Item.<itemId>.Activity.<activityId> actor"`, to skip the picker and explicitly choose the target. The full list of accepted Activity reference formats appears in [the Technical Reference](REFERENCE.md#start-an-activity-from-an-item-macro-return-value).

### Return-value behavior

| Return value | Meaning |
|---|---|
| An Activity UUID/reference string or Activity document | Start that Activity on the reactor's client, then continue the original workflow. |
| `{ action: "activity", activityUuid: "...", cancelOriginal: true }` | Start the Activity, then abort the remaining original workflow. |
| `"cancel"`, `true`, or `{ action: "cancel" }` | Abort the remaining original workflow without starting an Activity. |
| `"continue"`, `false`, `null`, or no return value | Continue the original workflow without starting an Activity. |

Cancellation does not roll back earlier rolls, consumed resources, HP changes, or effects. Pick the earliest macro pass that provides the context you need, and test the specific Activity and pass in a disposable world.

## 11. Bonus-roll display and roll mode

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.displayBonusRolls` | Override | `true` — Explicitly show the before/after bonus roll card. |
| `flags.external-reaction.optional.NAME.displayBonusRolls` | Override | `false` — Hide the before/after bonus roll card. |
| `flags.external-reaction.optional.NAME.rollMode` | Override | `publicroll` — Post using public roll visibility. |
| `flags.external-reaction.optional.NAME.rollMode` | Override | `gmroll` — Post as a GM-only roll. |
| `flags.external-reaction.optional.NAME.rollMode` | Override | `blindroll` — Use a blind roll visible to the GM. |
| `flags.external-reaction.optional.NAME.rollMode` | Override | `selfroll` — Use a self roll visible to the roller and GM. |

If `displayBonusRolls` is absent, External Reaction consults Midi-QoL's saved settings/API snapshot and then its initialized default. If `rollMode` is absent, Midi-QoL's `core.messageMode` behavior and Foundry's core roll-mode setting are used where applicable. Roll visibility cannot be retroactively changed for messages that have already been seen.

## 12. Roll-value operators and macros

These are example **values** for supported roll-modifier flags such as `attack.*`, `save.*`, `check.*`, `skill.*`, `damage.*`, and `ac`. Not every value makes sense for every flag family: reroll operators need an existing roll, and typed damage selectors should be formulas or macros that return a formula/roll.

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.NAME.attack.all` | Override | `+2` — Add a flat +2 modifier to the existing attack roll. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `1d4 + 2` — Roll 1d4+2 and add it to the existing roll. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `reroll` — Reroll the existing roll. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `reroll-query` — Show a confirmation comparing the original and reroll; keep the original if the reroll is not accepted. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `reroll-kh` — Reroll and keep the higher total. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `reroll-kl` — Reroll and keep the lower total. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `reroll-max` — Reroll with dice maximized. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `reroll-min` — Reroll with dice minimized. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `reroll-withBonus 1d4` — Reroll using the original formula plus an additional 1d4. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `replace 1d20 + 10` — Replace the original roll with the supplied formula. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `success` — Force the roll's success-style result using the module's supported success handling. Use only where this behavior is intended. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `fail` — Force the roll's fail-style result using the module's supported fail handling. Use only where this behavior is intended. |
| `flags.external-reaction.optional.NAME.damage.fire.all` | Override | `replace 2d6` — Add a separate typed Fire damage roll using 2d6. |
| `flags.external-reaction.optional.NAME.damage.all` | Override | `critical` — Apply the supported critical-style damage-roll behavior to the existing roll. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `ItemMacro` — Execute the relevant item's ItemMacro through Midi-QoL's workflow macro integration. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `ItemMacro.MyMacro` — Invoke a named ItemMacro, where supported by the installed macro integration. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `ItemMacro.Item.abc123` — Invoke an ItemMacro by Item UUID/identifier form supported by the macro integration. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `Macro.MyMacro` — Invoke a world macro named MyMacro through Midi-QoL's workflow macro system. |
| `flags.external-reaction.optional.NAME.attack.all` | Override | `function.myRegisteredFunction` — Invoke a function registered with Midi-QoL; this is not a way to call arbitrary global functions. |

**Unsupported:** `ActivityMacro` is intentionally not supported as a roll value. To launch a D&D 5e Activity, configure the External Reaction Item Macro path (`activity.trigger = ItemMacro, <pass>`) and return the Activity UUID/reference from that Item Macro. Macro names/identifiers must match what Midi-QoL can resolve in the installed version.

## 13. Combining fields into practical options

The following are small recipes. Each row is still a separate Active Effect change.

### Example A — Ally helps a failed save

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.Blessing.save.fail.all` | Override | `1d4` — Add 1d4 to an initially failed save. |
| `flags.external-reaction.optional.Blessing.activation` | Override | `target.disposition == friendly && CanSee && range <= 30` — Only offer it to a visible friendly target within 30 units. |
| `flags.external-reaction.optional.Blessing.count` | Override | `reaction` — Spend the helper's reaction. |
| `flags.external-reaction.optional.Blessing.displayBonusRolls` | Override | `true` — Show the roll change. |

### Example B — Defensive AC boost

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.Shield.ac.hit` | Override | `+5` — Offer +5 AC only when the incoming attack would hit normally. |
| `flags.external-reaction.optional.Shield.activation` | Override | `target == self` — Only react when the reactor is the action target. |
| `flags.external-reaction.optional.Shield.count` | Override | `reaction` — Spend the character's reaction. |
| `flags.external-reaction.optional.Shield.rollMode` | Override | `publicroll` — Use public roll visibility for the option's roll message. |

### Example C — Fire-infused melee damage for another actor

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.FireBrand.damage.fire.mwak` | Override | `1d6` — Add a separate 1d6 Fire damage roll to a melee weapon attack. |
| `flags.external-reaction.optional.FireBrand.count` | Override | `each-turn` — Use the per-turn count behavior. |
| `flags.external-reaction.optional.FireBrand.activation` | Override | `target.disposition == enemy && CanSee` — Require a visible enemy target. |
| `flags.external-reaction.optional.FireBrand.criticalDamage` | Override | `true` — Use the special configured=false behavior for the bonus damage roll. |

### Example D — Use an Item Macro to launch an embedded Activity

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.CounterSpell.activity.trigger` | Override | `ItemMacro, preItemRoll` — Invoke the reactor's stored Item Macro before the initiating item's roll. Use a later pass such as `postAttackRoll` when the macro needs the attack result. |
| `flags.external-reaction.optional.CounterSpell.activation` | Override | `cast && actor != self && CanSee` — Only consider a visible cast initiated by another Actor. |
| `flags.external-reaction.optional.CounterSpell.count` | Override | `reaction` — Require and expend the reactor's Reaction when accepted. |

The Item Macro—not the Active Effect—chooses which embedded Activity to use. Have the macro return an Activity reference such as `Actor.<reactorActorId>.Item.<itemId>.Activity.<activityId>`, or return a structured result such as `{ action: "activity", activityUuid: "...", cancelOriginal: true }`. The `activity.trigger` field is used to select the Item Macro and workflow pass; do not put the Activity UUID directly in this field. See Section 9 below for full setup steps and target-selection options.

### Example E — Spend a spell slot for an optional bonus

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.ArcaneBoost.save.all` | Override | `1d4` — Offer +1d4 on a saving throw. |
| `flags.external-reaction.optional.ArcaneBoost.count` | Override | `spellslot 2` — Require and spend a selected spell slot of level 2 or higher. |
| `flags.external-reaction.optional.ArcaneBoost.activation` | Override | `target.disposition == friendly && CanSee` — Restrict to a visible friendly target. |

### Example F — Force reroll an enemy actor's ranged weapon attack hit per turn

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.ArcaneBoost.attack.success.rwak` | Override | `reroll` — Reroll the Attack roll. |
| `flags.external-reaction.optional.ArcaneBoost.count` | Override | `every-turn` — Once per turn. |
| `flags.external-reaction.optional.ArcaneBoost.activation` | Override | `actor.disposition == hostile && CanSee` — Restrict to a visible enemy actor. |

### Example G — Improve the owner’s own proficient tool check

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.ArtisansPrecision.tool.all` | Override | `1d4` — Add 1d4 to a supported tool check. |
| `flags.external-reaction.optional.ArtisansPrecision.activation` | Override | `self && tool.prof` — Only offer the option when the owner of the Active Effect is making a tool check for which they have proficiency or expertise. |
| `flags.external-reaction.optional.ArtisansPrecision.count` | Override | `each-turn` — Limit the option to once per turn. |

### Example H — Use a reaction to assist a Thieves’ Tools check

| Flag | Type | Value |
|---|---|---|
| `flags.external-reaction.optional.ToolmastersAid.tool.fail.thief` | Override | `1d4` — Offer +1d4 when the Thieves’ Tools check initially fails and has a numeric DC. |
| `flags.external-reaction.optional.ToolmastersAid.tool.success.thief` | Override | `1d4` — Offer +1d4 after a successful Thieves’ Tools check with a numeric DC. |
| `flags.external-reaction.optional.ToolmastersAid.activation` | Override | `tool` — Limit this option to tool checks. |
| `flags.external-reaction.optional.ToolmastersAid.count` | Override | `reaction` — Spend the reacting character’s Reaction when accepted. |

The example tool identifier is `thief`; replace it with the identifier used by your installed D&D 5e system if it differs. Tool fail/success phases require a numeric DC. The success-phase modifier is intended for features where the final total or margin after success still matters.

## Important behavior notes

1. **The optional group is the unit of selection.** One matching optional group per reactor is processed per phase. If you want two independently offered damage options, define separate group names rather than relying on two matching paths in one group.
2. **Path priority matters.** Action-specific attack/damage selectors take precedence over their general `all` selector where documented. AC has its own selector priority described above.
3. **Not all phases can always be inferred.** Check/skill/tool fail/success flags require a numeric DC. Ordinary skill and tool rolls often do not include one.
4. **AC belongs on the defender.** Put `ac` changes on the Actor receiving the attack, not on the attacker.
5. **Counts are resource rules, not just labels.** Choose `reaction`, `bonusAction`, item/activity uses, or spell slots only when that resource should actually be required/consumed.
6. **Activation conditions are executable expressions.** Keep them simple, verify spelling and identifiers, and test them with Midi-QoL debug logging enabled.
7. **Use Override for these examples.** Active Effect modes such as Add are meant for arithmetic changes to system data. External Reaction reads its own flag values as configuration; Add/Multiply/etc. may change how the flag is stored or interpreted and are not recommended here.
8. **Verify the installed build.** This list reflects the documented External Reaction behavior at the time of writing; it is an example catalogue, not a guarantee that every formula is appropriate for every item or workflow.


## External Reaction Item Macro workflow invocation

This feature invokes an Item Macro at a chosen Midi-QoL workflow pass. It is separate from using the `ItemMacro` string as a normal roll value. Set `flags.external-reaction.optional.NAME.activity.trigger = ItemMacro` (default `postActiveEffects`) or `ItemMacro, <pass>`; use `activity.macroPass` to set the pass separately. The macro must be stored on the Item resolved from the granting Active Effect, and the same command must not also be registered as a Midi-QoL On Use Macro.

To start an embedded Activity, **return** its Activity UUID/reference or a supported structured result from the macro; do not place the Activity UUID directly in `activity.trigger`. For example:

```js
const macroArgs = Array.isArray(args) ? args : [];
const data = macroArgs[0] ?? {};

// The reference must identify an Activity embedded on the reactor's Actor.
return {
  action: "activity",
  activityUuid: "Actor.<reactorActorId>.Item.<itemId>.Activity.<activityId>",
  target: "actor" // optional: actor, target, or self
};
```

A plain reference uses the normal Activity target/template flow. Add `cancelOriginal: true` to a structured Activity result to cancel the remaining initiating workflow after the Activity runs. See [Section 9](#9-start-a-dd-5e-activity-from-an-item-macro-return-value) for the full return contract and target-selection behavior.

The macro runs on the reactor's selected client: the active player who owns the reactor Actor, or the GM for a GM-owned reactor/GM fallback. Its context is passed through `args[0]`. The initiating `workflow` is a serializable snapshot, not a live Midi-QoL Workflow instance. The wrapper isolates the macro's local scope, so local declarations such as `data` and `externalReaction` are safe.

Supported workflow results include `"cancel"` / `true` to abort the remaining workflow, `"continue"` / `false` to continue, an Activity UUID/reference to use that Activity on the reactor's client, or a supported structured Activity result. Cancellation is not a rollback: rolls, resources, HP, or effects already applied at a later pass are not automatically restored.
