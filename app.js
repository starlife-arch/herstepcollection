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
const forgotPasswordButton = document.querySelector('#forgot-password');
const passwordConfirmField = document.querySelector('#password-confirm-field');
const passwordRequirements = document.querySelector('#password-requirements');
let auth;
let authApi;
let registerMode = false;

document.querySelector('#year').textContent = new Date().getFullYear();
loadAnnouncement();
loadHero();
trigger.addEventListener('click', async () => { dialog.showModal(); await initialiseAuth(); });
closeButton.addEventListener('click', () => dialog.close());
modeButton.addEventListener('click', () => { registerMode = !registerMode; updateMode(); });
forgotPasswordButton.addEventListener('click', sendPasswordReset);

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
  forgotPasswordButton.hidden = registerMode;
  passwordConfirmField.hidden = !registerMode;
  passwordRequirements.hidden = !registerMode;
  document.querySelector('#auth-password-confirm').required = registerMode;
  message.textContent = '';
  message.classList.remove('form-message-success');
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
  if (!user) { trigger.textContent = 'Sign in'; document.querySelector('#admin-link').hidden = true; authContent.hidden = false; accountContent.hidden = true; return; }
  trigger.textContent = 'My account';
  authContent.hidden = true; accountContent.hidden = false;
  document.querySelector('#account-name').textContent = user.displayName || 'Your HerStep account';
  document.querySelector('#account-email').textContent = user.email || '';
  await renderAdminLink(user);
  try { await syncProfile(user); } catch { /* Authentication remains valid even if the initial profile sync is temporarily unavailable. */ }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault(); message.textContent = '';
  const button = document.querySelector('#auth-submit'); button.disabled = true;
  try {
    const email = form.email.value.trim(); const password = form.password.value;
    if (registerMode && !isStrongPassword(password)) throw new Error('Use 8+ characters with uppercase, lowercase, a number and a symbol.');
    if (registerMode && password !== form.passwordConfirm.value) throw new Error('Your passwords do not match.');
    if (registerMode) {
      const credential = await authApi.createUserWithEmailAndPassword(auth, email, password);
      await authApi.updateProfile(credential.user, { displayName: form.name.value.trim() });
      await syncProfile(credential.user, form.name.value.trim(), form.phone.value.trim(), form.marketingConsent.checked);
    } else { await authApi.signInWithEmailAndPassword(auth, email, password); }
  } catch (error) { message.textContent = error.message || friendlyAuthError(error.code); }
  finally { button.disabled = false; }
});

document.querySelector('#sign-out').addEventListener('click', async () => {
  if (!authApi || !auth) return;
  await authApi.signOut(auth);
  dialog.close();
  window.location.assign('/');
});
async function renderAdminLink(user) {
  const adminLink = document.querySelector('#admin-link');
  adminLink.hidden = true;
  try {
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js');
    const profile = await firestoreModule.getDoc(firestoreModule.doc(firestoreModule.getFirestore(auth.app), 'users', user.uid));
    adminLink.hidden = !['ADMIN', 'SUPER_ADMIN'].includes(profile.data()?.role);
  } catch { /* The link is convenience-only; server authorization remains authoritative. */ }
}

async function sendPasswordReset() {
  message.textContent = '';
  const email = form.email.value.trim();
  if (!email) { message.textContent = 'Enter your email address first, then choose Forgot password.'; form.email.focus(); return; }
  forgotPasswordButton.disabled = true;
  try {
    await authApi.sendPasswordResetEmail(auth, email);
    message.classList.add('form-message-success');
    message.textContent = 'Password reset instructions have been sent. Check your inbox.';
  } catch (error) {
    message.classList.remove('form-message-success');
    message.textContent = friendlyAuthError(error.code);
  } finally { forgotPasswordButton.disabled = false; }
}
async function syncProfile(user, displayName = '', phoneNumber = null, marketingConsent = false) {
  const token = await user.getIdToken();
  const body = { displayName }; if (phoneNumber) body.phoneNumber = phoneNumber; if (marketingConsent) body.marketingConsent = true;
  const response = await fetch('/api/auth/sync-profile', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body:JSON.stringify(body) });
  if (!response.ok) throw new Error('Profile sync failed.');
}
function isStrongPassword(password) { return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password); }
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
    document.querySelector('footer').before(banner);
  } catch { /* Announcements must never prevent the storefront from loading. */ }
}

async function loadHero() {
  try {
    const response = await fetch('/api/hero'); const { hero } = await response.json();
    if (!response.ok || !hero) return;
    const section = document.querySelector('#storefront-hero');
    document.querySelector('#hero-title').textContent = hero.title;
    document.querySelector('#hero-copy').textContent = hero.copy;
    const cta = document.querySelector('#hero-cta'); cta.textContent = hero.ctaLabel; cta.href = hero.ctaUrl;
    if (hero.imageUrl) section.style.setProperty('--hero-image', `url("${hero.imageUrl.replace(/["\\]/g, '')}")`);
    if (hero.videoUrl) { const video = document.createElement('video'); video.src = hero.videoUrl; video.autoplay = true; video.muted = true; video.loop = true; video.playsInline = true; video.className = 'hero-video'; section.prepend(video); }
  } catch { /* The default hero remains available if merchandising settings cannot load. */ }
}

// A form action that points at mailto: is treated as an insecure form target by
// browsers on HTTPS pages.  Until a consent-aware newsletter provider is wired,
// acknowledge the address locally rather than submitting it anywhere.
document.querySelector('#newsletter-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.querySelector('#newsletter-message');
  if (!form.email.checkValidity()) { form.reportValidity(); return; }
  feedback.classList.add('form-message-success');
  feedback.textContent = 'Thanks — newsletter updates will be available soon.';
  form.reset();
});
