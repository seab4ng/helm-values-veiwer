/**
 * E2E tests for YAML keys that literally contain dots
 * (e.g. argocd.argoproj.io/sync-options).
 *
 * These require a custom mock with a values.yaml that contains such keys.
 * After the feature implementation, flatten() encodes them as
 * annotations["argocd.argoproj.io/sync-options"] so they are unambiguous
 * from nested-object paths.
 */
const { test, expect } = require('@playwright/test');

// Inline mock with dotted YAML key — can't reuse injectMocks because that
// fixture doesn't include any dotted keys.
function injectDottedKeyMocks() {
  const chartYamlContent = `apiVersion: v2\nname: test-chart\nversion: 1.0.0\ndescription: Test chart\n`;
  const valuesYamlContent = `replicaCount: 2\nannotations:\n  argocd.argoproj.io/sync-options: Prune=false\n  normal-key: hello\n`;

  function makeFile(name, initialContent) {
    let content = initialContent;
    return {
      kind: 'file',
      name,
      getFile: async () => ({ name, size: content.length, text: async () => content }),
      createWritable: async () => {
        let buf = '';
        return {
          write: async (c) => { buf += c; },
          close: async () => { content = buf; },
        };
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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectDottedKeyMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

// ── Display ──

test('dotted YAML key shows in value rows with bracket-encoded path', async ({ page }) => {
  // The path must use ["key"] bracket notation, NOT dot notation that would collide
  // with a nested object path.
  await expect(
    page.locator('.val-row', { hasText: 'argocd.argoproj.io/sync-options' })
  ).toBeVisible();
});

test('dotted YAML key path contains bracket notation in UI', async ({ page }) => {
  // The rendered path should be annotations["argocd.argoproj.io/sync-options"]
  const row = page.locator('.val-row', { hasText: 'argocd.argoproj.io/sync-options' });
  await expect(row.locator('.val-path')).toContainText('annotations["argocd.argoproj.io/sync-options"]');
});

test('dotted YAML key value is displayed correctly', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'argocd.argoproj.io/sync-options' });
  await expect(row.locator('.val-val')).toContainText('Prune=false');
});

test('normal sibling key (no dots) still uses dot notation', async ({ page }) => {
  // annotations.normal-key should show with dot notation
  await expect(page.locator('.val-row .val-path', { hasText: 'annotations.normal-key' })).toBeVisible();
});

// ── Selection ──

test('dotted YAML key row can be selected via checkbox', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'argocd.argoproj.io/sync-options' });
  await row.locator('input[type=checkbox]').check();
  await expect(page.locator('#batch-bar')).not.toHaveClass(/hidden/);
});

// ── Apply change ──

test('applying a change to dotted YAML key shows Updated toast', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'argocd.argoproj.io/sync-options' });
  await row.locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'Prune=true');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
});

test('applying a change to dotted YAML key marks it with changed class', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'argocd.argoproj.io/sync-options' });
  await row.locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'Prune=true');
  await page.click('#apply-btn');
  await expect(
    page.locator('.val-row.changed', { hasText: 'argocd.argoproj.io/sync-options' })
  ).toBeVisible({ timeout: 3000 });
});

test('applying change to dotted key updates the diff badge', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'argocd.argoproj.io/sync-options' });
  await row.locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'Prune=true');
  await page.click('#apply-btn');
  await expect(page.locator('#diff-badge')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#diff-badge')).toContainText('1 change');
});

test('changing dotted key does NOT affect sibling normal-key changed state', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'argocd.argoproj.io/sync-options' });
  await row.locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'Prune=true');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  // normal-key was NOT changed
  await expect(page.locator('.val-row.changed', { hasText: 'normal-key' })).toHaveCount(0);
});

// ── Revert ──

test('Revert selected on dotted YAML key restores original value', async ({ page }) => {
  // Apply change first
  const row = page.locator('.val-row', { hasText: 'argocd.argoproj.io/sync-options' });
  await row.locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'Prune=true');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });

  // Re-select the changed field and revert
  await page.locator('.val-row.changed', { hasText: 'argocd.argoproj.io/sync-options' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn'); // Revert selected
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('.val-row.changed', { hasText: 'argocd.argoproj.io/sync-options' })).toHaveCount(0);
});

test('Undo all on dotted YAML key change reverts correctly', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'argocd.argoproj.io/sync-options' });
  await row.locator('input[type=checkbox]').check();
  await page.fill('#new-val', 'Prune=true');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });

  await page.click('#undo-btn'); // "Undo all" (no selection after apply)
  await expect(page.locator('#toast-area .toast', { hasText: 'Reverted all' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('.val-row.changed')).toHaveCount(0);
  await expect(page.locator('#diff-badge')).toBeHidden();
});
