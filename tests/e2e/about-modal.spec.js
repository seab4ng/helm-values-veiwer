const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('about button opens modal', async ({ page }) => {
  await page.click('#about-btn');
  await expect(page.locator('#about-modal')).toBeVisible();
});

test('about modal shows maintainer info', async ({ page }) => {
  await page.click('#about-btn');
  await expect(page.locator('#about-modal')).toContainText('Yakir Veneci');
  await expect(page.locator('#about-modal')).toContainText('seab4ng');
});

test('about modal closes on X click', async ({ page }) => {
  await page.click('#about-btn');
  await expect(page.locator('#about-modal')).toBeVisible();
  await page.click('#about-close');
  await expect(page.locator('#about-modal')).toBeHidden();
});
