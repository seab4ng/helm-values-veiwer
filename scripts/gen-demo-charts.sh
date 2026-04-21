#!/bin/bash
# Generate a demo subchart tree under chart/charts/ for the example umbrella.
# Idempotent — rerunning overwrites existing demo subcharts.
set -e

ROOT="${1:-chart}"

mk_chart() {
  mkdir -p "$1"
  cat > "$1/Chart.yaml" <<YAML
apiVersion: v2
name: $2
version: $3
description: $4
type: application
YAML
}

mk_chart_with_deps() {
  mkdir -p "$1"
  {
    echo "apiVersion: v2"
    echo "name: $2"
    echo "version: $3"
    echo "description: $4"
    echo "type: application"
    echo "dependencies:"
    shift 4
    for dep in "$@"; do
      depname="${dep%:*}"
      depver="${dep##*:}"
      echo "  - name: $depname"
      echo "    version: $depver"
    done
  } > "$1/Chart.yaml"
}

mk_values() {
  printf '%s\n' "$2" > "$1/values.yaml"
}

# ─────────── istio-base ───────────
mk_chart_with_deps "$ROOT/charts/istio-base" istio-base 1.20.0 "Istio base CRDs and shared configuration" "istio-cni:1.20.0"
mk_values "$ROOT/charts/istio-base" "global:
  hub: docker.io/istio
  tag: 1.20.0
  meshId: mesh1
pilot:
  enabled: false"

mk_chart "$ROOT/charts/istio-base/charts/istio-cni" istio-cni 1.20.0 "Istio CNI plugin for sidecar injection"
mk_values "$ROOT/charts/istio-base/charts/istio-cni" "cni:
  chained: true
  logLevel: info
  excludeNamespaces:
    - kube-system
    - istio-system
resources:
  requests:
    cpu: 100m
    memory: 100Mi"

# ─────────── istio-control + pilot + citadel + pilot-discovery ───────────
mk_chart_with_deps "$ROOT/charts/istio-control" istio-control 1.20.0 "Istio control plane (pilot + citadel)" "pilot:1.20.0" "citadel:1.20.0"
mk_values "$ROOT/charts/istio-control" "global:
  proxy:
    image: proxyv2
    logLevel: warning
meshConfig:
  enableTracing: true
  accessLogFile: /dev/stdout"

mk_chart_with_deps "$ROOT/charts/istio-control/charts/pilot" pilot 1.20.0 "Istio Pilot - service discovery and traffic management" "pilot-discovery:1.20.0"
mk_values "$ROOT/charts/istio-control/charts/pilot" "replicaCount: 2
image:
  repository: docker.io/istio/pilot
  tag: 1.20.0
resources:
  requests:
    cpu: 500m
    memory: 2Gi
autoscaleEnabled: true
autoscaleMin: 1
autoscaleMax: 5"

mk_chart "$ROOT/charts/istio-control/charts/pilot/charts/pilot-discovery" pilot-discovery 1.20.0 "Pilot discovery component - endpoint discovery service"
mk_values "$ROOT/charts/istio-control/charts/pilot/charts/pilot-discovery" "discovery:
  address: istiod.istio-system.svc:15012
  timeout: 30s
  maxConnections: 1000"

mk_chart "$ROOT/charts/istio-control/charts/citadel" citadel 1.20.0 "Istio Citadel - certificate authority"
mk_values "$ROOT/charts/istio-control/charts/citadel" "enabled: true
selfSigned: true
workloadCertTtl: 24h
maxWorkloadCertTtl: 7d"

# ─────────── monitoring-stack ───────────
mk_chart_with_deps "$ROOT/charts/monitoring-stack" monitoring-stack 2.5.0 "Prometheus + Grafana + Alertmanager bundle" "prometheus:2.51.0" "grafana:10.4.0" "alertmanager:0.27.0" "node-exporter:1.7.0"
mk_values "$ROOT/charts/monitoring-stack" "global:
  scrapeInterval: 30s
  evaluationInterval: 30s
  retention: 15d
namespace: monitoring"

mk_chart_with_deps "$ROOT/charts/monitoring-stack/charts/prometheus" prometheus 2.51.0 "Prometheus time-series database" "prometheus-storage:2.51.0"
mk_values "$ROOT/charts/monitoring-stack/charts/prometheus" "server:
  replicas: 2
  retention: 15d
  image:
    repository: prom/prometheus
    tag: v2.51.0
  resources:
    requests:
      cpu: 500m
      memory: 2Gi"

