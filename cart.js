const CART_KEY = 'herstep-cart-v1';
const cartDialog = document.querySelector('#cart-dialog'); const checkoutDialog = document.querySelector('#checkout-dialog');
const cartLines = document.querySelector('#cart-lines'); const cartCount = document.querySelector('#cart-count');
let user = null; let authApi = null; let checkoutConfig = null;
const formatMoney = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value).replace('KES', 'KSh');
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
const getCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const saveCart = (cart) => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCart(); };

function renderCart() {
  const cart = getCart(); cartCount.textContent = String(cart.reduce((sum, item) => sum + item.quantity, 0));
  if (!cart.length) { cartLines.innerHTML = '<p class="cart-empty">Your cart is empty. Choose a size to add a product.</p>'; document.querySelector('#cart-subtotal').textContent = ''; document.querySelector('#checkout-trigger').disabled = true; return; }
  cartLines.innerHTML = cart.map((item, index) => `<article class="cart-line"><img src="${item.image}" alt="" /><div><h3>${item.name}</h3><p>Size ${item.size}</p><strong>${formatMoney(item.price)}</strong></div><label>Quantity <input data-cart-quantity="${index}" type="number" min="1" max="10" value="${item.quantity}" /></label><button class="text-button" type="button" data-remove-cart="${index}">Remove</button></article>`).join('');
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); document.querySelector('#cart-subtotal').textContent = `Estimated subtotal: ${formatMoney(subtotal)}. Final amounts are confirmed securely at checkout.`; document.querySelector('#checkout-trigger').disabled = false;
}

document.querySelector('#cart-trigger').addEventListener('click', () => { renderCart(); cartDialog.showModal(); });
cartDialog.addEventListener('click', (event) => { if (event.target.closest('[data-close-cart]')) cartDialog.close(); const remove = event.target.closest('[data-remove-cart]'); if (remove) { const cart = getCart(); cart.splice(Number(remove.dataset.removeCart), 1); saveCart(cart); } });
cartLines.addEventListener('change', (event) => { const index = event.target.dataset.cartQuantity; if (index === undefined) return; const quantity = Number(event.target.value); const cart = getCart(); if (Number.isInteger(quantity) && quantity > 0 && quantity <= 10) { cart[index].quantity = quantity; saveCart(cart); } else { renderCart(); } });
window.addEventListener('herstep-add-cart', (event) => { const item = event.detail; const cart = getCart(); const found = cart.find((line) => line.productId === item.productId && line.size === item.size); if (found) found.quantity = Math.min(10, found.quantity + item.quantity); else cart.push(item); saveCart(cart); cartDialog.showModal(); });
window.addEventListener('herstep-auth-state', (event) => { user = event.detail.user; authApi = event.detail.authApi; });

document.querySelector('#checkout-trigger').addEventListener('click', async () => {
  if (!user) { cartDialog.close(); document.querySelector('#account-trigger').click(); return; }
  try { const response = await fetch('/api/checkout/config'); if (!response.ok) throw new Error((await response.json()).error); checkoutConfig = await response.json(); renderCheckout(); cartDialog.close(); checkoutDialog.showModal(); } catch (error) { alert(error.message); }
});
checkoutDialog.addEventListener('click', (event) => { if (event.target.closest('[data-close-checkout]')) checkoutDialog.close(); });
function renderCheckout() {
  const cart = getCart(); const estimated = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelector('#checkout-content').innerHTML = `<form id="checkout-form"><label>Full name<input name="fullName" autocomplete="name" required /></label><label>Phone number<input name="phone" autocomplete="tel" inputmode="tel" placeholder="+254 7…" required /></label><label>Email address<input value="${user.email || ''}" disabled /></label><fieldset><legend>Delivery method</legend><label><input type="radio" name="deliveryMethod" value="COLLECTION" checked /> Collection — Juja Town, Jerry House</label>${checkoutConfig.deliveryEnabled ? '<label><input type="radio" name="deliveryMethod" value="DELIVERY" /> Delivery</label>' : ''}</fieldset><label id="location-field" hidden>Delivery location<textarea name="location" maxlength="300"></textarea></label><label>Additional instructions<textarea name="instructions" maxlength="500"></textarea></label><div class="checkout-summary"><p>Estimated items total <strong>${formatMoney(estimated)}</strong></p><p>Collection fee <strong>${formatMoney(0)}</strong></p><p>Discount <strong>${formatMoney(0)}</strong></p><p>Final total is calculated from live product prices and stock when you submit.</p></div><p class="form-message" id="checkout-message" role="alert"></p><button class="button" type="submit">Create pending order</button></form>`;
  const form = document.querySelector('#checkout-form'); form.deliveryMethod.forEach((input) => input.addEventListener('change', () => { document.querySelector('#location-field').hidden = form.deliveryMethod.value !== 'DELIVERY'; })); form.addEventListener('submit', submitOrder);
}
async function submitOrder(event) {
  event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button[type="submit"]'); const message = document.querySelector('#checkout-message'); button.disabled = true; message.textContent = '';
  try { const token = await user.getIdToken(); const data = new FormData(form); const response = await fetch('/api/orders/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ cart: getCart().map(({ productId, size, quantity }) => ({ productId, size, quantity })), delivery: Object.fromEntries(data) }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Your order could not be created.'); localStorage.removeItem(CART_KEY); renderCart(); renderPayment(body.order); } catch (error) { message.textContent = error.message; button.disabled = false; }
}

