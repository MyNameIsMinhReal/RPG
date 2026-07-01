# Legacy one-off maintenance scripts

These scripts were used during manual refactors. **Do not run** unless you know what they patch.

| Script | Purpose |
|--------|---------|
| `patch_explore_strings.js` | One-time fix for template literal syntax in `explore.ts` embed strings |
| `fix-imports.js` | Strip `.js` extensions from TypeScript import paths under `src/` |

If you need similar bulk edits, prefer a dedicated migration PR with tests rather than re-running these scripts.
