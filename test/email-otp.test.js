import test from 'node:test';
import assert from 'node:assert/strict';
import { sendEmail } from '../api/_lib/email-service.js';
import { createOtp, verifyOtp } from '../api/_lib/otp.js';

test('uses Brevo transactional API with the selected named sender', async () => {
  const previous = { key: process.env.BREVO_API_KEY, orders: process.env.BREVO_SENDER_ORDERS };
  process.env.BREVO_API_KEY = 'test-key'; process.env.BREVO_SENDER_ORDERS = 'orders@herstep.co.ke';
  let request; await sendEmail({ purpose: 'orders', to: 'customer@example.test', subject: 'Order', htmlContent: '<p>Hello</p>', fetchImpl: async (url, options) => { request = { url, options }; return new Response(JSON.stringify({ messageId: '1' }), { status: 201 }); } });
  assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email'); assert.equal(request.options.headers['api-key'], 'test-key'); assert.equal(JSON.parse(request.options.body).sender.email, 'orders@herstep.co.ke');
  process.env.BREVO_API_KEY = previous.key; process.env.BREVO_SENDER_ORDERS = previous.orders;
});

test('OTP verification rejects incorrect and expired codes', () => {
  const otp = createOtp();
  assert.throws(() => verifyOtp({ hash: otp.hash, expiresAt: new Date(Date.now() - 1) }, otp.code), /invalid or has expired/);
  assert.throws(() => verifyOtp({ hash: otp.hash, expiresAt: otp.expiresAt }, '000000'), /invalid or has expired/);
  assert.doesNotThrow(() => verifyOtp({ hash: otp.hash, expiresAt: otp.expiresAt }, otp.code));
});
