# External Reaction

External Reaction extends Midi-QoL-style optional roll bonuses so a creature on the active scene can react to another creature's attack, saving throw, ability check, skill check, damage roll, or incoming attack's AC check.

The module is designed for **Foundry Virtual Tabletop V14**, **D&D 5e 6.0.6+**, **Midi-QoL**, and **socketlib**.

## Current version

The source in this repository starts from **v0.9.5**, which includes optional attack/save/check/skill/damage/AC reactions, Midi-QoL activation conditions, actor/item helpers, triggered D&D 5e Activities, spell-slot payment with level selection (including Pact Magic), resource-count protection, and Midi-QoL-level-aware logging.

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

