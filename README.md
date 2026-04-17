# Helm Values Viewer

A self-contained web UI that renders the dependency tree of a Helm umbrella chart and lets you live-search all `values.yaml` files across every chart and subchart. Values are baked into the Docker image at build time — no cluster connection or Helm binary needed at runtime.

## Project structure

```
helm-values-viewer/
├── Dockerfile
├── nginx.conf
├── docker-entrypoint.sh          # Replaces __APP_NAME__ / __APP_VERSION__ at container start
├── app/
│   ├── index.html                # Single-page app (IIFE, no build step)
│   └── lib.js                    # Pure/testable helpers: flatten, esc, highlight,
│                                 #   displayName, dirOf, buildChartTree (UMD module)
├── scripts/
│   └── extract-chart-data.py     # Build-time: walks chart tree, extracts values
├── tests/
│   └── unit.js                   # Node.js unit tests (node:test, no extra deps)
└── chart/                        # <- COPY YOUR UMBRELLA CHART HERE
    ├── Chart.yaml
    ├── values.yaml
    └── charts/
        ├── argo-cd/
        │   ├── Chart.yaml
        │   ├── values.yaml
        │   └── charts/
        │       └── redis/
        │           ├── Chart.yaml
        │           └── values.yaml
        └── cert-manager/
            ├── Chart.yaml
            └── values.yaml
```

## How it works

**At docker build time:**

1. The `chart/` directory (your umbrella chart) is copied into the builder stage.
2. `extract-chart-data.py` walks the chart recursively:
   - Parses each `Chart.yaml` to discover the dependency tree.
   - Extracts `values.yaml` from each chart and subchart.
   - Handles `.tgz` archives in `charts/` (produced by `helm dependency build`).
   - Produces `manifest.json` describing the full tree structure.
3. The final nginx image contains only the static app (`index.html`, `lib.js`) plus the extracted values — no Python, no Helm binary.

**At runtime:**

- `docker-entrypoint.sh` substitutes `__APP_NAME__` and `__APP_VERSION__` placeholders in `index.html` before nginx starts.
- The UI fetches `manifest.json` and renders the dependency tree in the left panel.
- Clicking any chart loads its flattened values on the right.
- Live search filters by key path or value as you type.
- Users can add extra values files or whole chart archives directly in the browser — nothing is persisted server-side.

## Usage

### 1. Replace the example chart with yours

```bash
# Remove the example chart
rm -rf chart/

# Option A: copy a chart that already has its dependencies resolved
cp -r /path/to/my-umbrella-chart chart/

# Option B: resolve dependencies first
cp -r /path/to/my-umbrella-chart chart/
cd chart/ && helm dependency build && cd ..
```

### 2. Build

```bash
docker build -t helm-values-viewer .
```

### 3. Run

```bash
docker run -p 8080:8080 helm-values-viewer
```

Open http://localhost:8080

### 4. Custom name and version via environment variables

```bash
docker run -e APP_NAME="My Platform" -e APP_VERSION="2.0.0" -p 8080:8080 helm-values-viewer
```

The values appear in the header of the UI.

## Runtime features

- **Tree navigation** — left panel shows the full dependency tree; click any node to view its values.
- **Subchart values** — selecting a parent chart also shows all descendant values, grouped by chart.
- **Search** — type `image`, `port`, `replica`, etc. to filter keys and values across all visible charts in real time.
- **Add values file** — upload or paste a single `values.yaml`; it appears as a standalone entry with no subchart tree.
- **Add chart** — upload a chart folder (via the directory picker) or a `.tgz` archive; the app discovers all subcharts and builds the full dependency tree in the browser without any server round-trip.

## Running tests

Requires Node.js 18 or later. No extra dependencies.

```bash
node --test tests/unit.js
```

The test file covers `flatten`, `esc`, `highlight`, `displayName`, `dirOf`, and `buildChartTree` (including error cases, subchart discovery, namespace post-processing, and the `rootFallback` path).

## CI/CD

```bash
# Resolve chart dependencies and build
cp -r ../my-umbrella-chart helm-values-viewer/chart/
cd helm-values-viewer/chart && helm dependency build && cd ..

# Build and push
docker build -t registry.internal/helm-values-viewer:${TAG} .
docker push registry.internal/helm-values-viewer:${TAG}
```

## Notes

- Only `Chart.yaml` and `values.yaml` are extracted at build time — templates and other files are ignored.
- `.tgz` subchart archives in `charts/` are extracted automatically during the build.
- The final image is based on `nginx:1.27-alpine` (~25 MB). No Python interpreter is present at runtime.
- Subcharts can be nested to any depth.
- nginx listens on port 8080 (not 80).
