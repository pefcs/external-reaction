# External Reaction

External Reaction extends Midi-QoL-style optional roll bonuses so a creature on the active scene can react to another creature's attack, saving throw, ability check, skill check, damage roll, or incoming attack's AC check.

The module is designed for **Foundry Virtual Tabletop V14**, **D&D 5e 6.0.6+**, **Midi-QoL**, and **socketlib**.

## Development version 0.10.4

This development build adds workflow-event activation flags (`cast`, `attack`, attack types, saves/checks/skills and related activity flags), an `activity.trigger = itemMacro` interception path with configurable Midi-QoL macro passes, and structured resource receipts for selected spell slots and ItemUses/ActivityUses counts. Item Macros can continue the original workflow, abort its remaining stages, or request another Activity.


**Version 0.10.2 Item Macro source fix:** the prior beta could not locate the transferred effect's source Item in some cases and only read the legacy `flags.itemacro.macro` field. This build also searches the reactor Actor's embedded Items for the Item containing the matching External Reaction Active Effect and reads DAE/DIME `flags.dae.macro` before falling back to `flags.itemacro.macro`.

**Version 0.10.4 stage fixes:** the module now resolves Midi-QoL V14's legacy `preItemRoll` hook payload through `config.workflow` and also listens to `preItemRollV2`. A workflow-state guard ensures that cancelling `postSave` transitions to Abort before the later damage-application state. `preDamageRoll` cancellation still needs a final in-world confirmation: Midi-QoL's cancellable pre-damage hook should prevent the roll itself, so if a roll is still produced we need the corresponding log to see which path is rolling it.

**Version 0.10.3 workflow fixes:** cancellation at `preAttackRoll` now marks the live workflow aborted without returning `false` into Midi-QoL's AttackActivity fallback, which otherwise falls through to the core D&D5e roll configurator. When an Item Macro launches an Activity from its own Item, External Reaction now suppresses that same Item's normal on-use ItemMacro invocation for the nested Activity and restores the user's prior target selection when the Activity finishes.

**Important Item Macro setup rule:** keep the macro command stored on the source Item (DAE/DIME Item Macro or legacy Item Macro storage), but do **not** also assign `ItemMacro` to any Midi-QoL On Use Macro stage on that same Item when External Reaction is configured to invoke it. External Reaction runs the macro at its own configured stage; registering it with Midi-QoL as well can run it a second time, especially when the returned Activity uses that Item.

**0.10.1 regression fix:** The beta's pre-targeting integration could return the dispatcher's internal `false` result to Midi-QoL, which aborts an item use. The hook now installs the dispatcher without returning that value; actions without a matching external Item Macro should proceed normally.

**Important:** A bare `ItemMacro` defaults to `postActiveEffects`, as External Reaction's configured default for a bare trigger. You can select another stage, such as `ItemMacro, postAttackRoll`, when you need the reaction earlier. Cancellation does not undo work already completed: at `postAttackRoll`, the attack roll and hit/miss result remain visible, while damage has not yet been rolled. Other late stages may already have applied damage or effects. Some documented Midi passes are deliberately excluded if they are not reliable cancellation points. A rules-accurate 2014 Counterspell setup still needs an explicit, tested way to preserve the interrupted caster's spell-slot consumption if required.

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

