const dialog = document.querySelector('#dashboard-dialog');
const content = document.querySelector('#dashboard-content');
let user = null;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
const money = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value || 0).replace('KES', 'KSh');

window.addEventListener('herstep-auth-state', (event) => { user = event.detail.user; });
document.querySelector('#dashboard-trigger').addEventListener('click', async () => { dialog.showModal(); await loadDashboard(); });
document.querySelector('#dashboard-close').addEventListener('click', () => dialog.close());

async function loadDashboard() {
  content.textContent = 'Loading your account.';
  try {
    const token = await user.getIdToken(); const response = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } }); const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Your dashboard is unavailable.'); const data = body.dashboard;
    content.innerHTML = `<section class="dashboard-profile"><h3>${escapeHtml(data.profile.displayName || 'Your profile')}</h3><p>${escapeHtml(data.profile.phoneNumber || 'No saved phone number')}</p><p>${escapeHtml(data.profile.deliveryDetails || 'No saved delivery details')}</p></section><section class="dashboard-section"><h3>Support</h3><p>Open a request or continue a live conversation with our support team.</p><button class="button" id="dashboard-support" type="button">Open support</button></section><section class="dashboard-section"><h3>Recent orders</h3>${data.orders.length ? `<ul>${data.orders.map((order) => `<li><strong>${escapeHtml(order.orderId)}</strong><span>${escapeHtml(order.orderStatus)} · ${escapeHtml(order.paymentStatus)} · ${money(order.total)}</span></li>`).join('')}</ul>` : '<p>No orders yet.</p>'}</section><section class="dashboard-section"><h3>Payments</h3>${data.payments.length ? `<ul>${data.payments.map((payment) => `<li><strong>${escapeHtml(payment.orderId)}</strong><span>${escapeHtml(payment.status)} · ${money(payment.amount)}</span></li>`).join('')}</ul>` : '<p>No payment history yet.</p>'}</section><section class="dashboard-section"><h3>Notifications</h3>${data.notifications.length ? `<ul>${data.notifications.map((notification) => `<li><strong>${escapeHtml(notification.title)}</strong><span>${escapeHtml(notification.body)}</span>${notification.readAt ? '' : `<button class="text-button" type="button" data-notification-id="${escapeHtml(notification.id)}">Mark read</button>`}</li>`).join('')}</ul>` : '<p>No notifications yet.</p>'}</section>`;
    content.querySelector('#dashboard-support').addEventListener('click', () => { dialog.close(); window.dispatchEvent(new Event('herstep-open-support')); });
    content.querySelectorAll('[data-notification-id]').forEach((button) => button.addEventListener('click', () => markRead(button.dataset.notificationId, button)));
  } catch (error) { content.textContent = error.message; }
}

async function markRead(notificationId, button) {
  try {
    const token = await user.getIdToken(); const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ notificationId }) });
    if (!response.ok) throw new Error((await response.json()).error || 'Could not update notification.'); button.remove();
  } catch (error) { content.insertAdjacentHTML('afterbegin', `<p class="form-message">${escapeHtml(error.message)}</p>`); }
}
