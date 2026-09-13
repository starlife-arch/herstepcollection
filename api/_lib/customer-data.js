export function dashboardOrder(orderDocumentId, order) {
  return { id: orderDocumentId, orderId: order.orderId, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, total: order.total, currency: order.currency, items: (order.items || []).map((item) => ({ productId:item.productId, name:item.name, size:item.size, quantity:item.quantity, lineTotal:item.lineTotal, imageUrl:item.imageUrl || item.image || null })), createdAt: order.createdAt?.toDate?.().toISOString() || null };
}

export function notificationResponse(id, notification) {
  return { id, event: notification.event, title: notification.title, body: notification.body, orderDocumentId: notification.orderDocumentId, readAt: notification.readAt?.toDate?.().toISOString() || null, createdAt: notification.createdAt?.toDate?.().toISOString() || null };
}
