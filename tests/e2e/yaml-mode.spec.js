const { test, expect } = require('@playwright/test');
const { injectMocks } = require('./helpers/mock-fsapi');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(injectMocks);
  await page.goto('/');
  await page.click('#add-chart-btn');
  await expect(page.locator('.val-row').first()).toBeVisible({ timeout: 5000 });
  // Select imagePullSecrets (list field) so batch bar is visible
  await page.locator('.val-row', { hasText: 'imagePullSecrets' }).locator('input[type=checkbox]').check();
  await expect(page.locator('#batch-bar')).not.toHaveClass(/hidden/);
});

test('YAML mode button exists in batch bar', async ({ page }) => {
  await expect(page.locator('#yaml-mode-btn')).toBeVisible();
});

test('clicking YAML button hides text input and shows textarea', async ({ page }) => {
  await expect(page.locator('#new-val')).toBeVisible();
  await expect(page.locator('#yaml-val')).toBeHidden();
  await page.click('#yaml-mode-btn');
  await expect(page.locator('#yaml-val')).toBeVisible();
  await expect(page.locator('#new-val')).toBeHidden();
});

test('clicking YAML button again toggles back to text input', async ({ page }) => {
  await page.click('#yaml-mode-btn');
  await page.click('#yaml-mode-btn');
  await expect(page.locator('#new-val')).toBeVisible();
  await expect(page.locator('#yaml-val')).toBeHidden();
});

test('YAML button gets primary style when active', async ({ page }) => {
  await page.click('#yaml-mode-btn');
  await expect(page.locator('#yaml-mode-btn')).toHaveClass(/btn-primary/);
});

test('YAML button loses primary style when toggled off', async ({ page }) => {
  await page.click('#yaml-mode-btn');
  await page.click('#yaml-mode-btn');
  await expect(page.locator('#yaml-mode-btn')).not.toHaveClass(/btn-primary/);
});

test('YAML mode applies a list value to a list field', async ({ page }) => {
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', '[{name: myregistrykey}]');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
});

test('YAML mode marks field as changed after applying', async ({ page }) => {
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', '[{name: myregistrykey}]');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  // imagePullSecrets should now have changed children visible
  await expect(page.locator('.val-row.changed')).toHaveCount(1);
});

test('YAML mode shows error toast for invalid YAML', async ({ page }) => {
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', '{ invalid yaml :::');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast.err').first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#toast-area .toast.err').first()).toContainText('Invalid YAML');
});

test('clear selection resets YAML mode and hides batch bar', async ({ page }) => {
  await page.click('#yaml-mode-btn');
  await expect(page.locator('#yaml-val')).toBeVisible();
  await page.click('#clear-sel-btn');
  await expect(page.locator('#batch-bar')).toHaveClass(/hidden/);
});

test('applying via YAML mode updates diff badge', async ({ page }) => {
  await expect(page.locator('#diff-badge')).toBeHidden();
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', '[{name: myregistrykey}]');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(200);
  await expect(page.locator('#diff-badge')).toBeVisible();
});

test('applying via YAML mode clears selection and hides batch bar', async ({ page }) => {
  await page.click('#yaml-mode-btn');
  await page.fill('#yaml-val', '[{name: myregistrykey}]');
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast', { hasText: 'Updated' }).first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#batch-bar')).toHaveClass(/hidden/);
});

test('applying empty YAML shows error toast', async ({ page }) => {
  await page.click('#yaml-mode-btn');
  // Leave yaml-val empty
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast.err').first()).toBeVisible({ timeout: 3000 });
});

test('text mode: applying empty text value shows error toast', async ({ page }) => {
  // In text mode with nothing typed
  await page.click('#apply-btn');
  await expect(page.locator('#toast-area .toast.err').first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#toast-area .toast.err').first()).toContainText('Enter a new value');
});
