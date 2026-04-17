#!/usr/bin/env python3
"""
extract-chart-data.py

Walks a Helm umbrella chart directory, discovers the dependency tree
from Chart.yaml files, extracts values.yaml from each chart/subchart,
and produces a manifest.json for the UI.

Usage:
  python3 extract-chart-data.py /path/to/umbrella-chart /output/dir

Output manifest.json structure:
{
  "root": "my-umbrella",
  "charts": {
    "my-umbrella": {
      "name": "my-umbrella",
      "version": "1.0.0",
      "description": "...",
      "dependencies": ["argo-cd", "redis"],
      "values_file": "my-umbrella.yaml"
    },
    "argo-cd": {
      "name": "argo-cd",
      "version": "5.46.0",
      "description": "...",
      "dependencies": ["redis"],
      "parent": "my-umbrella",
      "values_file": "argo-cd.yaml"
    },
    ...
  }
}
"""

import json
import os
import shutil
import sys
import tarfile
import glob

try:
    import yaml
except ImportError:
    # Fallback: try to parse simple YAML manually
    yaml = None


def parse_yaml_simple(path):
    """Minimal YAML parser for Chart.yaml - handles basic key:value and lists."""
    if yaml:
        with open(path, 'r') as f:
            return yaml.safe_load(f) or {}

    result = {}
    current_list_key = None
    current_item = {}

    with open(path, 'r') as f:
        for line in f:
            stripped = line.rstrip()
            if not stripped or stripped.startswith('#'):
                continue

            indent = len(line) - len(line.lstrip())

            if indent == 0 and ':' in stripped:
                if current_list_key and current_item:
                    result.setdefault(current_list_key, []).append(current_item)
                    current_item = {}
                current_list_key = None
                key, _, val = stripped.partition(':')
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if val:
                    result[key] = val
                else:
                    current_list_key = key

            elif stripped.lstrip().startswith('- ') and current_list_key:
                if current_item:
                    result.setdefault(current_list_key, []).append(current_item)
                current_item = {}
                item_content = stripped.lstrip()[2:]
                if ':' in item_content:
                    k, _, v = item_content.partition(':')
                    current_item[k.strip()] = v.strip().strip('"').strip("'")

            elif indent > 0 and ':' in stripped and current_list_key:
                k, _, v = stripped.strip().partition(':')
                current_item[k.strip()] = v.strip().strip('"').strip("'")

    if current_list_key and current_item:
        result.setdefault(current_list_key, []).append(current_item)

    return result


def extract_tgz_charts(charts_dir):
    """Extract any .tgz archives in the charts/ directory."""
    if not os.path.isdir(charts_dir):
        return
    for tgz in glob.glob(os.path.join(charts_dir, '*.tgz')):
        try:
            with tarfile.open(tgz, 'r:gz') as tar:
                tar.extractall(path=charts_dir)
            print(f"  Extracted: {os.path.basename(tgz)}")
        except Exception as e:
            print(f"  Warning: failed to extract {tgz}: {e}")


def discover_chart(chart_dir, output_dir, parent=None, manifest=None):
    """Recursively discover a chart and its dependencies."""
    if manifest is None:
        manifest = {"root": None, "charts": {}}

    chart_yaml_path = os.path.join(chart_dir, 'Chart.yaml')
    values_yaml_path = os.path.join(chart_dir, 'values.yaml')

    if not os.path.isfile(chart_yaml_path):
        print(f"  Skipping {chart_dir}: no Chart.yaml")
        return manifest

    # Parse Chart.yaml
    chart_meta = parse_yaml_simple(chart_yaml_path)
    chart_name = chart_meta.get('name', os.path.basename(chart_dir))

    print(f"  Found chart: {chart_name} (in {chart_dir})")

    # Set root
    if parent is None:
        manifest["root"] = chart_name

    # Extract dependency names
    deps = chart_meta.get('dependencies', [])
    dep_names = []
    if isinstance(deps, list):
        for d in deps:
            if isinstance(d, dict) and 'name' in d:
                dep_name = d.get('alias', d['name'])
                dep_names.append(dep_name)

    # Build chart entry
    entry = {
        "name": chart_name,
        "version": chart_meta.get('version', ''),
        "description": chart_meta.get('description', ''),
        "dependencies": dep_names,
    }
    if parent:
        entry["parent"] = parent

    # Copy values.yaml if it exists
    if os.path.isfile(values_yaml_path):
        values_filename = f"{chart_name}.yaml"
        shutil.copy2(values_yaml_path, os.path.join(output_dir, values_filename))
        entry["values_file"] = values_filename
        print(f"    Copied values.yaml → {values_filename}")
    else:
        entry["values_file"] = None
        print(f"    No values.yaml found")

    manifest["charts"][chart_name] = entry

    # Recurse into charts/ subdirectory for dependencies
    charts_subdir = os.path.join(chart_dir, 'charts')
    if os.path.isdir(charts_subdir):
        # First extract any .tgz archives
        extract_tgz_charts(charts_subdir)

        # Then recurse into subdirectories
        for item in sorted(os.listdir(charts_subdir)):
            item_path = os.path.join(charts_subdir, item)
            if os.path.isdir(item_path) and os.path.isfile(os.path.join(item_path, 'Chart.yaml')):
                discover_chart(item_path, output_dir, parent=chart_name, manifest=manifest)

    return manifest


def main():
    if len(sys.argv) < 3:
        print("Usage: extract-chart-data.py <chart-dir> <output-dir>")
        sys.exit(1)

    chart_dir = sys.argv[1]
    output_dir = sys.argv[2]

    if not os.path.isdir(chart_dir):
        print(f"Error: chart directory not found: {chart_dir}")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    print(f"Scanning chart: {chart_dir}")
    print(f"Output dir: {output_dir}")
    print()

    manifest = discover_chart(chart_dir, output_dir)

    # Write manifest
    manifest_path = os.path.join(output_dir, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    chart_count = len(manifest['charts'])
    print(f"\nDone! Extracted {chart_count} chart(s)")
    print(f"Manifest: {manifest_path}")


if __name__ == '__main__':
    main()
