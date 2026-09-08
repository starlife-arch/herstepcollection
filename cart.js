const CART_KEY = 'herstep-cart-v1';
const cartDialog = document.querySelector('#cart-dialog'); const checkoutDialog = document.querySelector('#checkout-dialog');
const cartLines = document.querySelector('#cart-lines'); const cartCount = document.querySelector('#cart-count');
let user = null; let authApi = null; let checkoutConfig = null;
const formatMoney = (value) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value).replace('KES', 'KSh');
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
  try { const token = await user.getIdToken(); const data = new FormData(form); const response = await fetch('/api/orders/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ cart: getCart().map(({ productId, size, quantity }) => ({ productId, size, quantity })), delivery: Object.fromEntries(data) }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Your order could not be created.'); localStorage.removeItem(CART_KEY); renderCart(); document.querySelector('#checkout-content').innerHTML = `<div class="order-created"><h3>Order created</h3><p>Your order reference is <strong>${body.order.orderId}</strong>.</p><p>Amount due: <strong>${formatMoney(body.order.total)}</strong></p><p>Payment is pending. M-Pesa payment will be introduced in the next phase; no payment has been requested or confirmed.</p></div>`; } catch (error) { message.textContent = error.message; button.disabled = false; }
}
renderCart();
