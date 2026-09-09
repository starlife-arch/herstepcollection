const [email, requestedRole = 'ADMIN'] = process.argv.slice(2);
const role = requestedRole.toUpperCase();

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  throw new Error('Usage: node scripts/grant-admin.mjs admin@example.com [ADMIN|SUPER_ADMIN]');
}
if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
  throw new Error('Role must be ADMIN or SUPER_ADMIN.');
}

const [{ FieldValue }, { adminAuth, adminDb }] = await Promise.all([
  import('firebase-admin/firestore'),
  import('../api/_lib/firebase-admin.js')
]);
const user = await adminAuth.getUserByEmail(email);
const reference = adminDb.collection('users').doc(user.uid);
await reference.set({
  email: user.email || email,
  displayName: user.displayName || null,
  role,
  updatedAt: FieldValue.serverTimestamp()
}, { merge: true });

console.log(`Granted ${role} to ${user.email} (${user.uid}).`);
