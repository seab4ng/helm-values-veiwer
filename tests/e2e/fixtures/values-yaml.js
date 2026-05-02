module.exports = `replicaCount: 2
image:
  repository: nginx
  tag: latest
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
nameOverride: ""
imagePullSecrets: []
tolerations: []
nodeSelector: {}
affinity: {}
`;
