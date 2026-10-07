import { createHmac, timingSafeEqual } from "node:crypto";

export const SMS_STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

export function twilioSignature(url, params, token) {
  const keys = Object.keys(params || {}).sort();
  let data = String(url || "");
  for (const key of keys) data += key + String(params[key] ?? "");
  return createHmac("sha1", token).update(data).digest("base64");
}

export function validTwilioSignature({ url, params, token, signature }) {
  if (!token || !signature) return false;
  const expected = twilioSignature(url, params, token);
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
