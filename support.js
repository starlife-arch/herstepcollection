const dialog = document.querySelector('#support-dialog');
const content = document.querySelector('#support-content');
let user = null;
let unsubscribe = null;
let firestoreApi = null;
let db = null;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
const stamp = (value) => value ? new Date(value).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now';
const messageId = () => crypto.randomUUID().replace(/-/g, '');

window.addEventListener('herstep-auth-state', (event) => { user = event.detail.user; if (!user) unsubscribe?.(); });
window.addEventListener('herstep-open-support', () => openSupport());
document.querySelector('#support-trigger').addEventListener('click', openSupport);
document.querySelector('#support-close').addEventListener('click', () => { unsubscribe?.(); unsubscribe = null; dialog.close(); });

async function openSupport() {
  dialog.showModal();
  if (!user) { content.innerHTML = '<p>Please sign in to open or view a support request.</p>'; return; }
  await loadTickets();
}

async function request(path, options = {}) {
  const token = await user.getIdToken(); const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Support is unavailable.'); return body;
}

async function loadTickets() {
  content.textContent = 'Loading your support requests.';
  try {
    const { tickets } = await request('/api/support');
    content.innerHTML = `<button class="button" id="new-ticket" type="button">New support request</button><section class="support-ticket-list"><h3>Your tickets</h3>${tickets.length ? tickets.map((ticket) => `<button class="support-ticket" type="button" data-ticket-id="${escapeHtml(ticket.id)}"><strong>${escapeHtml(ticket.ticketId)} · ${escapeHtml(ticket.status)}</strong><span>${escapeHtml(ticket.subject)}</span><small>${escapeHtml(ticket.lastMessage || '')}</small></button>`).join('') : '<p>No support tickets yet.</p>'}</section>`;
    content.querySelector('#new-ticket').addEventListener('click', renderNewTicket);
    content.querySelectorAll('[data-ticket-id]').forEach((button) => button.addEventListener('click', () => openThread(button.dataset.ticketId)));
  } catch (error) { content.textContent = error.message; }
}

function renderNewTicket() {
  content.innerHTML = `<form id="new-ticket-form"><label>Subject<input name="subject" minlength="3" maxlength="140" required /></label><label>How can we help?<textarea name="message" maxlength="4000" required></textarea></label><label>Related order ID (optional)<input name="orderDocumentId" maxlength="80" /></label><p class="form-message" role="alert"></p><button class="button" type="submit">Send request</button><button class="text-button" id="ticket-back" type="button">Back to tickets</button></form>`;
  content.querySelector('#ticket-back').addEventListener('click', loadTickets);
  content.querySelector('#new-ticket-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget; const feedback = form.querySelector('.form-message'); const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try { const result = await request('/api/support', { method: 'POST', body: JSON.stringify({ subject: form.subject.value, message: form.message.value, orderDocumentId: form.orderDocumentId.value || null, clientMessageId: messageId() }) }); await openThread(result.ticket.id); } catch (error) { feedback.textContent = error.message; submit.disabled = false; }
  });
}

async function ensureFirestore() {
  if (db) return;
  const configResponse = await fetch('/api/firebase-config'); if (!configResponse.ok) throw new Error('Live support is not configured.');
  const config = await configResponse.json();
  const [{ initializeApp, getApps }, api] = await Promise.all([import('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js'), import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js')]);
  firestoreApi = api; db = api.getFirestore(getApps()[0] || initializeApp(config));
}

async function openThread(ticketDocumentId) {
  unsubscribe?.(); content.textContent = 'Opening conversation.';
  try {
    await ensureFirestore();
    const ticket = (await request('/api/support')).tickets.find((item) => item.id === ticketDocumentId);
    if (!ticket) throw new Error('Support ticket not found.');
    content.innerHTML = `<section class="support-thread-header"><button class="text-button" id="ticket-back" type="button">Back to tickets</button><h3>${escapeHtml(ticket.ticketId)} · ${escapeHtml(ticket.status)}</h3><p>${escapeHtml(ticket.subject)}</p></section><div class="support-messages" id="support-messages" aria-live="polite"></div><form class="support-compose" id="support-compose"><label class="sr-only" for="support-message">Message</label><textarea id="support-message" name="message" maxlength="4000" required ${ticket.status === 'CLOSED' ? 'disabled' : ''} placeholder="Write a message"></textarea><p class="form-message" role="alert"></p>${ticket.status === 'CLOSED' ? '<p>This support ticket has been closed.</p>' : '<button class="button" type="submit">Send message</button>'}</form>`;
    content.querySelector('#ticket-back').addEventListener('click', loadTickets);
    const messages = content.querySelector('#support-messages');
    unsubscribe = firestoreApi.onSnapshot(firestoreApi.query(firestoreApi.collection(db, 'supportTickets', ticketDocumentId, 'messages'), firestoreApi.orderBy('createdAt', 'asc')), (snapshot) => {
      messages.innerHTML = snapshot.docs.map((doc) => { const item = doc.data(); const mine = item.senderId === user.uid; return `<article class="chat-message ${mine ? 'chat-message-mine' : 'chat-message-admin'}"><p>${escapeHtml(item.body)}</p><small>${escapeHtml(item.senderRole === 'ADMIN' ? 'HerStep support' : 'You')} · ${stamp(item.createdAt?.toDate?.()?.toISOString())}</small></article>`; }).join(''); messages.scrollTop = messages.scrollHeight;
    }, () => { messages.textContent = 'Live messages could not be loaded.'; });
    content.querySelector('#support-compose').addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const feedback = form.querySelector('.form-message'); const button = form.querySelector('button'); button.disabled = true;
      try { await request('/api/support/messages', { method: 'POST', body: JSON.stringify({ ticketDocumentId, message: form.message.value, clientMessageId: messageId() }) }); form.reset(); } catch (error) { feedback.textContent = error.message; } finally { button.disabled = false; }
    });
  } catch (error) { content.textContent = error.message; }
}
