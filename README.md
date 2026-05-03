# Helm Values Editor

[![Docker Hub](https://img.shields.io/docker/v/sokushinbutsu/helm-values-editor?sort=semver&label=docker&logo=docker)](https://hub.docker.com/r/sokushinbutsu/helm-values-editor)
[![GitHub](https://img.shields.io/badge/github-helm--values--editor-blue?logo=github)](https://github.com/seab4ng/helm-values-editor)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A browser-based editor for Helm chart `values.yaml` files. Open a chart folder, search for any field, change values, and save back to disk — no terminal needed.

> **Requires Chrome or Edge** (uses the browser's File System Access API to read and write files).

---

## Quick start

```bash
docker run -p 8080:8080 sokushinbutsu/helm-values-editor:latest
```

Open **http://localhost:8080** in Chrome or Edge.

---

## Usage

### 1. Load a chart

Click **+ Add chart folder** and pick your Helm chart directory.
The app reads `Chart.yaml` and `values.yaml` from the root chart and all subcharts automatically.

> Don't have a full chart? Click **+ Add YAML file** to load a single `values.yaml`.

The left panel shows the chart tree. Click any chart name to view its fields.

---

### 2. Find fields

Use the search box to filter fields by name or value.

```
Search: "replica"  →  shows replicaCount, autoscaling.minReplicas, etc.
```

Hover over any field row to see the full path and value in a popup (useful for long lines).

---

### 3. Change values

1. Check the box next to one or more fields.
2. A bar appears at the top of the values panel.
3. Type the new value and click **Apply**.

```
Field: replicaCount   Current: 1
→ check box, type "3", click Apply  →  saved as number 3
```

**Type rules:**
| You type | Saved as |
|---|---|
| `3` (for a number field) | number `3` |
| `true` or `false` | boolean |
| `null` | null |
| `'false'` or `"false"` (quoted) | string `false` |
| anything else | string |

For **list** or **map** fields, click **YAML** to switch to YAML input mode:
```yaml
# list example
- nginx
- alpine

# map example
app: frontend
env: production
```

> You can select multiple fields and apply the same value to all of them at once.
> Mixing field types (e.g. a string field + a list field) in the same batch is not allowed — select one type at a time.

---

### 4. Review and revert changes

**Changed fields** get an amber left border so they stand out.

- Click **Changed** to filter the list and show only changed fields.
- Click the amber **N changes** badge to open a full before/after diff table.
- Click the clock icon on any changed field to see its full edit history.

**To undo:**
- Select specific fields → click **↩ Revert selected** to restore only those.
- Select nothing → click **↩ Undo all** to restore every changed field across all loaded charts.

---

### 5. Presets

Presets let you save a group of fields (with an optional prefilled value) and apply them in one click — useful for fields you change often.

**Save a preset:**
1. Check the fields you want to include.
2. *(Optional)* Type a default value in the new-value box.
3. Click **Presets** → enter a name → click **Save**.

**Apply a preset:**
1. Click **Presets**.
2. Click **Apply** next to the preset name.
   All preset fields get selected and, if a value was saved, it's filled in automatically.

Click the magnifying-glass icon on a preset to see which fields it contains. Click the trash icon to delete it.

---

### 6. Backups and cleanup

Before the **first write** to any `values.yaml`, the app automatically creates a `values.bak` file in the same folder.

If you want to remove all backup files created this session, click **Clean backups** in the left panel.

---

### 7. Session restore

If you close and reopen the browser, a banner offers to restore your previously loaded charts. Click **Restore session** to reload them without picking folders again.

---

## Features at a glance

| Feature | Description |
|---|---|
| Chart folder + subchart tree | Loads root chart and all subcharts in one go |
| Single YAML file | Load any `values.yaml` without a full chart |
| Full-text search | Filter fields by key or value at any nesting depth |
| Batch edit | Select multiple fields, type once, apply to all |
| YAML mode | Edit list and map fields using raw YAML syntax |
| Type coercion | Booleans, numbers, nulls saved with correct YAML types |
| Quoted string override | Wrap value in `'...'` or `"..."` to force string type |
| Changed highlight + filter | Amber border on changed fields; filter to show only them |
| Diff view | Before/after table for all changes grouped by chart |
| Field history | Per-field edit history with one-click restore |
| Revert selected / Undo all | Restore any field or all fields to original values |
| Presets | Save and apply named field selections across charts |
| Auto-backup | Creates `.bak` before first write; clean up in one click |
| Session persistence | Restore previously loaded charts on next open |
| Hover tooltip | Full path + value popup for long/truncated fields |
| Fully airgapped | No external network calls at runtime |

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `APP_VERSION` | tag at build time | Version shown in the About dialog |

```bash
docker run -p 8080:8080 -e APP_VERSION="1.0.7" sokushinbutsu/helm-values-editor:latest
```

---

## Build from source

```bash
git clone https://github.com/seab4ng/helm-values-editor.git
cd helm-values-editor
docker build -t helm-values-editor .
docker run -p 8080:8080 helm-values-editor
```

---

## Run tests

```bash
node --test tests/unit.js
```

---

## CI / CD

A GitHub Actions workflow runs on every version tag (`v*`):

1. Runs the full unit test suite.
2. If tests pass, builds the Docker image and pushes to Docker Hub as `sokushinbutsu/helm-values-editor:<tag>` and `latest`.

To release:
```bash
git tag v1.2.3
git push origin v1.2.3
```

Required secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

---

## Contributing

- `app/index.html` — all frontend logic (single file, no build step)
- `app/lib.js` — pure utility functions (flatten, coerce, search, chart tree)
- `tests/unit.js` — unit tests for lib.js
- `Dockerfile` — two-stage build: node for vendoring js-yaml, nginx for serving

Fork, make changes, run tests, open a PR.
