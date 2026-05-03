# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [1.0.7] - 2026-05-03

### Fixed
- CI unit test failure: updated `coerceValue('null', ...)` test to expect actual `null` (not the string `'null'`) following intentional behavior change
- E2E CI failures: removed dead `autoSizeValuesPanel()` call that caused a `ReferenceError` on every render, manifesting as a false "Error scanning directory" toast
- Playwright strict-mode violations: added `.first()` to all multi-match toast locators across `batch`, `changed-filter`, `diff-badge`, `revert`, and `presets` specs

---

## [1.0.6] - 2026-05-03

### Added
- Hover tooltip on field rows: hovering any field shows a fixed popup with the full `path = value [type]` — useful for long lines that are otherwise truncated
- Ellipsis truncation (`text-overflow: ellipsis`) on both field path and value columns — long lines no longer wrap or push content off-screen

### Changed
- Default panel max-width widened to 1440px for better readability on large screens
- Tooltip type labels now show `[list]` for YAML arrays and `[map]` for YAML objects (previously both showed `[arr]`)
- `[bool]` type label restored in tooltip display

### Fixed
- Value column no longer hidden when content exceeds panel width

---

## [1.0.5] - 2026-05-03

### Added
- **Changed field highlight**: fields that differ from their original loaded value show an amber left border
- **Changed filter**: "Changed" button in the values header filters the list to show only modified fields; auto-exits when no changed fields remain
- **Diff badge**: amber "N changes" badge in the values header; click to open a before/after diff table grouped by chart file
- **Field history popup**: clock icon on any changed field opens a per-field history with one-click restore to any previous value
- **Presets**: save the current field selection (with optional prefilled value) as a named preset; apply presets across all loaded charts in one click; magnifying-glass button shows which fields a preset contains
- **Revert selected / Undo all**: select changed fields and click "↩ Revert selected" to restore only those; with nothing selected "↩ Undo all" reverts every change across all loaded charts
- **Auto-backup (.bak)**: before the first write to any `values.yaml` the app creates a `values.bak` in the same directory; "Clean backups" button in the left panel deletes all `.bak` files created this session
- **Quoted string override**: wrapping a value in `'...'` or `"..."` forces string type regardless of the original field type (e.g. `'false'` saves as string, not boolean)
- **Boolean coercion fix**: typing `true` or `false` now always saves as YAML boolean, even when the original field was a string
- **Repo link** added to About modal
- **Playwright E2E test suite**: full coverage for batch edit, changed filter, diff badge, revert, and presets flows; mock FSAPI helper for write-back testing in CI

### Fixed
- `true`/`false` values no longer saved as strings when original field type was string
- `null` input always returns actual YAML null regardless of original field type

---

## [1.0.4] - 2026-05-02

### Fixed
- Upgraded `js-yaml` from `4.1.0` to `4.1.1` to resolve CVE prototype-pollution vulnerability
- Switched Docker build to use `package-lock.json` + `npm ci` for reproducible installs

### Changed
- Docker Hub badge added to README
- Removed obsolete demo chart folder and legacy scripts directory
- Added `.gitignore`; removed committed `node_modules` and worktree artifacts from tracking

---

## [1.0.3] - 2026-05-02

_(Tag created before cleanup commits landed — identical baseline to 1.0.2 plus partial housekeeping. Superseded by 1.0.4.)_

---

## [1.0.2] - 2026-05-02

### Changed
- App renamed from **Helm Values Viewer** to **Helm Values Editor** across UI, Docker image, and repo
- Removed `APP_NAME` environment variable and the App name field from the About modal (name is now hardcoded)

---

## [1.0.1] - 2026-05-01

### Fixed
- CI: upgraded `github/codeql-action/upload-sarif` from v3 to v4 to fix deprecation warning in release workflow

---

## [1.0.0] - 2026-05-01

First public release.

### Added
- **YAML editor mode**: toggle button on any field switches to a YAML textarea for editing list and map values directly (e.g. `[80, 443]` or `key: value`)
- Mixed-type guard: selecting a mix of string/number fields and list/map fields in the same batch shows a "Mixed selection" error
- Release CI/CD: GitHub Actions workflow builds Docker image on `v*` tags, runs Trivy security scan, pushes to Docker Hub
- Dockerfile hardened: non-root user, read-only filesystem, minimal nginx image
- Trivy scan results uploaded to GitHub Security tab (SARIF)
- Unit tests expanded to cover lib.js utilities

### Fixed
- Deep-clone YAML values per field to prevent anchor/alias contamination in output
- YAML mode textarea no longer blank on open for list/map fields
- Write-back now works correctly for standalone YAML files (not just full chart folders)

---

## [0.x] - 2026-04-17 to 2026-05-01

Initial development (pre-release).

### Added
- Browser-based Helm values editor using the File System Access API (Chrome/Edge)
- Load a Helm chart folder — scans `Chart.yaml` and `values.yaml` recursively across all subcharts
- Load a single `values.yaml` file
- `.tgz` chart archive upload support
- Chart dependency tree rendered in the left panel; click any node to view its fields
- Full-text search across all keys and values at any nesting depth with match highlighting
- Select multiple fields via checkboxes; batch-apply a new value to all selected fields with a single click
- Type coercion: numbers save as YAML numbers, booleans as booleans, `null` as null
- Session persistence: loaded charts saved to IndexedDB; banner on reopen offers one-click restore
- Chart tree filter/search with fuzzy name matching
- "Clear all" button removes all loaded charts and clears session
- "Add chart" and "Add YAML" buttons moved above the chart filter for better UX
- `lib.js` extracted as a pure utility module (`flatten`, `highlight`, `buildChartTree`, `coerceValue`, `setNestedPath`, `getNestedVal`, `valChanged`)
- 31 unit tests for `lib.js` using Node.js built-in test runner
- `APP_VERSION` environment variable sets the version shown in the About dialog
- About modal with maintainer info and GitHub link
- Fully airgapped at runtime — no external network calls
- Docker image with two-stage build (Node vendoring + nginx serving)
