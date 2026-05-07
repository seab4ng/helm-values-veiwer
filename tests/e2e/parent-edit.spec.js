const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

test('parent-edit button is present in DOM for nested fields', async ({ page }) => {
  // image.repository is a nested field → should have a parent-edit-btn
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await expect(row.locator('.parent-edit-btn')).toBeAttached();
});

test('top-level field has no parent-edit button', async ({ page }) => {
  // replicaCount has no dot → no parent-edit-btn
  const row = page.locator('.val-row', { hasText: 'replicaCount' }).first();
  await expect(row.locator('.parent-edit-btn')).toHaveCount(0);
});

test('hovering nested field and clicking parent-edit opens modal', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  await expect(page.locator('#parent-edit-overlay')).toBeVisible();
});

test('parent-edit modal title contains parent path name', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  await expect(page.locator('#parent-edit-title')).toContainText('image');
});

test('parent-edit textarea pre-fills with current YAML of the parent', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  // The image: object contains repository, tag, pullPolicy
  const yamlContent = await page.locator('#parent-edit-yaml').inputValue();
  expect(yamlContent).toContain('repository');
  expect(yamlContent).toContain('nginx');
});

test('parent-edit cancel closes modal without changing values', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  await page.click('#parent-edit-cancel');
  await expect(page.locator('#parent-edit-overlay')).toBeHidden();
  // No fields should be marked changed
  await expect(page.locator('.val-row.changed')).toHaveCount(0);
});

test('parent-edit close (X) button closes modal', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  await page.click('#parent-edit-close');
  await expect(page.locator('#parent-edit-overlay')).toBeHidden();
});

test('parent-edit overlay click outside closes modal', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  await expect(page.locator('#parent-edit-overlay')).toBeVisible();
  // Click the overlay backdrop (top-left corner, outside the modal box)
  await page.locator('#parent-edit-overlay').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#parent-edit-overlay')).toBeHidden();
});

test('parent-edit apply with valid YAML shows success toast', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  await page.fill('#parent-edit-yaml', 'repository: nginx\ntag: v99\npullPolicy: Always');
  await page.click('#parent-edit-apply');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
});

test('parent-edit apply marks child fields as changed', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  // Change tag to v99 (different from original "latest")
  await page.fill('#parent-edit-yaml', 'repository: nginx\ntag: v99\npullPolicy: Always');
  await page.click('#parent-edit-apply');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('.val-row.changed', { hasText: 'image.tag' })).toBeVisible();
});

test('parent-edit apply with invalid YAML shows error toast', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  await page.fill('#parent-edit-yaml', '{ invalid yaml :::');
  await page.click('#parent-edit-apply');
  await expect(page.locator('#toast-area .toast.err').first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#toast-area .toast.err').first()).toContainText('Invalid YAML');
});

test('parent-edit apply closes modal on success', async ({ page }) => {
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  await page.fill('#parent-edit-yaml', 'repository: nginx\ntag: latest\npullPolicy: IfNotPresent');
  await page.click('#parent-edit-apply');
  await expect(page.locator('#toast-area .toast').first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#parent-edit-overlay')).toBeHidden();
});

test('parent-edit apply updates diff badge when value changes', async ({ page }) => {
  await expect(page.locator('#diff-badge')).toBeHidden();
  const row = page.locator('.val-row', { hasText: 'image.repository' });
  await row.hover();
  await row.locator('.parent-edit-btn').click({ force: true });
  // Change pullPolicy so at least one child differs
  await page.fill('#parent-edit-yaml', 'repository: nginx\ntag: v99\npullPolicy: Always');
  await page.click('#parent-edit-apply');
  await expect(page.locator('#toast-area .toast').first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('#diff-badge')).toBeVisible();
});

// ── Empty textarea (clear to empty container) ──

test('blank textarea on list parent sets it to [] and shows success', async ({ page }) => {
  // imagePullSecrets starts as [] — fill with a SCALAR list so imagePullSecrets[0]
  // is the leaf row; its parent-edit button then points to imagePullSecrets (the array).
  // (Using [{name:x}] would make imagePullSecrets[0].name the leaf, whose parent-edit
  //  points to imagePullSecrets[0] — an object — not the list itself.)
  await page.locator('.val-row', { hasText: 'imagePullSecrets' }).locator('input[type=checkbox]').check();
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', '[mykey]');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  // imagePullSecrets[0] is the changed leaf; its parent-edit points to imagePullSecrets (array)
  const changed = page.locator('.val-row.changed').first();
  await changed.hover();
  await changed.locator('.parent-edit-btn').click({ force: true });
  // Confirm modal is for imagePullSecrets (the list)
  await expect(page.locator('#parent-edit-title')).toContainText('imagePullSecrets');
  // Clear textarea → infers [] (array parent)
  await page.fill('#parent-edit-yaml', '');
  await page.click('#parent-edit-apply');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  // Back to original [] — no changed rows
  await expect(page.locator('.val-row.changed')).toHaveCount(0);
});

test('blank textarea on map parent sets it to {} and shows success', async ({ page }) => {
  // nodeSelector is {} — set to a map first
  await page.locator('.val-row', { hasText: 'nodeSelector' }).locator('input[type=checkbox]').check();
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', 'app: myapp');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  // Open parent-edit on the changed child (nodeSelector.app)
  const changed = page.locator('.val-row.changed').first();
  await changed.hover();
  await changed.locator('.parent-edit-btn').click({ force: true });
  // Clear → apply → should set nodeSelector back to {}
  await page.fill('#parent-edit-yaml', '');
  await page.click('#parent-edit-apply');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('.val-row.changed')).toHaveCount(0);
});

test('hint text tells user what blank will produce for a list', async ({ page }) => {
  // Use scalar list so the leaf row's parent-edit points to imagePullSecrets (array)
  await page.locator('.val-row', { hasText: 'imagePullSecrets' }).locator('input[type=checkbox]').check();
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', '[mykey]');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  const changed = page.locator('.val-row.changed').first();
  await changed.hover();
  await changed.locator('.parent-edit-btn').click({ force: true });
  // Hint must tell user "leave blank to set to []"
  await expect(page.locator('#parent-edit-hint')).toContainText('[]');
});
