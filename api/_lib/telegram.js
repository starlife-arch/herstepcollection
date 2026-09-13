let missingConfigurationLogged = false;

/**
 * Sends an operational notification without ever affecting the requesting flow.
 * Telegram is deliberately best-effort: it must not become part of checkout,
 * authentication, payment confirmation, or support-ticket availability.
 */
export async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    if (!missingConfigurationLogged) {
      missingConfigurationLogged = true;
      console.warn('Telegram notifications are not configured; skipping sends.');
    }
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4096) })
    });
    if (!response.ok) {
      console.warn(`Telegram notification failed with status ${response.status}.`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Telegram notification failed.', error instanceof Error ? error.message : error);
    return false;
  }
}
