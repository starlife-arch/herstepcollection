const content = document.querySelector('#dashboard-content');
window.addEventListener('herstep-auth-state', async (event) => {
  const user = event.detail.user; if (!user || !content) return;
  content.textContent = 'Loading your account.';
  try { const response = await fetch('/api/dashboard', { headers:{ Authorization:`Bearer ${await user.getIdToken()}` } }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Your account could not be loaded.'); const data = body.dashboard; content.innerHTML = `<section class="dashboard-section"><h2>${data.profile.displayName || 'Your account'}</h2><p>${data.profile.phoneNumber || 'Add delivery details at checkout.'}</p></section><section class="dashboard-section"><h2>Recent orders</h2>${data.orders.length ? data.orders.map((order) => `<article><strong>${order.orderId}</strong><span><b class="status-badge status-badge-neutral">${order.orderStatus}</b> <b class="status-badge status-badge-neutral">${order.paymentStatus}</b></span></article>`).join('') : '<p>No orders yet.</p>'}</section>`; } catch (error) { content.textContent = error.message; }
});
