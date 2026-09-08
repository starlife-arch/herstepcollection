function iso(value) { return value?.toDate?.().toISOString() || null; }
function orderSummary(id, order) { return { id, orderId: order.orderId, customerId: order.customerId, total: order.total, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, createdAt: iso(order.createdAt) }; }
function paymentSummary(id, payment) { return { id, orderId: payment.orderId, amount: payment.amount, status: payment.status, providerReference: payment.providerReference || null, createdAt: iso(payment.createdAt) }; }
function ticketSummary(id, ticket) { return { id, ticketId: ticket.ticketId, subject: ticket.subject, status: ticket.status, customerId: ticket.customerId, hasUnreadAdminMessages: ticket.hasUnreadAdminMessages === true, updatedAt: iso(ticket.updatedAt) }; }
async function count(query) { return (await query.count().get()).data().count; }

export async function buildAdminDashboard({ db }) {
  const orders = db.collection('orders'); const payments = db.collection('payments'); const tickets = db.collection('supportTickets');
  const [totalOrders, pendingOrders, processingOrders, outForDeliveryOrders, deliveredOrders, pendingPayments, totalPayments, failedPayments, cancelledPayments, openTickets, openTicketDocs, discountPending, bulkPending, recentOrders, recentPayments, recentTickets, promotions, promoCodes] = await Promise.all([
    count(orders), count(orders.where('orderStatus', '==', 'PENDING')), count(orders.where('orderStatus', '==', 'PROCESSING')), count(orders.where('orderStatus', '==', 'OUT_FOR_DELIVERY')), count(orders.where('orderStatus', '==', 'DELIVERED')),
    count(payments.where('status', '==', 'PENDING')), count(payments), count(payments.where('status', '==', 'FAILED')), count(payments.where('status', '==', 'CANCELLED')),
    count(tickets.where('status', '==', 'OPEN')), tickets.where('status', '==', 'OPEN').get(), count(db.collection('discountRequests').where('status', '==', 'PENDING')), count(db.collection('bulkOrderRequests').where('status', '==', 'PENDING')),
    orders.orderBy('createdAt', 'desc').limit(10).get(), payments.orderBy('createdAt', 'desc').limit(10).get(), tickets.orderBy('updatedAt', 'desc').limit(10).get(), db.collection('promotions').get(), db.collection('promoCodes').get()
  ]);
  const promoCodeData = promoCodes.docs.map((doc) => doc.data()); const paymentFailureRate = totalPayments ? Math.round(((failedPayments + cancelledPayments) / totalPayments) * 100) : 0;
  return {
    orders: { total: totalOrders, pending: pendingOrders, processing: processingOrders, outForDelivery: outForDeliveryOrders, delivered: deliveredOrders, recent: recentOrders.docs.map((doc) => orderSummary(doc.id, doc.data())) },
    payments: { pending: pendingPayments, total: totalPayments, failedOrCancelled: failedPayments + cancelledPayments, failureOrCancellationRate: paymentFailureRate, recent: recentPayments.docs.map((doc) => paymentSummary(doc.id, doc.data())) },
    support: { open: openTickets, unassigned: openTicketDocs.docs.filter((doc) => !doc.data().assignedAdminId).length, recent: recentTickets.docs.map((doc) => ticketSummary(doc.id, doc.data())) },
    requests: { discountPending, bulkPending },
    promotions: { active: promotions.docs.filter((doc) => doc.data().active === true).length, promoCodes: promoCodeData.length, promoCodeUses: promoCodeData.reduce((sum, promo) => sum + (promo.usageCount || 0), 0) }
  };
}
