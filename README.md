# Helm Values Editor

A browser-based editor for Helm chart values files. Load a chart folder or standalone values.yaml, search across all keys and nested fields, select values to change, and write the new values back to disk — without touching the terminal.

## Features

- Load a Helm chart folder (with subchart tree) or a single values.yaml
- Full-text search across all keys and values at any nesting depth
- Select multiple fields and batch-edit them to a new value
- YAML mode for editing list and map fields
- Changes write back to the actual files on disk (File System Access API)
- Session persistence — reopen the browser and restore your loaded charts
- Fully airgapped — no external network calls at runtime

## Requirements

- Chrome or Edge (File System Access API required for folder/file access)
- Docker (to run the container) or any static file server

## Quick start

```bash
docker run -p 8080:8080 sokushinbutsu/helm-values-editor:latest
```

Open http://localhost:8080 in Chrome or Edge.

## Usage

1. Click **+ Add chart folder** and select a Helm chart directory. The app scans Chart.yaml and values.yaml recursively across all subcharts.
2. Or click **+ Add YAML file** to load a single values.yaml.
3. Use the search box to find any key or value across all loaded charts.
4. Check the boxes next to the fields you want to change.
5. Type a new value and click **Apply to selected fields**.
   - For string, number, or boolean fields: type the value directly.
   - For list or map fields: click **YAML** to switch to YAML input mode (e.g. `[80, 443]` or `key: value`).
6. Changes are written back to the files on disk immediately.

> Note: mixing field types (strings, lists, maps) in the same batch is not allowed. Select one type at a time.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `my app` | Display name shown in the About dialog |
| `APP_VERSION` | tag at build time | Version shown in the About dialog |

Example with custom values:
```bash
docker run -p 8080:8080 -e APP_NAME="Platform Tools" -e APP_VERSION="2.1.0" sokushinbutsu/helm-values-editor:latest
```

## Build from source

```bash
git clone https://github.com/seab4ng/helm-values-veiwer.git
cd helm-values-veiwer
docker build -t helm-values-editor .
docker run -p 8080:8080 helm-values-editor
```

## Run tests

No dependencies required. Tests use Node.js built-in test runner.

```bash
node --test tests/unit.js
```

Test results are also published to GitHub Actions on every release.

## CI / CD

A GitHub Actions workflow runs on every version tag (`v*`):

1. Runs the full unit test suite and publishes results to the Actions check run.
2. If tests pass, builds the Docker image and pushes to Docker Hub as `sokushinbutsu/helm-values-editor:<tag>` and `latest`.

To release a new version, create a tag:
```bash
git tag v1.2.3
git push origin v1.2.3
```

Required repository secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

## Contributing

- `app/index.html` — all frontend logic (single IIFE, no build step)
- `app/lib.js` — pure utility functions (flatten, highlight, buildChartTree, etc.)
- `tests/unit.js` — unit tests for lib.js
- `Dockerfile` — two-stage build: node for vendoring js-yaml, nginx for serving
- `nginx.conf` — static file serving config

Fork the repo, make changes, run `node --test tests/unit.js`, open a PR.
