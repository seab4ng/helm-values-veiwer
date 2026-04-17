# Helm Values Viewer

Web UI that shows the **dependency tree** of your Helm umbrella chart and lets you **live-search all values.yaml** files across every chart and subchart.

No volumes, no cluster connection. Values are baked into the Docker image at build time.

## Project structure

```
helm-values-viewer/
├── Dockerfile
├── nginx.conf
├── app/
│   └── index.html                # The entire web app
├── scripts/
│   └── extract-chart-data.py     # Build-time: walks chart tree, extracts values
└── chart/                        # ← COPY YOUR UMBRELLA CHART HERE
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

At **docker build** time:

1. The `chart/` directory (your umbrella chart) is copied into the builder stage
2. `extract-chart-data.py` walks the chart recursively:
   - Parses each `Chart.yaml` to discover the dependency tree
   - Extracts `values.yaml` from each chart/subchart
   - Handles `.tgz` archives in `charts/` (from `helm dependency build`)
   - Produces `manifest.json` with the tree structure
3. The final nginx image contains only the static app + extracted values

At **runtime**:

- The UI loads `manifest.json` and renders the dependency tree on the left
- Click any chart to see its values, or "All charts" to search across everything
- Live search filters by key path or value as you type
- Users can still add more values files via the browser

## Usage

### 1. Replace the example chart with yours

```bash
# Remove the example
rm -rf chart/

# Option A: copy your umbrella chart (with dependencies already in charts/)
cp -r /path/to/my-umbrella-chart chart/

# Option B: use helm dependency build first
cp -r /path/to/my-umbrella-chart chart/
cd chart/ && helm dependency build && cd ..
```

### 2. Build

```bash
docker build -t helm-values-viewer .
```

### 3. Run

```bash
docker run -d -p 8080:8080 helm-values-viewer
```

Open http://localhost:8080

## CI/CD integration

```bash
# Copy the chart with resolved dependencies
cp -r ../my-umbrella-chart helm-values-viewer/chart/
cd helm-values-viewer/chart && helm dependency build && cd ..

# Build and push
docker build -t registry.internal/helm-values-viewer:${TAG} .
docker push registry.internal/helm-values-viewer:${TAG}
```

## What the UI shows

- **Left panel**: dependency tree (my-platform → argo-cd → redis, cert-manager)
- **Right panel**: flattened values with full dotted paths
- **Search**: type `image` → see `server.image.repository`, `redis.image.tag`, etc.
- **Built-in badge**: charts from the Docker image are tagged, can't be cleared
- **Add button**: users can upload/paste additional values at runtime

## Notes

- Only `Chart.yaml` and `values.yaml` are extracted — templates and other files are ignored
- `.tgz` subchart archives are automatically extracted during build
- The final image is just nginx (~25MB) — no Python, no Helm in the runtime image
- Subcharts can be nested to any depth
