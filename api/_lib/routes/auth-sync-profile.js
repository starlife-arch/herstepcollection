import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireUser } from '../firebase-admin.js';
import { normalizeKenyanPhone } from '../phone.js';
import { deliverQueuedEmailInline, queueEmail, emailHtml } from '../email-service.js';
import { sendTelegramMessage } from '../telegram.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await requireUser(request);
    const displayName = typeof request.body?.displayName === 'string'
      ? request.body.displayName.trim().slice(0, 100)
      : null;
    const suppliedPhone = request.body?.phoneNumber;
    const phoneNumber = suppliedPhone == null ? null : normalizeKenyanPhone(suppliedPhone);
    const deliveryDetails = typeof request.body?.deliveryDetails === 'string'
      ? request.body.deliveryDetails.trim().slice(0, 500)
      : null;
    const reference = adminDb.collection('users').doc(user.uid);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      if (!phoneNumber && !user.phone_number) return response.status(400).json({ error: 'A valid phone number is required.' });
      await reference.set({
        uid: user.uid,
        email: user.email ?? null,
        displayName: displayName || user.name || null,
        phoneNumber: phoneNumber || normalizeKenyanPhone(user.phone_number),
        deliveryDetails: deliveryDetails || null,
        marketingConsent: false,
        role: 'CUSTOMER',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      // A welcome message is queued and sent only for the initial profile creation.
      if (user.email) {
        const emailKey = `${user.uid}-WELCOME`;
        await adminDb.runTransaction(async (transaction) => { queueEmail(transaction, adminDb, { key: emailKey, purpose: 'hello', to: user.email, subject: 'Welcome to HerStep — A New Journey Begins With You', htmlContent: emailHtml('Welcome to HerStep Collection!', `<p>Thank you for creating your HerStep Collection account. We're genuinely happy to have you with us.</p><p>HerStep Collection was created with a simple idea: finding the right pair of shoes should feel exciting, personal, and accessible.</p><h2>A Note From Our Founder</h2><p>My name is Kelvin, the founder of HerStep Collection.</p><p>Like many dreams, HerStep didn't begin with everything figured out. It started with a vision, a willingness to learn, and the belief that something small could eventually become something meaningful.</p><p>I've always believed that building a business is about more than selling a product. It's about creating something people can trust, something they can come back to, and something that can grow with the people it serves.</p><p>That's why I started HerStep Collection — to build a footwear brand where style, quality, convenience, and customer experience come together.</p><h2>Why Choose HerStep?</h2><p>At HerStep Collection, we're focused on giving you:</p><ul><li>A carefully selected range of stylish footwear</li><li>Affordable options for different budgets</li><li>A simple and convenient online shopping experience</li><li>Reliable order and payment tracking</li><li>Customer support when you need it</li><li>A growing collection of designs, sizes, and styles</li></ul><p>Whether you're looking for everyday flats, sandals, heels, platforms, or something for a special occasion, we want your next pair to feel like the right choice.</p><h2>Explore HerStep Collection</h2><p>Visit our website and explore our latest collection: <a href="https://www.herstepcollection.shop">www.herstepcollection.shop</a></p><p>HerStep Collection<br>Juja Town<br>Jerry House, near Juja Posta<br>Outside Shop No. 12</p><h2>Get In Touch</h2><p>Call: <a href="tel:+254799021089">+254 799 021 089</a><br>WhatsApp: <a href="https://wa.me/254106624924">+254 106 624 924</a><br>Email: <a href="mailto:herstepcollection@gmail.com">herstepcollection@gmail.com</a></p><p>Thank you for being part of the beginning of this journey.<br>We hope HerStep Collection becomes a brand you can trust, shop from, and proudly recommend.</p><p>Step Into Your Style.</p><p>Kelvin<br>Founder, HerStep Collection<br>© 2026 HerStep Collection</p>`, { ctaLabel:'Explore HerStep Collection', ctaUrl:'https://www.herstepcollection.shop' }) }); });
        await deliverQueuedEmailInline({ db: adminDb, key: emailKey });
      }
      await sendTelegramMessage(`New customer sign-up: ${displayName || user.name || 'Customer'} · ${user.email || phoneNumber || normalizeKenyanPhone(user.phone_number) || user.uid}`);
    } else {
      await reference.update({
        email: user.email ?? snapshot.data().email ?? null,
        ...(displayName ? { displayName } : {}),
        ...(phoneNumber ? { phoneNumber } : {}),
        ...(deliveryDetails ? { deliveryDetails } : {}),
        ...(typeof request.body?.marketingConsent === 'boolean' ? { marketingConsent: request.body.marketingConsent } : {}),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to set up your account.' });
  }
}
