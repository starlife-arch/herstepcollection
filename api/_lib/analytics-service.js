function dayKey(date) { return date.toISOString().slice(0, 10); }
function timestamp(value) { return value?.toDate?.() || value; }

export async function buildAdminAnalytics({ db, now = new Date() }) {
  const since = new Date(now); since.setUTCDate(since.getUTCDate() - 29); since.setUTCHours(0, 0, 0, 0);
  const [orders, payments, promoCodes, tickets] = await Promise.all([
    db.collection('orders').where('createdAt', '>=', since).get(), db.collection('payments').where('createdAt', '>=', since).get(), db.collection('promoCodes').get(), db.collection('supportTickets').where('updatedAt', '>=', since).get()
  ]);
  const daily = new Map(); const sizes = new Map(); let paidRevenue = 0; let paidOrders = 0;
  for (const doc of orders.docs) { const order = doc.data(); const createdAt = timestamp(order.createdAt); if (!createdAt) continue; const key = dayKey(createdAt); const point = daily.get(key) || { date: key, orders: 0, revenue: 0 }; point.orders += 1; if (order.paymentStatus === 'PAID') { point.revenue += order.total || 0; paidRevenue += order.total || 0; paidOrders += 1; } daily.set(key, point); for (const item of order.items || []) sizes.set(item.size, (sizes.get(item.size) || 0) + (item.quantity || 0)); }
  const promoCodeUses = promoCodes.docs.map((doc) => ({ code: doc.id, uses: doc.data().usageCount || 0 })).sort((a, b) => b.uses - a.uses).slice(0, 5);
  const resolved = tickets.docs.map((doc) => doc.data()).filter((ticket) => ['RESOLVED', 'CLOSED'].includes(ticket.status) && timestamp(ticket.createdAt) && timestamp(ticket.updatedAt));
  const resolutionHours = resolved.length ? Math.round(resolved.reduce((sum, ticket) => sum + (timestamp(ticket.updatedAt) - timestamp(ticket.createdAt)) / 3_600_000, 0) / resolved.length * 10) / 10 : null;
  return { periodStart: since.toISOString(), revenue: { paid: paidRevenue, paidOrders, averageOrderValue: paidOrders ? Math.round(paidRevenue / paidOrders) : 0 }, ordersByDay: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)), popularSizes: [...sizes.entries()].map(([size, quantity]) => ({ size, quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5), promoCodeUses, support: { resolvedTickets: resolved.length, averageResolutionHours: resolutionHours }, payments: { attempts: payments.docs.length } };
}