function renderPayment(order) {
  document.querySelector('#checkout-content').innerHTML = `<section class="payment-panel"><p class="eyebrow">Secure payment</p><h3>Complete your M-Pesa payment</h3><p>Order <strong>${escapeHtml(order.orderId)}</strong></p><p class="payment-total">Amount due <strong>${formatMoney(order.total)}</strong></p><p id="payment-state" class="payment-state">Your order is pending payment. Request an M-Pesa prompt when you are ready.</p><p class="form-message" id="payment-message" role="alert"></p><button class="button" id="payment-initiate" type="button">Pay with M-Pesa</button><button class="text-button" id="track-order" type="button">View order status</button><div id="tracking-content"></div><div id="receipt-content"></div></section>`;
  document.querySelector('#payment-initiate').addEventListener('click', () => initiatePayment(order.id));
  document.querySelector('#track-order').addEventListener('click', () => renderTracking(order.id));
}

async function renderTracking(orderDocumentId) {
  const target = document.querySelector('#tracking-content');
  try {
    const token = await user.getIdToken(); const response = await fetch(`/api/orders/track?orderDocumentId=${encodeURIComponent(orderDocumentId)}`, { headers: { Authorization: `Bearer ${token}` } }); const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Order tracking is unavailable.'); const order = body.order;
    target.innerHTML = `<section class="order-tracking"><h4>Order status</h4><p><strong>${escapeHtml(order.orderStatus)}</strong> · Payment ${escapeHtml(order.paymentStatus)}</p><ol>${order.history.map((entry) => `<li><strong>${escapeHtml(entry.eventType === 'PAYMENT_STATUS_CHANGED' ? `Payment ${entry.paymentStatus}` : entry.newStatus || 'Order placed')}</strong><span>${escapeHtml(entry.note || entry.source)}</span></li>`).join('')}</ol></section>`;
  } catch (error) { document.querySelector('#payment-message').textContent = error.message; }
}

async function initiatePayment(orderDocumentId) {
  const button = document.querySelector('#payment-initiate'); const message = document.querySelector('#payment-message'); const state = document.querySelector('#payment-state');
  button.disabled = true; message.textContent = ''; state.textContent = 'Requesting a secure M-Pesa prompt…';
  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/payments/stk/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ orderDocumentId }) });
    const body = await response.json(); if (!response.ok) throw new Error(body.error || 'We could not initiate your payment.');
    state.textContent = 'M-Pesa request pending. Complete the prompt on your phone; this page will confirm only after the provider verifies payment.';
    pollPayment(body.payment.id);
  } catch (error) { message.textContent = error.message; state.textContent = 'Payment has not been confirmed.'; button.disabled = false; }
}

async function pollPayment(paymentId, attempt = 0) {
  if (attempt >= 30 || !checkoutDialog.open) return;
  try {
    const token = await user.getIdToken(); const response = await fetch(`/api/payments/status?paymentId=${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Could not check payment status.');
    const payment = body.payment; const state = document.querySelector('#payment-state'); const button = document.querySelector('#payment-initiate');
    if (payment.status === 'PENDING') { setTimeout(() => pollPayment(paymentId, attempt + 1), 4000); return; }
    if (payment.status === 'PAID') { state.textContent = 'Payment confirmed by M-Pesa.'; button.hidden = true; return renderReceipt(paymentId); }
    state.textContent = `Payment ${payment.status.toLowerCase()}. ${payment.failureReason || 'You may try again if prompted.'}`; button.disabled = false;
  } catch (error) { document.querySelector('#payment-message').textContent = error.message; }
}

async function renderReceipt(paymentId) {
  try {
    const token = await user.getIdToken(); const response = await fetch(`/api/payments/receipt?paymentId=${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` } }); const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Receipt unavailable.'); const receipt = body.receipt;
    document.querySelector('#receipt-content').innerHTML = `<article class="receipt"><p class="eyebrow">HerStep Collection</p><h4>Payment receipt</h4><p>Receipt <strong>${escapeHtml(receipt.receiptNumber)}</strong></p><p>Order <strong>${escapeHtml(receipt.orderId)}</strong></p><p>Amount <strong>${formatMoney(receipt.amount)}</strong></p><p>Method <strong>${escapeHtml(receipt.method)}</strong></p><p>Transaction <strong>${escapeHtml(receipt.transactionReference || 'Confirmed')}</strong></p><button class="button button-secondary" type="button" id="print-receipt">Print receipt</button></article>`;
    document.querySelector('#print-receipt').addEventListener('click', () => window.print());
  } catch (error) { document.querySelector('#payment-message').textContent = error.message; }
}
renderCart();
