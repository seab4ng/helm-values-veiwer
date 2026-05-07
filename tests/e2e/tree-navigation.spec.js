const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

// ── Tree node selection ──

test('clicking All charts makes it active', async ({ page }) => {
  await page.locator('.tree-node[data-name="all"]').click();
  await expect(page.locator('.tree-node.active[data-name="all"]')).toBeVisible();
});

test('clicking chart node makes it active', async ({ page }) => {
  // First go to All, then back to test-chart
  await page.locator('.tree-node[data-name="all"]').click();
  await page.locator('.tree-node[data-name="test-chart"]').click();
  await expect(page.locator('.tree-node.active[data-name="test-chart"]')).toBeVisible();
});

test('values header shows chart name when specific chart selected', async ({ page }) => {
  await page.locator('.tree-node[data-name="all"]').click();
  await page.locator('.tree-node[data-name="test-chart"]').click();
  await expect(page.locator('#val-name')).toContainText('test-chart');
});

test('values header shows "All charts" when All selected', async ({ page }) => {
  await page.locator('.tree-node[data-name="all"]').click();
  await expect(page.locator('#val-name')).toContainText('All charts');
});

test('selecting specific chart still shows its value rows', async ({ page }) => {
  await page.locator('.tree-node[data-name="all"]').click();
  await page.locator('.tree-node[data-name="test-chart"]').click();
  await expect(page.locator('.val-row', { hasText: 'replicaCount' })).toBeVisible();
});

test('selecting All charts shows value rows', async ({ page }) => {
  await page.locator('.tree-node[data-name="all"]').click();
  await expect(page.locator('.val-row', { hasText: 'replicaCount' })).toBeVisible();
});

// ── Tree search ──

test('tree search input is visible', async ({ page }) => {
  await expect(page.locator('#tree-search')).toBeVisible();
});

test('tree search matching name keeps chart node visible', async ({ page }) => {
  await page.fill('#tree-search', 'test');
  await page.waitForTimeout(150);
  await expect(page.locator('.tree-node[data-name="test-chart"]')).toBeVisible();
});

test('tree search non-matching query hides chart node', async ({ page }) => {
  await page.fill('#tree-search', 'xyznonexistentchart999');
  await page.waitForTimeout(150);
  await expect(page.locator('.tree-node[data-name="test-chart"]')).toHaveCount(0);
});

test('tree search non-matching shows "No charts match" message', async ({ page }) => {
  await page.fill('#tree-search', 'xyznonexistentchart999');
  await page.waitForTimeout(150);
  await expect(page.locator('#tree')).toContainText('No charts match');
});

test('tree clear-x button appears when search has text', async ({ page }) => {
  await expect(page.locator('#tree-clear-x')).toBeHidden();
  await page.fill('#tree-search', 'test');
  await page.waitForTimeout(150);
  await expect(page.locator('#tree-clear-x')).toBeVisible();
});

test('tree clear-x click clears search and shows chart again', async ({ page }) => {
  await page.fill('#tree-search', 'xyznonexistentchart999');
  await page.waitForTimeout(150);
  await expect(page.locator('.tree-node[data-name="test-chart"]')).toHaveCount(0);
  await page.click('#tree-clear-x');
  await expect(page.locator('#tree-search')).toHaveValue('');
  await expect(page.locator('.tree-node[data-name="test-chart"]')).toBeVisible();
});

test('tree clear-x disappears after clearing search', async ({ page }) => {
  await page.fill('#tree-search', 'test');
  await page.waitForTimeout(150);
  await page.click('#tree-clear-x');
  await expect(page.locator('#tree-clear-x')).toBeHidden();
});

// ── Values search clear-x ──

test('values search clear-x appears when search has text', async ({ page }) => {
  await expect(page.locator('#clear-x')).toBeHidden();
  await page.fill('#search', 'image');
  await page.waitForTimeout(150);
  await expect(page.locator('#clear-x')).toBeVisible();
});

test('values search clear-x click clears search and restores all rows', async ({ page }) => {
  const allRows = await page.locator('.val-row').count();
  await page.fill('#search', 'image');
  await page.waitForTimeout(150);
  await page.click('#clear-x');
  await expect(page.locator('#search')).toHaveValue('');
  expect(await page.locator('.val-row').count()).toBe(allRows);
});
