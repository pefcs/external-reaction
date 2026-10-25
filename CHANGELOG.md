# Changelog

## 0.10.9-beta.5 — skill proficiency activation shorthands

- Add exact activation values `skill.prof` and `skill.exp` for External Reaction optional flags. They require a skill-check workflow, identify the skill from the active workflow/Check Activity, and inspect the original workflow target's D&D 5e skill proficiency value.
- `skill.prof` passes for proficiency or expertise (skill value ≥ 1); `skill.exp` passes only for expertise (skill value ≥ 2). Half-proficiency (0.5), an unidentified skill, a missing target, or a non-skill workflow fails closed.
- Recognize D&D 5e 6.x Check Activity `check.associated` skill associations when determining the skill event.

## 0.10.9-beta.4 — use Midi-QoL's actual per-target damage hook

- Replace the non-firing `midi-qol.damageApplied` listener with Midi-QoL V14's per-target `midi-qol.isDamaged` hook, which supplies `{ item, workflow, damageItem, ditem }` after target-specific damage calculation and before damage application.
- Resolve the live damage item from the hook context or workflow and only continue when positive HP damage or Temporary HP damage is present.
- Evaluate the `damage` activation against the damaged creature as `target`, while keeping the attacker as `actor`.
- Add debug diagnostics for the received per-target damage hook, including target, source, item, damage amounts, and workflow ID.

## 0.10.9-beta.3 — correct Midi-QoL damage-applied hook

- Attempt to listen for `midi-qol.damageApplied` with `{ item, workflow, damageItem }`; this hook did not fire in the tested V14 workflow, and was replaced in beta.4 by `midi-qol.isDamaged`.
## 0.10.9-beta.2 — target-specific damage triggers and explicit Activity targets

- Treat `flags.external-reaction.optional.NAME.activation = damage` on ItemMacro-based options as a target-taking-damage trigger, routed through the then-intended `midi-qol.damaged` hook. That hook name did not fire in the tested V14 workflow; beta.4 replaces it with `midi-qol.isDamaged`.
- Stop inferring the `damage` event flag merely from an Activity containing a damage formula.
- Pass selected Activity targets through Midi-QoL's `midiOptions.targetUuids` as well as the scene target UI, preventing the reactor from being substituted as the target.
- Allow separate target-specific dispatches to proceed independently during multi-target/AOE damage workflows.
## 0.10.9-beta.1 — Activity return targets and missed-attack damage guard

- Resolve Item Macro Activity returns by full UUID, explicit Item/Activity name path, compact Item/Activity path, or unique partial names; reject ambiguous matches.
- Support optional Activity return suffixes actor, target, and self to bypass External Reaction's custom target selector and preselect the original initiating actor, original target, or reactor. Structured Activity results can use target or targetMode.
- Skip External Reaction damage bonus prompts when an attack workflow has no hit targets, while keeping saving-throw-based and other non-attack damage reactions available.
- Add regression tests and reference documentation. This is a beta build for in-world validation before stable promotion.

Notable changes for each release are recorded here. GitHub Actions validates and packages releases when the manifest version changes on `main`.

## 0.10.8

- Isolate user-authored Item Macro commands in a nested async function, so local `const`/`let` declarations such as `externalReaction`, `data`, `actor`, `item`, and `workflow` do not collide with compatibility bindings supplied by External Reaction.
- Preserve access to the full provided macro context through lexical scope and keep top-level macro return values intact, including `"cancel"`, `"continue"`, Activity references, and supported structured results.
- Verified in Foundry: Item Macro execution and ability-check UI follow the reactor's client for both player-owned and GM-owned reactors; Counterspell's equal/lower-level auto-cancel and higher-level success/failure paths passed.

## 0.10.7

- Execute accepted External Reaction Item Macros on the selected reactor recipient's client through socketlib, rather than the initiating caster's local Midi-QoL Workflow.
- Keep the original workflow paused until the remote Item Macro returns, then preserve its existing cancellation, continuation, and Activity-reference handling.
- Serialize the Item Macro context and re-resolve supported Actor, Item, Activity, Token, and other document references on the reactor's client. The initiating Midi-QoL Workflow is provided as a limited serializable snapshot, not a live cross-client instance.
- Add one-time authorization after prompt acceptance, verify the expected socket sender, and reject replayed Item Macro requests.

## 0.10.6

- Fix Item Macro source resolution when Foundry's `Document#getFlag` throws because the legacy `itemacro` scope is not registered or active.
- Read serialized DAE/DIME and legacy Item Macro flags first and guard optional `getFlag` fallbacks so a missing scope cannot abort workflow-stage dispatch.

## 0.10.5

- Fix case-sensitive matching for hook-only passes (`preCheckHits`, `preDamageRoll`, `preSave`) and dispatch them through their dedicated awaited Midi-QoL hooks.
- Normalize legacy and V2 `preItemRoll` hook arguments, supply early Activity/Token context when available, and emit diagnostics when no usable live Workflow is available.

## 0.10.4

- Handle Midi-QoL V14 legacy `preItemRoll(activity, token, config, dialog, message)` and `preItemRollV2(workflow, usage, dialog, message)` hook signatures.
- Route cancelled `postSave` workflows to Abort before later damage processing; use the cancellable Midi-QoL hook for `preDamageRoll`.

## 0.10.3

- Fix `preAttackRoll` cancellation without triggering Midi-QoL's core D&D 5e roll-configurator fallback.
- Prevent recursive Item Macro execution when a macro launches an Activity from its own Item, and restore the user's previous target selection after the triggered Activity finishes.
- Install workflow interception through `preTargetingV2` to cover non-attack Activities.

## 0.10.2

- Resolve the source Item by matching the reactor Actor's embedded Items when the transferred effect origin cannot be resolved.
- Read DAE/DIME `flags.dae.macro` before falling back to legacy `flags.itemacro.macro`.
- Improve diagnostics and regression coverage for cantrips, `activation = cast`, and configured Item Macro passes.

## 0.10.1

- Prevent the `midi-qol.preTargeting` dispatcher from returning its internal Boolean to Midi-QoL, where `false` would abort item use.
- Set the default pass for a bare `ItemMacro` trigger to `postActiveEffects`; explicit pass suffixes and `activity.macroPass` / `activity.pass` still override it.

## 0.10.0

- Add workflow-event activation flags for casts, attacks and attack types, saves, checks, skills, damage/healing, and related workflow categories.
- Add configurable Midi-QoL macro-pass dispatch for external Item Macros. Item Macros can continue, abort the remaining workflow, or request another Activity.
- Add structured spell-slot and ItemUses/ActivityUses resource receipts to Item Macro context; Item Macro count consumption runs on the reactor's client to respect ownership permissions.

## 0.9.8

- Add more flag/value examples.

## 0.9.7

- Extend activation-condition range syntax: `range` measures from reactor to action target, `actor.range` from reactor to initiating actor, and `target.range` explicitly from reactor to action target.
- Add lowercase bare `canSee` as an alias for the visibility boolean while retaining Midi-QoL's callable `canSee(token, target)` helper.
- Fail closed when activation-condition evaluation errors occur.

## 0.9.5

- Establish the GitHub release baseline with Midi-QoL-aware console logging and silent cancellation in the spell-slot selector.

Earlier versions' feature notes remain in the repository history.
