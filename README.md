# External Reaction

External Reaction extends Midi-QoL-style optional roll bonuses so a creature on the active scene can react to another creature's attack, saving throw, ability check, skill check, damage roll, or incoming attack's AC check.

The module is designed for **Foundry Virtual Tabletop V14**, **D&D 5e 6.0.6+**, **Midi-QoL**, and **socketlib**.

## Development version 0.10.0

This development build adds workflow-event activation flags (`cast`, `attack`, attack types, saves/checks/skills and related activity flags), an `activity.trigger = itemMacro` interception path, and structured resource receipts for selected spell slots and ItemUses/ActivityUses counts. Item macros can continue the original workflow, cancel it, or request another Activity.

**Important:** `itemMacro` interception currently uses Midi-QoL's `preItemRoll` hook. This hook runs before the initiating item's normal resource consumption. Returning `cancel` aborts the workflow at this stage, so spells such as 2014 Counterspell still need an explicit, tested way to preserve the interrupted caster's spell-slot consumption if rules-accurate slot use is required. Do not treat this development build as finished Counterspell automation until that case is tested.

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

