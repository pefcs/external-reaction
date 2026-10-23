# Maintainer notes

## Before changing code

1. Work on a copy of the Foundry world.
2. Make one logically related change at a time.
3. Test the behavior affected by the change, then run the checklist in `TESTING.md` for adjacent features.
4. Keep logs, stack traces, and test results in the commit or release notes when they help explain the change. Do not commit world backups, player data, API keys, or other private files.

## Versioning

The manifest uses semantic versioning in `module.json` as `MAJOR.MINOR.PATCH` without a leading `v`. GitHub tags and releases use a leading `v`.

| Change | Version example | Guidance |
|---|---|---|
| Bug fix or documentation correction that does not add a feature | `0.9.5` → `0.9.6` | Increment PATCH. |
| New backward-compatible feature | `0.9.5` → `0.10.0` | Increment MINOR and reset PATCH to `0`. |
| Breaking change or planned stable major release | `0.x.y` → `1.0.0` | Increment MAJOR and reset the other numbers to `0`. |

Before `1.0.0`, the public interface may still evolve, so document behavior changes clearly. Once a version has been released, do not reuse that version or move its release tag. For another fix, increment the version again.

## Releasing

1. Make and test the code change.
2. Update `CHANGELOG.md`.
3. Change `version` in `module.json` to the new version.
4. Commit the code, changelog, and manifest together.
5. Push the commit to `main`.
6. Open the repository's **Actions** tab and check the workflow run. When the manifest version changed, a successful run creates a matching `v<version>` GitHub Release with both `module.json` and `module.zip` attached.
7. Check the release asset and test that ZIP in Foundry before telling users to update.

If the version did not change, Actions still builds a ZIP artifact for testing but does not publish a release. Download the artifact from the successful workflow run if you want to test an unreleased change.

## Code style

- Keep two-space indentation, UTF-8 text, LF line endings, and a final newline.
- Prefer descriptive names and small helpers for code that is reused or has non-obvious side effects.
- Comment on the reason for a workaround, especially when it relies on Foundry or Midi-QoL internals. Avoid comments that merely restate the next line.
- Keep user-visible documentation aligned with the code and note any known compatibility limitation.
- Do not claim a feature is live-tested based only on a syntax check or successful ZIP build.

## Pull requests and issues

When reporting a problem, include Foundry core, D&D 5e, and Midi-QoL versions; the minimal flag configuration; expected and actual behavior; the relevant console error; and whether the issue can be reproduced in a clean test world.
