FROM python:3.12-alpine AS builder

RUN pip install --no-cache-dir pyyaml

COPY scripts/extract-chart-data.py /usr/local/bin/extract-chart-data.py
RUN chmod +x /usr/local/bin/extract-chart-data.py

# ══════════════════════════════════════════════════════════════
# COPY YOUR HELM UMBRELLA CHART HERE
#
# This is the full chart directory including Chart.yaml,
# values.yaml, and the charts/ subdirectory with dependencies.
#
# Example:
#   COPY my-umbrella-chart/ /tmp/chart/
#
# The script will:
#   1. Parse Chart.yaml to find the dependency tree
#   2. Recurse into charts/ to find subcharts
#   3. Extract .tgz archives in charts/ if present
#   4. Copy each values.yaml and build a manifest.json
#
# If your subcharts are .tgz files (from helm dependency build),
# that's fine — they'll be extracted automatically.
# ══════════════════════════════════════════════════════════════
COPY chart/ /tmp/chart/

RUN python3 /usr/local/bin/extract-chart-data.py /tmp/chart /tmp/values-output

# ── Final image: just nginx serving static files ──
FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY nginx.conf              /etc/nginx/conf.d/default.conf
COPY app/index.html          /usr/share/nginx/html/index.html
COPY docker-entrypoint.sh    /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy extracted values + manifest from builder
COPY --from=builder /tmp/values-output/ /usr/share/nginx/html/values/

EXPOSE 8080

ENV APP_NAME="my app"
ENV APP_VERSION="1.0.0"

ENTRYPOINT ["/docker-entrypoint.sh"]
