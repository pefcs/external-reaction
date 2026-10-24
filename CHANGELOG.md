# Changelog

Notable changes for each release are recorded here. GitHub also generates release notes when a new version is published.
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
