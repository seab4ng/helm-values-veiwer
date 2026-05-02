const chartYaml = require('../fixtures/chart-yaml');
const valuesYaml = require('../fixtures/values-yaml');

function makeFileHandle(name, content) {
  return {
    kind: 'file',
    name,
    getFile: async () => ({
      name,
      size: content.length,
      text: async () => content,
    }),
    createWritable: async () => {
      let written = '';
      return {
        write: async (chunk) => { written += chunk; },
        close: async () => {},
      };
    },
    requestPermission: async () => 'granted',
  };
}

function makeChartsDir() {
  return {
    kind: 'directory',
    name: 'charts',
    getFileHandle: async () => { throw new Error('not found'); },
    getDirectoryHandle: async () => { throw new Error('not found'); },
    entries: async function* () {},
    requestPermission: async () => 'granted',
  };
}

function makeDirHandle() {
  const chartFile = makeFileHandle('Chart.yaml', chartYaml);
  const valuesFile = makeFileHandle('values.yaml', valuesYaml);
  const chartsDir = makeChartsDir();

  return {
    kind: 'directory',
    name: 'test-chart',
    getFileHandle: async (name) => {
      if (name === 'Chart.yaml') return chartFile;
      if (name === 'values.yaml') return valuesFile;
      throw new DOMException('not found', 'NotFoundError');
    },
    getDirectoryHandle: async (name) => {
      if (name === 'charts') return chartsDir;
      throw new DOMException('not found', 'NotFoundError');
    },
    entries: async function* () {
      yield ['Chart.yaml', chartFile];
      yield ['values.yaml', valuesFile];
      yield ['charts', chartsDir];
    },
    requestPermission: async () => 'granted',
  };
}

function makeFilePickerHandle() {
  return makeFileHandle('values.yaml', valuesYaml);
}

/**
 * Inject FSAPI mocks into the page before the app loads.
 * Call via: await page.addInitScript(injectMocks)
 */
function injectMocks() {
  const chartYamlContent = `apiVersion: v2
name: test-chart
version: 1.0.0
description: Test chart for E2E tests
`;
  const valuesYamlContent = `replicaCount: 2
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

  function makeFile(name, content) {
    return {
      kind: 'file',
      name,
      getFile: async () => ({ name, size: content.length, text: async () => content }),
      createWritable: async () => {
        let buf = '';
        return { write: async (c) => { buf += c; }, close: async () => {} };
      },
      requestPermission: async () => 'granted',
    };
  }

  const chartsDir = {
    kind: 'directory',
    name: 'charts',
    getFileHandle: async () => { throw new DOMException('not found', 'NotFoundError'); },
    getDirectoryHandle: async () => { throw new DOMException('not found', 'NotFoundError'); },
    entries: async function* () {},
    requestPermission: async () => 'granted',
  };

  const chartFile = makeFile('Chart.yaml', chartYamlContent);
  const valuesFile = makeFile('values.yaml', valuesYamlContent);

  const dirHandle = {
    kind: 'directory',
    name: 'test-chart',
    getFileHandle: async (name) => {
      if (name === 'Chart.yaml') return chartFile;
      if (name === 'values.yaml') return valuesFile;
      throw new DOMException('not found', 'NotFoundError');
    },
    getDirectoryHandle: async (name) => {
      if (name === 'charts') return chartsDir;
      throw new DOMException('not found', 'NotFoundError');
    },
    entries: async function* () {
      yield ['Chart.yaml', chartFile];
      yield ['values.yaml', valuesFile];
      yield ['charts', chartsDir];
    },
    requestPermission: async () => 'granted',
  };

  window.showDirectoryPicker = async () => dirHandle;
  window.showOpenFilePicker = async () => [makeFile('values.yaml', valuesYamlContent)];
}

module.exports = { injectMocks, makeDirHandle, makeFilePickerHandle };
