# External Reaction

External Reaction extends Midi-QoL-style optional roll bonuses so a creature on the active scene can react to another creature's attack, saving throw, ability check, skill check, damage roll, or incoming attack's AC check.

The module is designed for **Foundry Virtual Tabletop V14**, **D&D 5e 6.0.6+**, **Midi-QoL**, and **socketlib**.

## Development version 0.10.0

This development build adds workflow-event activation flags (`cast`, `attack`, attack types, saves/checks/skills and related activity flags), an `activity.trigger = itemMacro` interception path with configurable Midi-QoL macro passes, and structured resource receipts for selected spell slots and ItemUses/ActivityUses counts. Item Macros can continue the original workflow, abort its remaining stages, or request another Activity.

**Important:** `itemMacro` defaults to `preItemRoll`, but can use later stages such as `ItemMacro, postAttackRoll`. Cancellation does not undo work already completed: at `postAttackRoll`, the attack roll and hit/miss result remain visible, while damage has not yet been rolled. Other late stages may already have applied damage or effects. Some documented Midi passes are deliberately excluded if they are not reliable cancellation points. A rules-accurate 2014 Counterspell setup still needs an explicit, tested way to preserve the interrupted caster's spell-slot consumption if required.

## Documentation

- [Technical reference](docs/REFERENCE.md) — supported flags, selectors, activation expressions, resource counts, spell slots, and triggered Activities.
- [Testing checklist](TESTING.md) — regression scenarios for the behaviors that need to remain correct.
- [Changelog](CHANGELOG.md) — release history and future changes.
- [Maintainer contribution notes](CONTRIBUTING.md) — versioning, safe testing, and release workflow.

## Installation in Foundry

After the repository is published, install the module using its stable manifest URL:

`https://github.com/pefcs/external-reaction/releases/latest/download/module.json`

The module manifest points to the ZIP asset attached to the latest GitHub Release, so normal module updates can use Foundry's update checker.

You can also download `module.zip` from the [Releases](https://github.com/pefcs/external-reaction/releases) page and install it manually.

