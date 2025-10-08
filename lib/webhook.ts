export async function postWebhook(payload: any) {
  const url = process.env.LEADPILOT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch {}
}