mk_chart "$ROOT/charts/monitoring-stack/charts/prometheus/charts/prometheus-storage" prometheus-storage 2.51.0 "Prometheus persistent storage config"
mk_values "$ROOT/charts/monitoring-stack/charts/prometheus/charts/prometheus-storage" "persistentVolume:
  enabled: true
  size: 50Gi
  storageClass: fast-ssd
  accessModes:
    - ReadWriteOnce"

mk_chart_with_deps "$ROOT/charts/monitoring-stack/charts/grafana" grafana 10.4.0 "Grafana dashboards" "grafana-image-renderer:3.9.0"
mk_values "$ROOT/charts/monitoring-stack/charts/grafana" "replicas: 2
image:
  repository: grafana/grafana
  tag: 10.4.0
adminUser: admin
adminPassword: admin
persistence:
  enabled: true
  size: 10Gi
plugins:
  - grafana-piechart-panel
  - grafana-clock-panel"

mk_chart "$ROOT/charts/monitoring-stack/charts/grafana/charts/grafana-image-renderer" grafana-image-renderer 3.9.0 "Grafana image renderer for PDFs and PNGs"
mk_values "$ROOT/charts/monitoring-stack/charts/grafana/charts/grafana-image-renderer" "replicas: 1
image:
  repository: grafana/grafana-image-renderer
  tag: 3.9.0
service:
  port: 8081
env:
  RENDERING_VERBOSE_LOGGING: false
  RENDERING_TIMING_METRICS: true"

mk_chart "$ROOT/charts/monitoring-stack/charts/alertmanager" alertmanager 0.27.0 "Prometheus Alertmanager for routing alerts"
mk_values "$ROOT/charts/monitoring-stack/charts/alertmanager" "replicas: 3
image:
  repository: prom/alertmanager
  tag: v0.27.0
config:
  route:
    receiver: default
    groupWait: 10s
    groupInterval: 5m
  receivers:
    - name: default"

mk_chart "$ROOT/charts/monitoring-stack/charts/node-exporter" node-exporter 1.7.0 "Prometheus node-exporter daemonset"
mk_values "$ROOT/charts/monitoring-stack/charts/node-exporter" "hostNetwork: true
hostPID: true
image:
  repository: prom/node-exporter
  tag: v1.7.0
tolerations:
  - operator: Exists"

# ─────────── logging-stack ───────────
mk_chart_with_deps "$ROOT/charts/logging-stack" logging-stack 3.1.0 "Loki + Promtail + fluent-bit logging pipeline" "loki:2.9.0" "promtail:2.9.0" "fluent-bit:2.2.0"
mk_values "$ROOT/charts/logging-stack" "global:
  logLevel: info
  retention: 30d
namespace: logging"

mk_chart_with_deps "$ROOT/charts/logging-stack/charts/loki" loki 2.9.0 "Loki log aggregation" "loki-gateway:2.9.0"
mk_values "$ROOT/charts/logging-stack/charts/loki" "replicas: 3
image:
  repository: grafana/loki
  tag: 2.9.0
persistence:
  size: 100Gi
storageConfig:
  aws:
    region: us-east-1
    bucketnames: loki-chunks"

mk_chart "$ROOT/charts/logging-stack/charts/loki/charts/loki-gateway" loki-gateway 2.9.0 "Loki gateway/ingress"
mk_values "$ROOT/charts/logging-stack/charts/loki/charts/loki-gateway" "replicas: 2
image:
  repository: nginxinc/nginx-unprivileged
  tag: 1.25-alpine
service:
  port: 3100
basicAuth:
  enabled: false"

mk_chart "$ROOT/charts/logging-stack/charts/promtail" promtail 2.9.0 "Promtail log shipper daemonset"
mk_values "$ROOT/charts/logging-stack/charts/promtail" "image:
  repository: grafana/promtail
  tag: 2.9.0
config:
  clients:
    - url: http://loki:3100/loki/api/v1/push"

