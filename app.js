import './catalogue.js';
import './cart.js';
import './dashboard.js';
import './support.js';

const dialog = document.querySelector('#auth-dialog');
const trigger = document.querySelector('#account-trigger');
const closeButton = document.querySelector('#auth-close');
const loading = document.querySelector('#auth-loading');
const authContent = document.querySelector('#auth-content');
const accountContent = document.querySelector('#account-content');
const form = document.querySelector('#auth-form');
const modeButton = document.querySelector('#auth-mode');
const nameField = document.querySelector('#name-field');
const phoneField = document.querySelector('#phone-field');
const marketingField = document.querySelector('#marketing-field');
const heading = document.querySelector('#auth-heading');
const message = document.querySelector('#auth-message');
let auth;
let authApi;
let registerMode = false;

document.querySelector('#year').textContent = new Date().getFullYear();
loadAnnouncement();
trigger.addEventListener('click', async () => { dialog.showModal(); await initialiseAuth(); });
closeButton.addEventListener('click', () => dialog.close());
modeButton.addEventListener('click', () => { registerMode = !registerMode; updateMode(); });

function updateMode() {
  heading.textContent = registerMode ? 'Create your account' : 'Welcome back';
  nameField.hidden = !registerMode;
  phoneField.hidden = !registerMode;
  marketingField.hidden = !registerMode;
  document.querySelector('#auth-name').required = registerMode;
  document.querySelector('#auth-phone').required = registerMode;
  document.querySelector('#auth-password').autocomplete = registerMode ? 'new-password' : 'current-password';
  document.querySelector('#auth-submit').textContent = registerMode ? 'Create account' : 'Sign in';
  modeButton.textContent = registerMode ? 'Already have an account? Sign in' : 'New to HerStep? Create an account';
  message.textContent = '';
}
async function initialiseAuth() {
  if (auth) return;
  try {
    const response = await fetch('/api/firebase-config');
    if (!response.ok) throw new Error('Secure account access is not configured yet. Please contact HerStep Collection.');
    const config = await response.json();
    const [{ initializeApp }, authModule] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js')
    ]);
    authApi = authModule;
    auth = authApi.getAuth(initializeApp(config));
    authApi.onAuthStateChanged(auth, renderAccount);
    loading.hidden = true;
    authContent.hidden = false;
  } catch (error) { loading.querySelector('p:last-child').textContent = error.message; }
}

async function renderAccount(user) {
  window.dispatchEvent(new CustomEvent('herstep-auth-state', { detail: { user, authApi } }));
  if (!user) { trigger.textContent = 'Sign in'; authContent.hidden = false; accountContent.hidden = true; return; }
  trigger.textContent = 'My account';
  authContent.hidden = true; accountContent.hidden = false;
  document.querySelector('#account-name').textContent = user.displayName || 'Your HerStep account';
  document.querySelector('#account-email').textContent = user.email || '';
  try { await syncProfile(user); } catch { /* Authentication remains valid even if the initial profile sync is temporarily unavailable. */ }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault(); message.textContent = '';
  const button = document.querySelector('#auth-submit'); button.disabled = true;
  try {
    const email = form.email.value.trim(); const password = form.password.value;
    if (registerMode) {
      const credential = await authApi.createUserWithEmailAndPassword(auth, email, password);
      await authApi.updateProfile(credential.user, { displayName: form.name.value.trim() });
      await syncProfile(credential.user, form.name.value.trim(), form.phone.value.trim(), form.marketingConsent.checked);
    } else { await authApi.signInWithEmailAndPassword(auth, email, password); }
  } catch (error) { message.textContent = friendlyAuthError(error.code); }
  finally { button.disabled = false; }
});

document.querySelector('#sign-out').addEventListener('click', () => authApi.signOut(auth));
async function syncProfile(user, displayName = '', phoneNumber = null, marketingConsent = false) {
  const token = await user.getIdToken();
  const body = { displayName }; if (phoneNumber) body.phoneNumber = phoneNumber; if (marketingConsent) body.marketingConsent = true;
  const response = await fetch('/api/auth/sync-profile', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify(body) });
  if (!response.ok) throw new Error('Profile sync failed.');
}
function friendlyAuthError(code) {
  const errors = { 'auth/email-already-in-use':'An account already exists for this email address.', 'auth/invalid-email':'Enter a valid email address.', 'auth/weak-password':'Use a password with at least 8 characters.', 'auth/invalid-credential':'Email or password is incorrect.', 'auth/too-many-requests':'Too many attempts. Please wait and try again.' };
  return errors[code] || 'We could not complete that request. Please try again.';
}
async function loadAnnouncement() {
  if (sessionStorage.getItem('herstep-announcement-dismissed')) return;
  try {
    const response = await fetch('/api/announcement'); const { announcement } = await response.json();
    if (!response.ok || !announcement) return;
    const banner = document.createElement('aside'); banner.className = 'announcement-banner';
    banner.innerHTML = `<p>${announcement.message}</p><a class="text-button" href="${announcement.linkUrl}" target="_blank" rel="noopener noreferrer">${announcement.linkLabel}</a><button class="text-button" type="button" aria-label="Dismiss announcement">Dismiss</button>`;
    banner.querySelector('button').addEventListener('click', () => { sessionStorage.setItem('herstep-announcement-dismissed', 'true'); banner.remove(); });
    document.body.prepend(banner);
  } catch { /* Announcements must never prevent the storefront from loading. */ }
}
