const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

// ── Remove single chart via tree X button ──

test('clicking X on chart tree node removes it from the tree', async ({ page }) => {
  await expect(page.locator('.tree-node[data-name="test-chart"]')).toBeVisible();
  // Hover to make the delete button opaque, then force-click
  await page.locator('.tree-node[data-name="test-chart"]').hover();
  await page.locator('.tree-node[data-name="test-chart"] .tree-del').click({ force: true });
  await expect(page.locator('.tree-node[data-name="test-chart"]')).toHaveCount(0);
});

test('removing chart shows success toast', async ({ page }) => {
  await page.locator('.tree-node[data-name="test-chart"]').hover();
  await page.locator('.tree-node[data-name="test-chart"] .tree-del').click({ force: true });
  await expect(
    page.locator('#toast-area .toast', { hasText: 'Removed' }).first()
  ).toBeVisible({ timeout: 3000 });
});

test('removing only chart shows empty state in values panel', async ({ page }) => {
  await page.locator('.tree-node[data-name="test-chart"]').hover();
  await page.locator('.tree-node[data-name="test-chart"] .tree-del').click({ force: true });
  await page.waitForTimeout(100);
  await expect(page.locator('#scrollbox .empty')).toBeVisible();
});

test('removing chart clears its selected fields from batch bar', async ({ page }) => {
  // Select a field first
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await expect(page.locator('#batch-bar')).not.toHaveClass(/hidden/);
  // Remove the chart
  await page.locator('.tree-node[data-name="test-chart"]').hover();
  await page.locator('.tree-node[data-name="test-chart"] .tree-del').click({ force: true });
  await page.waitForTimeout(100);
  await expect(page.locator('#batch-bar')).toHaveClass(/hidden/);
});

test('removing chart hides diff badge (was changed before removal)', async ({ page }) => {
  // Apply a change so badge appears
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '9');
  await page.click('#apply-btn');
  await expect(page.locator('#diff-badge')).toBeVisible({ timeout: 3000 });
  // Remove chart
  await page.locator('.tree-node[data-name="test-chart"]').hover();
  await page.locator('.tree-node[data-name="test-chart"] .tree-del').click({ force: true });
  await page.waitForTimeout(100);
  await expect(page.locator('#diff-badge')).toBeHidden();
});

// ── Clear all ──

test('Clear all button removes all charts from tree', async ({ page }) => {
  await page.click('#clear-all-btn');
  await page.waitForTimeout(100);
  await expect(page.locator('.tree-node[data-name="test-chart"]')).toHaveCount(0);
});

test('Clear all shows empty state in values panel', async ({ page }) => {
  await page.click('#clear-all-btn');
  await page.waitForTimeout(100);
  await expect(page.locator('#scrollbox .empty')).toBeVisible();
});

test('Clear all shows success toast', async ({ page }) => {
  await page.click('#clear-all-btn');
  await expect(
    page.locator('#toast-area .toast', { hasText: 'Cleared' }).first()
  ).toBeVisible({ timeout: 3000 });
});

test('Clear all hides batch bar', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await expect(page.locator('#batch-bar')).not.toHaveClass(/hidden/);
  await page.click('#clear-all-btn');
  await page.waitForTimeout(100);
  await expect(page.locator('#batch-bar')).toHaveClass(/hidden/);
});

test('Clear all hides diff badge', async ({ page }) => {
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', '9');
  await page.click('#apply-btn');
  await expect(page.locator('#diff-badge')).toBeVisible({ timeout: 3000 });
  await page.click('#clear-all-btn');
  await page.waitForTimeout(100);
  await expect(page.locator('#diff-badge')).toBeHidden();
});

test('Clear all on empty state is a no-op (no error)', async ({ page }) => {
  await page.click('#clear-all-btn');
  await page.waitForTimeout(100);
  // Clicking again on empty state should not throw
  await page.click('#clear-all-btn');
  await expect(page.locator('#scrollbox .empty')).toBeVisible();
});

test('All charts tree node is disabled when no charts loaded', async ({ page }) => {
  await page.click('#clear-all-btn');
  await page.waitForTimeout(100);
  await expect(page.locator('.tree-node.disabled[data-name="all"]')).toBeVisible();
});