mk_chart "$ROOT/charts/logging-stack/charts/fluent-bit" fluent-bit 2.2.0 "Fluent Bit log collector"
mk_values "$ROOT/charts/logging-stack/charts/fluent-bit" "image:
  repository: fluent/fluent-bit
  tag: 2.2.0
resources:
  requests:
    cpu: 100m
    memory: 128Mi"

# ─────────── postgres-cluster ───────────
mk_chart_with_deps "$ROOT/charts/postgres-cluster" postgres-cluster 15.5.0 "PostgreSQL HA cluster" "pgbouncer:1.22.0" "postgres-operator:1.11.0"
mk_values "$ROOT/charts/postgres-cluster" "replicas: 3
image:
  repository: postgres
  tag: 15.5-alpine
auth:
  username: app
  database: appdb
persistence:
  size: 100Gi"

mk_chart "$ROOT/charts/postgres-cluster/charts/pgbouncer" pgbouncer 1.22.0 "PgBouncer connection pooler"
mk_values "$ROOT/charts/postgres-cluster/charts/pgbouncer" "replicas: 2
image:
  repository: edoburu/pgbouncer
  tag: 1.22.0
config:
  poolMode: transaction
  maxClientConn: 1000
  defaultPoolSize: 25"

mk_chart_with_deps "$ROOT/charts/postgres-cluster/charts/postgres-operator" postgres-operator 1.11.0 "Zalando postgres-operator" "postgres-backup:1.11.0"
mk_values "$ROOT/charts/postgres-cluster/charts/postgres-operator" "replicas: 1
image:
  repository: registry.opensource.zalan.do/acid/postgres-operator
  tag: v1.11.0
configGeneral:
  workers: 8
  minInstances: 1"

mk_chart "$ROOT/charts/postgres-cluster/charts/postgres-operator/charts/postgres-backup" postgres-backup 1.11.0 "Backup sidecar for postgres-operator"
mk_values "$ROOT/charts/postgres-cluster/charts/postgres-operator/charts/postgres-backup" "schedule: 0 2 * * *
retention:
  daily: 7
  weekly: 4
  monthly: 12
storage:
  type: s3
  bucket: pg-backups-prod"

# ─────────── kafka-cluster ───────────
mk_chart_with_deps "$ROOT/charts/kafka-cluster" kafka-cluster 3.6.0 "Kafka brokers + zookeeper + ecosystem" "zookeeper:3.9.0" "schema-registry:7.5.0" "kafka-connect:7.5.0"
mk_values "$ROOT/charts/kafka-cluster" "brokers: 3
image:
  repository: confluentinc/cp-kafka
  tag: 7.5.0
persistence:
  size: 500Gi
listeners:
  plaintext: 9092
  tls: 9093"

mk_chart "$ROOT/charts/kafka-cluster/charts/zookeeper" zookeeper 3.9.0 "Apache ZooKeeper for Kafka coordination"
mk_values "$ROOT/charts/kafka-cluster/charts/zookeeper" "replicas: 3
image:
  repository: zookeeper
  tag: 3.9.0
persistence:
  size: 20Gi
config:
  tickTime: 2000
  initLimit: 10"

mk_chart "$ROOT/charts/kafka-cluster/charts/schema-registry" schema-registry 7.5.0 "Confluent Schema Registry"
mk_values "$ROOT/charts/kafka-cluster/charts/schema-registry" "replicas: 2
image:
  repository: confluentinc/cp-schema-registry
  tag: 7.5.0
config:
  kafkaStore:
    bootstrapServers: kafka-cluster:9092
  compatibilityLevel: BACKWARD"

mk_chart_with_deps "$ROOT/charts/kafka-cluster/charts/kafka-connect" kafka-connect 7.5.0 "Kafka Connect framework" "connector-schemas:7.5.0"
mk_values "$ROOT/charts/kafka-cluster/charts/kafka-connect" "replicas: 3
image:
  repository: confluentinc/cp-kafka-connect
  tag: 7.5.0
config:
  groupId: connect-cluster
  configStorageTopic: connect-configs
  offsetStorageTopic: connect-offsets"

mk_chart "$ROOT/charts/kafka-cluster/charts/kafka-connect/charts/connector-schemas" connector-schemas 7.5.0 "Prepackaged connector JAR schemas"
mk_values "$ROOT/charts/kafka-cluster/charts/kafka-connect/charts/connector-schemas" "connectors:
  - debezium-postgres
  - debezium-mysql
  - jdbc-sink
  - s3-sink
