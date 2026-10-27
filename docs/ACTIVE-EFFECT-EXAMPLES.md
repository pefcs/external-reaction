# External Reaction — Active Effect Examples

This pack targets Foundry VTT V14 and D&D 5e 6.0.6, with External Reaction, Midi-QoL, and socketlib enabled.

## Use the pack

1. Open **Compendium Packs → External Reaction — Practical Examples**.
2. Inspect an entry's description before dragging it onto a test actor.
3. Drag a ready-to-use Active Effect onto the actor who should own the External Reaction option.
4. Test the effect in a disposable world and remove it from the actor when finished.

The entries use D&D 5e's Active Effect document structure and Override mode for External Reaction configuration flags. Each entry uses its own optional group name so that adding multiple examples to one actor does not overwrite an unrelated group. Most entries deliberately omit `displayBonusRolls`, allowing the current Midi-QoL setting to control whether the before/after bonus card is shown. Only **Defense — Arcane Aegis** explicitly sets it to `true`, and **Check — Private Oracle's Insight** sets it to `false`, to demonstrate both kinds of per-option override.

## Coverage

The pack includes AC reactions; attack-roll bonuses including miss-only selectors and rerolls; saving-throw, ability-check, skill-check, and tool-check bonuses; the `skill.prof` / `skill.exp` and `tool.prof` / `tool.exp` activation shortcuts; the bare `self` predicate for self-only options; typed and untyped damage bonuses; critical-damage handling; activation filters based on disposition, range, visibility, hit points, target identity, proficiency, and embedded item possession; count resources using reactions, bonus actions, turn/round limits, spell slots, and ItemUses; roll-mode and bonus-card display controls; and three disabled setup templates: ActivityUses, direct Activity triggering, and the special damage-triggered Item Macro path. A fixed embedded Activity can be launched by setting `activity.trigger` to its UUID or supported Item/Activity path; an Item Macro can return an Activity reference or a supported structured result when conditional logic or dynamic selection is needed.

## Tool-check examples added in v0.11.0

- **Tool — Artisan's Precision:** Adds 1d4 to the option owner's own tool check when the Actor has proficiency or expertise in that tool. The `each-turn` count limits use to once per turn.
- **Tool — Locksmith's Gambit:** Demonstrates Thieves' Tools fail/success selectors. A numeric DC must be available for the outcome-specific options; replace the example tool identifier if your system uses a different ID.

## Important notes

- A count of `reaction`, `bonusAction`, or `spellslot X` is a resource rule. The module spends the relevant resource according to its normal acceptance/counting behavior.
- Item-dependent examples use exact embedded Item names such as `Shield`, `Spellbook`, `Disguise Kit`, and `Wand of Magic Missiles`. Rename the reference or item if your actor uses a different name.
- The `ItemUses.Wand of Magic Missiles` example requires that exact item and an available uses pool.
- The success-phase reroll example changes an already-successful attack; use it only where a higher/lower result can matter under your rules or feature design.
- The three entries beginning with **Template** are disabled intentionally until configured for the receiving Actor: ActivityUses cost configuration, a direct Activity trigger reference, and damage-triggered Item Macro configuration. The direct Activity template demonstrates launching one fixed embedded Activity without a macro; use the Item Macro route for dynamic or conditional selection.
- Activation conditions use the actual workflow context: `target` is the action recipient, `actor` the initiating actor, and `self` the actor owning the option. Range predicates require available tokens and use Midi-QoL's measurement behavior.
- These are practical configuration examples, not rules text from a D&D book. Test them in a disposable world before using them in your live campaign.
