# Changelog

## 0.11.1 — Route standalone save-card updates through GM

- Route External Reaction's standalone saving-throw chat-card update through an active GM client when the workflow is running on a player client, avoiding player-side ChatMessage permission failures.
- Preserve the existing roll calculation and card-rendering logic. GM-side requests are narrowly validated, and expected update failures are logged at debug level instead of producing noisy error stacks in player consoles.
- This is a targeted fix for the External Reaction save-card error. Separate dfreds-notifications and Foundry notification errors are not changed by this patch.

## Unreleased — Restore direct Activity trigger documentation and examples

- Clarify that a non-`ItemMacro` value in `flags.external-reaction.optional.NAME.activity.trigger` can resolve and launch an embedded D&D 5e Activity directly after its reaction is accepted.
- Keep the Item Macro route for conditional or dynamic Activity selection, where the macro returns an Activity UUID/reference or a supported structured result.
- Restore the disabled **Template — Direct Activity Trigger (Configure First)** compendium example and add direct-trigger configuration recipes and regression checks.
- Expand the example compendium from 39 to 40 entries, with three disabled setup templates.

## 0.11.0 — Self-only activation and tool-check support

- Add the bare `self` activation predicate for self-only roll features while preserving `actor == self` / `target == self` identity comparisons and `self.*` actor data access.
- Make `skill.prof` / `skill.exp` composable and add the `tool`, `tool.prof`, and `tool.exp` activation predicates.
- Add all six tool-check bonus selectors: `tool.all`, `tool.{tool}`, `tool.fail.all`, `tool.fail.{tool}`, `tool.success.all`, and `tool.success.{tool}`; wrap `Actor.rollToolCheck` so standard D&D 5e tool checks are intercepted.
- Add **Tool — Artisan's Precision** and **Tool — Locksmith's Gambit** to the native Active Effect examples, covering self-only proficiency and DC-based fail/success tool selectors.
- Include the compiled `External Reaction — Practical Examples` Active Effect compendium and all example/reference documentation in the installable release ZIP.
- Keep the existing Activity return-value workflow and 37 existing examples; this release adds two tool-check examples, bringing the compendium to 39 entries.
- Expand regression documentation for tool proficiency, self-only checks, and release-pack verification.

## 0.10.9

- Add `skill.prof` and `skill.exp` activation shortcuts. The module identifies the skill being rolled and checks the original workflow target's D&D 5e skill proficiency; proficiency and expertise satisfy `skill.prof`, while only expertise satisfies `skill.exp`.
- Fix damage-triggered ItemMacro reactions to use Midi-QoL's per-target `midi-qol.isDamaged` hook. Require positive HP or Temporary HP damage, and evaluate the condition with the damaged creature as `target` and the attacker as `actor`.
- Support Activity return references by UUID, explicit Item/Activity paths, compact Item/Activity paths, and unique partial names. Append `actor`, `target`, or `self` to direct the returned Activity; without a suffix, keep the normal target selector.
- Prevent reactions for missed attacks and preserve non-attack damage reaction behavior.
- Verified in Foundry by the maintainer/tester: damage-triggered reactions, `skill.prof` / `skill.exp` activation conditions, and Activity targeting both with the `actor` suffix and with normal target selection.

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
