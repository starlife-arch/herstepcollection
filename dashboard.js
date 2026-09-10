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
    const pendingOrders = data.orders.filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.orderStatus)).length;
    const pendingPayments = data.payments.filter((payment) => payment.status === 'PENDING').length;
    const unread = data.notifications.filter((notification) => !notification.readAt).length;
    const list = (items, empty, renderer) => items.length ? `<div class="dashboard-list">${items.map(renderer).join('')}</div>` : `<p class="dashboard-empty">${empty}</p>`;
    content.innerHTML = `<section class="dashboard-welcome"><div><p class="eyebrow">Account overview</p><h3>Hello, ${escapeHtml(data.profile.displayName || 'there')}.</h3><p>${escapeHtml(data.profile.phoneNumber || 'Add a phone number to make checkout faster.')} </p></div><button class="button" id="dashboard-support" type="button">Contact support</button></section><section class="dashboard-metrics" aria-label="Account summary"><article><span>Orders</span><strong>${data.orders.length}</strong><small>${pendingOrders} currently active</small></article><article><span>Payments</span><strong>${data.payments.length}</strong><small>${pendingPayments} awaiting confirmation</small></article><article><span>Updates</span><strong>${unread}</strong><small>unread notifications</small></article></section><div class="dashboard-columns"><section class="dashboard-section"><div class="dashboard-section-heading"><h3>Recent orders</h3><span>Live status</span></div>${list(data.orders, 'No orders yet. Your next pair will appear here.', (order) => `<article><strong>${escapeHtml(order.orderId)}</strong><span><b class="dashboard-status">${escapeHtml(order.orderStatus)}</b> · ${escapeHtml(order.paymentStatus)}</span><em>${money(order.total)}</em></article>`)}</section><section class="dashboard-section"><div class="dashboard-section-heading"><h3>Payments</h3><span>Secure history</span></div>${list(data.payments, 'No payment history yet.', (payment) => `<article><strong>${escapeHtml(payment.orderId)}</strong><span><b class="dashboard-status">${escapeHtml(payment.status)}</b></span><em>${money(payment.amount)}</em></article>`)}</section></div><section class="dashboard-section dashboard-notifications"><div class="dashboard-section-heading"><h3>Notifications</h3><span>Keep up to date</span></div>${list(data.notifications, 'No notifications yet.', (notification) => `<article><strong>${escapeHtml(notification.title)}</strong><span>${escapeHtml(notification.body)}</span>${notification.readAt ? '' : `<button class="text-button" type="button" data-notification-id="${escapeHtml(notification.id)}">Mark read</button>`}</article>`)}</section>`;
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
