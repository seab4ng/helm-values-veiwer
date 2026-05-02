const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

async function applyChange(page, fieldText, value) {
  await page.locator('.val-row', { hasText: fieldText }).locator('input[type=checkbox]').check();
  await page.fill('#new-val', value);
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
});

test('Changed button hidden before any changes', async ({ page }) => {
  await expect(page.locator('#changed-only-btn')).toBeHidden();
});

test('Changed button appears after applying a change', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await expect(page.locator('#changed-only-btn')).toBeVisible();
});

test('changed field gets amber border CSS class', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await expect(page.locator('.val-row.changed', { hasText: 'replicaCount' })).toBeVisible();
});

test('unchanged fields do not get changed class', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await expect(page.locator('.val-row.changed', { hasText: 'image.repository' })).toHaveCount(0);
});

test('Changed filter shows only changed rows', async ({ page }) => {
  const allRows = await page.locator('.val-row').count();
  await applyChange(page, 'replicaCount', '5');
  await page.click('#changed-only-btn');
  await page.waitForTimeout(150);
  const filteredRows = await page.locator('.val-row').count();
  expect(filteredRows).toBeLessThan(allRows);
  expect(filteredRows).toBe(1);
});

test('Changed filter keeps changed field visible', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#changed-only-btn');
  await page.waitForTimeout(150);
  await expect(page.locator('.val-row', { hasText: 'replicaCount' })).toBeVisible();
});

test('Changed filter hides unchanged fields', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await page.click('#changed-only-btn');
  await page.waitForTimeout(150);
  await expect(page.locator('.val-row', { hasText: 'image.repository' })).toHaveCount(0);
});

test('Changed filter shows multiple changed fields', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await applyChange(page, 'image.tag', 'v2');
  await page.click('#changed-only-btn');
  await page.waitForTimeout(150);
  expect(await page.locator('.val-row').count()).toBe(2);
});

test('clicking Changed again deactivates filter and restores all rows', async ({ page }) => {
  const allRows = await page.locator('.val-row').count();
  await applyChange(page, 'replicaCount', '5');
  await page.click('#changed-only-btn');
  await page.waitForTimeout(150);
  await page.click('#changed-only-btn');
  await page.waitForTimeout(150);
  expect(await page.locator('.val-row').count()).toBe(allRows);
});

test('Changed filter auto-exits when all changed fields are reverted', async ({ page }) => {
  const allRows = await page.locator('.val-row').count();
  await applyChange(page, 'replicaCount', '5');

  // Enter Changed mode
  await page.click('#changed-only-btn');
  await page.waitForTimeout(150);
  expect(await page.locator('.val-row').count()).toBe(1);

  // Select the only changed field and revert
  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn'); // Revert selected
  await expect(page.locator('#toast-area .toast').first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  // Changed mode auto-exits → all rows visible
  expect(await page.locator('.val-row').count()).toBe(allRows);
});

test('Changed filter auto-exits after Undo all while in Changed mode', async ({ page }) => {
  const allRows = await page.locator('.val-row').count();
  await applyChange(page, 'replicaCount', '5');
  await applyChange(page, 'image.tag', 'v2');

  await page.click('#changed-only-btn');
  await page.waitForTimeout(150);
  expect(await page.locator('.val-row').count()).toBe(2);

  // Undo all while in Changed mode
  await page.click('#undo-btn'); // "Undo all" (no selection)
  await expect(page.locator('#toast-area .toast').first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  // All rows back, no changed class
  expect(await page.locator('.val-row').count()).toBe(allRows);
  await expect(page.locator('.val-row.changed')).toHaveCount(0);
});

test('Changed button hides after all changes reverted', async ({ page }) => {
  await applyChange(page, 'replicaCount', '5');
  await expect(page.locator('#changed-only-btn')).toBeVisible();

  await page.locator('.val-row', { hasText: 'replicaCount' }).locator('input[type=checkbox]').check();
  await page.click('#undo-btn'); // Revert selected
  await expect(page.locator('#toast-area .toast').first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);

  await expect(page.locator('#changed-only-btn')).toBeHidden();
});
