export function renderBroadcast({ content, api }) {
  content.innerHTML = '<section class="admin-panel"><h2>Send a customer broadcast</h2><p>Sends immediately from promotions@herstepcollection.shop only to customers who opted in to marketing.</p><form id="broadcast-form"><label>Audience<select name="audience"><option value="MARKETING_CONSENTED">All marketing-consented customers</option></select></label><label>Subject<input name="subject" maxlength="160" required></label><label>Message<textarea name="message" maxlength="5000" required></textarea></label><p class="form-message" aria-live="polite"></p><button class="button">Send now</button></form></section>';
  content.querySelector('#broadcast-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); const feedback = form.querySelector('.form-message'); button.disabled = true;
    try { const result = await api('/api/admin/broadcast', { method:'POST', body:JSON.stringify({ audience:form.audience.value, subject:form.subject.value, message:form.message.value }) }); feedback.className = 'form-message form-message-success'; feedback.textContent = `Broadcast sent to ${result.sent} recipient${result.sent === 1 ? '' : 's'}${result.failed ? `; ${result.failed} could not be delivered.` : '.'}`; }
    catch (error) { feedback.className = 'form-message'; feedback.textContent = error.message; }
    finally { button.disabled = false; }
  });
}
