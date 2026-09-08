import { FieldValue } from 'firebase-admin/firestore';

// Audit records are only created by trusted server transactions; Firestore rules forbid all writes.
export function createAuditLog(transaction, db, { admin, action, targetType, targetId, previous = null, next = null, metadata = null }) {
  transaction.create(db.collection('auditLogs').doc(), {
    adminId: admin.uid, adminName: admin.name || null, action, targetType, targetId,
    previous, next, metadata, createdAt: FieldValue.serverTimestamp()
  });
}
