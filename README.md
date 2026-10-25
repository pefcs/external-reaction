# External Reaction

External Reaction extends Midi-QoL-style optional reactions so eligible creatures on the active scene can react to another creature's attacks, saving throws, ability checks, skill checks, damage rolls, and incoming attacks. External Reaction Item Macros can also launch embedded D&D 5e Activities by returning an Activity reference or structured result.

**Current version: 0.11.0**  
**Target environment:** Foundry VTT V14, D&D 5e 6.0.6+, Midi-QoL 14.6.4+, and socketlib.

## Highlights (stable v0.10.0–v0.11.0)

- For ItemMacro options, `flags.external-reaction.optional.NAME.activation = damage` uses Midi-QoL's per-target `midi-qol.isDamaged` event after target-specific damage is calculated but before HP is updated. It only prompts when positive HP or Temporary HP damage is present; an unused damage formula or missed attack does not trigger it.
- Pass targeted Activity use through Midi-QoL's explicit `midiOptions.targetUuids`, so an `actor` suffix and a target chosen in the module picker target the intended token.
- Support composable `self`, `skill`, `tool`, `skill.prof` / `skill.exp`, and `tool.prof` / `tool.exp` activation predicates.
- Add tool-check bonuses using `tool.all`, `tool.{tool}`, and their fail/success phase selectors, alongside ability and skill checks.
- Trigger reactions from workflow-event activation conditions such as `cast`, `attack`, save/check/skill events, and related activity flags.
- Invoke an Item Macro at a selected Midi-QoL workflow pass, with structured spell-slot and ItemUses/ActivityUses resource receipts.
- Execute accepted Item Macros on the reactor's owning client's screen: the owning player's client for a player-owned reactor, or the GM client when the GM owns the reactor or the GM fallback is selected.
- Return `"cancel"`, `"continue"`, an Activity reference, or a supported structured result to control the original workflow.
- Run macro source in an isolated async scope so local declarations such as `const externalReaction = data.externalReaction ?? {};` do not collide with the module's Midi-compatible context bindings.
- Guard optional Item Macro flag lookup when Foundry V14 does not register the legacy `itemacro` scope; support DAE/DIME and the supported legacy macro storage.

## Example Active Effects Compendium

The **External Reaction — Practical Examples** compendium includes ready-to-use D&D 5e Active Effects for realistic combat, saving throws, checks, skill proficiency, damage bonuses, activation conditions, and resource costs. Most examples can be dragged directly onto an actor; two templates are disabled until their character-specific ActivityUses or damage-triggered Item Macro details are configured. To launch an Activity, use the Item Macro workflow path and return the Activity reference from the macro—do not put the Activity UUID directly in `activity.trigger`. Most examples leave `displayBonusRolls` unset so Midi-QoL's own setting is respected, with two entries retained to demonstrate explicit overrides.

See [Active Effect Examples](docs/ACTIVE-EFFECT-EXAMPLES.md) for the entry list, setup notes, and coverage.

## Item Macro setup and execution context

Keep the Item Macro command stored on the source Item through your supported DAE/DIME or legacy Item Macro mechanism. **Do not also assign the same command to a Midi-QoL On Use Macro stage** when External Reaction owns its invocation; otherwise it can run twice or recurse when it launches an Activity from that Item.

Configure the granting Active Effect with `flags.external-reaction.optional.NAME.activity.trigger = ItemMacro` to use the default `postActiveEffects` pass, or `ItemMacro, postAttackRoll` to select another workflow pass. To start an Activity, have the stored macro return its Activity UUID/reference (or a structured Activity result); the `activity.trigger` flag selects the Item Macro, not the Activity itself.

The Item Macro executes on the selected reactor recipient's client, and the original workflow waits for its returned value. Document references in the context are re-resolved on that client. The `workflow` value is a **serializable snapshot**, not a live Midi-QoL Workflow instance, so code should not expect live Workflow methods or mutate the initiating workflow object directly. Actor APIs such as `actor.rollAbilityCheck()` run on the reactor's client and can show roll UI there.

Cancelling a workflow is not a rollback: earlier rolls, spent resources, or applied effects are not automatically undone. In particular, a rules-accurate 2014 Counterspell automation still needs a separately tested solution for the interrupted caster's spell-slot consumption when cancelling at `preItemRoll`.

## Documentation

- [Technical reference](docs/REFERENCE.md) — supported flags, selectors, activation expressions, Item Macro execution, resource counts, spell slots, and Activity return values.
- [Flag/value examples](docs/FLAG-VALUE-EXAMPLES.md) — copyable Active Effect flag examples.
- [Regression test plan](TESTING.md) — release verification and regression scenarios.
- [Changelog](CHANGELOG.md) — notable changes by version.
- [Maintainer contribution notes](CONTRIBUTING.md) — versioning, validation, and release workflow.

## Installation in Foundry

Install using the module's stable manifest URL:

`https://github.com/pefcs/external-reaction/releases/latest/download/module.json`

The repository's GitHub Actions workflow validates the manifest and JavaScript, builds `module.zip`, and publishes a release when the manifest version changes on `main`. You can also download the installable ZIP from the [Releases page](https://github.com/pefcs/external-reaction/releases).

## Compatibility and testing

The manifest declares Foundry V14 and D&D 5e 6.0.6 as minimum versions. External Reaction integrates with Midi-QoL workflow methods that may change between versions. Test upgrades and new Item Macro passes in a copy of your world before using them in a live campaign. The 0.10.8 reactor-client Counterspell flow has been tested in-world for player-owned and GM-owned reactors, automatic countering when the Counterspell slot level is high enough, and success/failure handling for the ability check when the spell is higher-level. Version 0.10.9 was also tested in-world for damage-triggered reactions, `skill.prof` / `skill.exp` activation conditions, and both explicit and picker-based Activity targeting.

## v0.10.9 changes

- Add the exact activation values `skill.prof` and `skill.exp` to filter optional reactions based on the original workflow target's proficiency or expertise in the skill being rolled.
- Handle `activation = damage` for ItemMacro-backed options using Midi-QoL's per-target `midi-qol.isDamaged` event, checking positive HP or Temporary HP damage rather than the existence of a damage formula.
- Support returned Activity references by UUID, explicit or compact Item/Activity paths, and unique partial names.
- Add `actor`, `target`, and `self` suffixes for explicit Activity targets, while preserving the normal target selector when no suffix is supplied.
- Prevent damage reactions for missed attacks and retain eligibility for non-attack damage workflows.
