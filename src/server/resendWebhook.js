import { createHmac, timingSafeEqual } from "node:crypto";

export function resendSignature({ id, timestamp, body, secret }) {
  const key = Buffer.from(String(secret || "").replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

export function validResendSignature({ id, timestamp, body, secret, signature }) {
  if (!id || !timestamp || !secret || !signature) return false;
  const expected = resendSignature({ id, timestamp, body, secret });
  const left = Buffer.from(expected);
  return String(signature)
    .split(" ")
    .some((part) => {
      const value = part.startsWith("v1,") ? part.slice(3) : part;
      const right = Buffer.from(value);
      if (left.length !== right.length) return false;
      return timingSafeEqual(left, right);
    });
}
