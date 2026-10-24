# Changelog

Notable changes for each release are recorded here. GitHub also generates release notes when a new version is published.

## 0.10.3 — development workflow cancellation and Activity recursion fix

- Fix `preAttackRoll` cancellation so it marks the live Midi-QoL workflow aborted without returning `false` from the hook; on Midi-QoL V14 the false return makes `rollAttack` fall through to the base D&D5e roll implementation and open the default configurator.
- Suppress the item's native ItemMacro when an Item Macro returns an Activity on that same Item, preventing the nested Activity from calling the reaction test macro a second time.
- Restore the user's prior target selection after the triggered Activity finishes.
- Add diagnostics for the one-shot nested-Activity suppression context.

## 0.10.2 — development Item Macro source fix

- Resolve the source Item by searching the reactor Actor's embedded Items for the Item that contains the matching External Reaction Active Effect when the transferred effect origin cannot be resolved.
- Read the DAE/DIME `flags.dae.macro` command first, then fall back to the legacy `flags.itemacro.macro` command.
- Improve diagnostics to distinguish an unresolved source Item from a missing macro command.
- Add regression tests for a cantrip cast, `activation = cast`, and `ItemMacro, preAttackRoll`.

## 0.10.1 — development regression fix

- Fixed the `midi-qol.preTargeting` listener so the dispatcher's internal boolean is not returned to Midi-QoL. A `false` return from that hook aborts item usage, which could make every action appear cancelled when no Item Macro reaction was configured.
- Changed the default for a bare `ItemMacro` trigger from `preItemRoll` to `postActiveEffects`, as External Reaction's configured default for a bare trigger. Explicit pass suffixes and `activity.macroPass` / `activity.pass` still override the default.
- Added regression checklist coverage for ordinary actions with no matching External Reaction optional.

## 0.10.0 — development build

- Added configurable Midi-QoL Item Macro workflow passes, including `postAttackRoll`, with stage-aware cancellation; aborting does not roll back earlier work.
- Routed `preCheckHits`, `preDamageRoll`, and `preSave` through awaited Midi-QoL hooks; `preActiveEffects` uses the dedicated `haltEffectsApplication` result.
- Excluded passes that do not provide a reliable generic cancellation point: `preAttackRollConfig`, `preDamageRollConfig`, `preDamageApplication`, and `damageBonus`.

- Added Boolean activation-condition event flags for casts, attack and attack types, saves, checks, skills, damage/healing, and related workflow categories.
- Added `activity.trigger = itemMacro` preItemRoll interception. Item Macros can cancel/continue the initiating workflow or request an Activity.
- Added structured spell-slot and ItemUses/ActivityUses resource receipts to Item Macro context.
- Item Macro count consumption now runs on the reactor's client to respect ownership permissions.
- Important limitation: cancelling at preItemRoll happens before the original item's normal resource consumption. Interrupted-caster slot spending for 2014 Counterspell is not automated yet.

## 0.9.8

- Some more examples in FLAG-VALUE-EXAMPLES.md

## 0.9.7

- Extended activation-condition range syntax: `range` continues to measure from the reactor to the action target; `actor.range` measures from the reactor to the initiating actor; `target.range` explicitly refers to the action target.
- Added support for lowercase bare `canSee` as an alias for the visibility boolean `CanSee`, while preserving Midi-QoL's callable `canSee(token, target)` helper.
- Changed activation-condition evaluation to fail closed when evaluation errors occur, preventing a condition error from unintentionally allowing an optional reaction.
- Updated the activation-condition reference and flag-value examples to document the range syntax and visibility behavior.

## 0.9.5 — GitHub release baseline

This is the repository baseline imported from the tested v0.9.5 module package. Repository setup and documentation cleanup do not intentionally change runtime behavior.

- Added scene-wide optional reactions for attacks, saving throws, ability checks, skill checks, damage, and AC.
- Added Midi-QoL activation-condition evaluation, actor identity comparisons, visibility/range checks, disposition helpers, and actor item-possession helpers.
- Added triggered D&D 5e Activities with target selection and per-workflow batching.
- Added `spellslot X` costs with a slot selector for ordinary spell slots and Pact Magic.
- Improved repeated-target count/resource handling and followed Midi-QoL's configured console logging level.

## Future releases

Add a dated section for each new version, newest first. Describe user-visible behavior changes and mention important compatibility changes or limitations.
