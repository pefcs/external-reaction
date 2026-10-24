# Changelog

Notable changes for each release are recorded here. GitHub also generates release notes when a new version is published.

## 0.10.6 — development Item Macro flag-scope guard

- Fix Item Macro source resolution when Foundry's `Document#getFlag` throws because the legacy `itemacro` scope is not registered or active. Read serialized DAE/DIME and legacy Item Macro flags first, and guard optional getter fallbacks so a missing optional scope cannot abort all workflow-stage dispatch.
- Add regression coverage for DAE/DIME macro resolution and worlds where the legacy Item Macro module flag scope is unavailable.
- In-world validation reported by the maintainer: `preSave`, `preCheckHits`, and `preAttackRoll` now work with this guard. `preItemRoll` and `preDamageRoll` had been reported working in the preceding beta. Full return-path and stage-matrix regression testing remains outstanding.

## 0.10.5 — development Item Macro stage hook fixes

- Fix case-sensitive membership checks for hook-only stages. The dispatcher lowercases macro-pass names before checking the set, so the set values are now lowercased too. `preCheckHits`, `preDamageRoll`, and `preSave` now wait for their dedicated Midi-QoL hook instead of being dispatched early through `Workflow.callMacros`.
- Normalize legacy and V2 `preItemRoll` hook arguments variadically and search nested workflow/config/usage data for Midi's `callMacro` Workflow helper.
- Feed Activity, Token, Actor, Item, and target context from the early-use hook arguments when those fields have not yet been copied onto the Workflow; add debug output if no usable live Workflow is available.
- Retest `preCheckHits` and `preSave` after the corrected hook dispatch because these passes now use the intended dedicated-hook path.

## 0.10.4 — development preItemRoll and postSave cancellation fix

- Resolve the Midi-QoL V14 legacy `preItemRoll` hook payload through `config.workflow` and register the `preItemRollV2` hook too; don't mark a pass as seen if the callback does not yet have a usable initiating scene-token context.
- Add a workflow-state guard so cancelling the `postSave` Item Macro pass transitions directly to Abort before the next AllRollsComplete/damage-application state.
- Keep `preDamageRoll` cancellation routed through Midi-QoL's cancellable `midi-qol.preDamageRoll` hook. The source contract returns before the core damage roll when the hook returns false; the reported remaining roll needs an in-world log to determine whether another path is producing it.

## 0.10.3 — development workflow cancellation and Activity recursion fix

- Fix `preAttackRoll` cancellation so it marks the live Midi-QoL workflow aborted without returning `false` from the hook; on Midi-QoL V14 the false return makes `rollAttack` fall through to the base D&D5e roll implementation and open the default configurator.
- Suppress the item's native ItemMacro when an Item Macro returns an Activity on that same Item, preventing the nested Activity from calling the reaction test macro a second time.
- Restore the user's prior target selection after the triggered Activity finishes.
- Add diagnostics for the one-shot nested-Activity suppression context.
- Document the setup rule: store the Item Macro on the Item, but do not also register it on any Midi-QoL On Use Macro stage when External Reaction is its caller.

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
