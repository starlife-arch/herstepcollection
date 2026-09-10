import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('auth UI keeps registration credentials separate from profile completion', async () => {
  const [html, app] = await Promise.all([source('index.html'), source('app.js')]);

  assert.match(html, /id="auth-identifier"[^>]*name="identifier"/);
  assert.match(html, /id="auth-password-confirm"/);
  assert.match(html, /id="profile-content" hidden/);
  assert.match(html, /id="profile-name"/);
  assert.match(html, /id="profile-phone"/);
  assert.match(html, /id="profile-delivery-details"/);
  assert.match(app, /form\.password\.addEventListener\('input', renderPasswordRequirements\)/);
  assert.match(app, /await syncProfile\(user, displayName, profileForm\.phone\.value\.trim\(\), profileForm\.marketingConsent\.checked, profileForm\.deliveryDetails\.value\.trim\(\)\)/);
});

test('browser profile payload has no role and server assigns only CUSTOMER on creation', async () => {
  const [app, syncRoute] = await Promise.all([source('app.js'), source('api/_lib/routes/auth-sync-profile.js')]);

  assert.match(app, /const body = \{ displayName, marketingConsent \}/);
  assert.doesNotMatch(app, /body\.role|role:\s*['"](?:ADMIN|SUPER_ADMIN|CUSTOMER)['"]/);
  assert.match(syncRoute, /role: 'CUSTOMER'/);
  assert.doesNotMatch(syncRoute, /request\.body\?\.role/);
});

test('auth errors stay inline and the submit controls expose loading states', async () => {
  const [html, app] = await Promise.all([source('index.html'), source('app.js')]);

  assert.match(html, /id="auth-message" role="alert"/);
  assert.match(html, /id="profile-message" role="alert"/);
  assert.doesNotMatch(app, /alert\(/);
  assert.match(app, /button\.textContent = 'Saving profile…'/);
});