image:
  repository: ghcr.io/example/connector-schemas
  tag: 7.5.0"

# ─────────── ingress-nginx ───────────
mk_chart "$ROOT/charts/ingress-nginx" ingress-nginx 4.10.0 "NGINX ingress controller"
mk_values "$ROOT/charts/ingress-nginx" "controller:
  replicaCount: 3
  image:
    repository: registry.k8s.io/ingress-nginx/controller
    tag: v1.10.0
  service:
    type: LoadBalancer
  config:
    use-proxy-protocol: true
    enable-brotli: true"

# ─────────── external-dns ───────────
mk_chart "$ROOT/charts/external-dns" external-dns 1.14.0 "ExternalDNS controller for managing DNS records"
mk_values "$ROOT/charts/external-dns" "replicas: 1
image:
  repository: registry.k8s.io/external-dns/external-dns
  tag: v0.14.0
provider: aws
sources:
  - service
  - ingress
aws:
  region: us-east-1
  zoneType: public"

# ─────────── vault ───────────
mk_chart_with_deps "$ROOT/charts/vault" vault 1.15.0 "HashiCorp Vault" "vault-agent-injector:1.15.0"
mk_values "$ROOT/charts/vault" "server:
  replicas: 3
  image:
    repository: hashicorp/vault
    tag: 1.15.0
  ha:
    enabled: true
    raft:
      enabled: true
storage:
  size: 10Gi"

mk_chart_with_deps "$ROOT/charts/vault/charts/vault-agent-injector" vault-agent-injector 1.15.0 "Vault sidecar injector webhook" "vault-csi-provider:1.15.0"
mk_values "$ROOT/charts/vault/charts/vault-agent-injector" "replicas: 2
image:
  repository: hashicorp/vault-k8s
  tag: 1.3.1
agentImage:
  repository: hashicorp/vault
  tag: 1.15.0
logLevel: info
logFormat: standard"

mk_chart "$ROOT/charts/vault/charts/vault-agent-injector/charts/vault-csi-provider" vault-csi-provider 1.4.1 "Vault CSI secrets store provider"
mk_values "$ROOT/charts/vault/charts/vault-agent-injector/charts/vault-csi-provider" "image:
  repository: hashicorp/vault-csi-provider
  tag: 1.4.1
hmacSecretName: vault-csi-provider-hmac-key
logLevel: info"

# ─────────── minio ───────────
mk_chart_with_deps "$ROOT/charts/minio" minio 5.2.0 "MinIO S3-compatible object storage" "minio-console:5.2.0"
mk_values "$ROOT/charts/minio" "mode: distributed
replicas: 4
image:
  repository: quay.io/minio/minio
  tag: RELEASE.2024-03-15T01-07-19Z
persistence:
  size: 200Gi
rootUser: admin
rootPassword: changeme"

mk_chart "$ROOT/charts/minio/charts/minio-console" minio-console 5.2.0 "MinIO web console UI"
mk_values "$ROOT/charts/minio/charts/minio-console" "replicas: 2
image:
  repository: quay.io/minio/console
  tag: v0.43.0
service:
  port: 9090
  type: ClusterIP
ingress:
  enabled: false"

# ─────────── argo-cd extra children (dex + notifications-controller) ───────────
mk_chart "$ROOT/charts/argo-cd/charts/dex" dex 2.37.0 "Dex OIDC provider for argo-cd SSO"
mk_values "$ROOT/charts/argo-cd/charts/dex" "replicas: 1
image:
  repository: ghcr.io/dexidp/dex
  tag: v2.37.0
connectors:
  - type: github
    id: github
    name: GitHub
ports:
  http: 5556
  grpc: 5557"

mk_chart "$ROOT/charts/argo-cd/charts/notifications-controller" notifications-controller 1.2.0 "Argo CD notifications controller"
mk_values "$ROOT/charts/argo-cd/charts/notifications-controller" "replicas: 1
image:
  repository: quay.io/argoprojlabs/argocd-notifications
  tag: v1.2.0
triggers:
  - on-deployed
  - on-sync-failed
services:
  slack:
    enabled: true"

echo "done generating demo subcharts under $ROOT/charts"
