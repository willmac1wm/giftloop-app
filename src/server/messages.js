export function readProviders(env = {}) {
  return {
    emailReady: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
    smsReady: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER),
  };
}

export function normalizeSmsTo(phone) {
  const raw = String(phone || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export function providerEnv() {
  return {
    RESEND_API_KEY: Netlify.env.get("RESEND_API_KEY") || "",
    EMAIL_FROM: Netlify.env.get("EMAIL_FROM") || "",
    RESEND_WEBHOOK_SECRET: Netlify.env.get("RESEND_WEBHOOK_SECRET") || "",
    TWILIO_ACCOUNT_SID: Netlify.env.get("TWILIO_ACCOUNT_SID") || "",
    TWILIO_AUTH_TOKEN: Netlify.env.get("TWILIO_AUTH_TOKEN") || "",
    TWILIO_FROM_NUMBER: Netlify.env.get("TWILIO_FROM_NUMBER") || "",
  };
}

export async function sendEmail({ to, subject, text, env }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject,
      text,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.error || "Resend rejected the email.");
  }
  return body.id || "sent";
}

export async function sendSms({ to, text, env }) {
  const destination = normalizeSmsTo(to);
  const from = normalizeSmsTo(env.TWILIO_FROM_NUMBER);
  const payload = new URLSearchParams({ To: destination, From: from, Body: text });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || "Twilio rejected the text.");
  }
  return body.sid || "sent";
}
