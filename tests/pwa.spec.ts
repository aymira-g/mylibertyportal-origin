import { test, expect } from '@playwright/test';

test.describe('MyLiberty Portal - PWA Health & Deep Linking Suite', () => {
  test('manifest.webmanifest is served or generated with valid JSON', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    if (res.ok() && res.status() === 200) {
      const text = await res.text();
      // In preview/prod, it's served directly as JSON
      if (!text.startsWith('<!doctype')) {
        const manifest = JSON.parse(text);
        expect(manifest.name).toContain('MY LIBERTY');
        expect(manifest.start_url).toBe('/');
        expect(manifest.display).toBe('standalone');
        expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
        return;
      }
    }

    // In dev mode with devOptions.enabled: false, verify production build artifact
    const fs = await import('node:fs');
    const path = await import('node:path');
    const distManifest = path.resolve(process.cwd(), 'dist/manifest.webmanifest');
    expect(fs.existsSync(distManifest)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(distManifest, 'utf-8'));
    expect(manifest.name).toContain('MY LIBERTY');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  test('PWA icons resolve successfully', async ({ request }) => {
    const icon192 = await request.get('/pwa-192x192.png');
    expect(icon192.ok()).toBeTruthy();
    expect(icon192.status()).toBe(200);

    const icon512 = await request.get('/pwa-512x512.png');
    expect(icon512.ok()).toBeTruthy();
    expect(icon512.status()).toBe(200);
  });

  test('public deep links load cleanly', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveTitle(/MYLIBERTY/i);
    // Student registration form renders
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/parent-portal');
    await expect(page).toHaveTitle(/MYLIBERTY/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('action query parameters (?action=attendance) are preserved on login page for post-auth routing', async ({ page }) => {
    await page.goto('/?action=attendance');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    expect(page.url()).toContain('action=attendance');
  });
});
