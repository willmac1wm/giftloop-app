import { encodeSecretPayload } from "../utils/crypto.js";
import { DEFAULT_AFFILIATE_CONFIG } from "../utils/affiliate.js";
import { generateSecretSantaDraw } from "../utils/shuffle.js";

const AFFILIATE_KEYS = ["amazonTag", "walmartPublisherId", "bassProPartnerId", "targetPartnerId", "bestBuyPartnerId"];

export function drawMembers(people) {
  const participants = people.map((person) => ({ id: person.id, name: person.name }));
  return generateSecretSantaDraw(participants, [], true);
}

export function wishLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function sanitizeAffiliate(input) {
  if (!input || typeof input !== "object") return { ...DEFAULT_AFFILIATE_CONFIG };
  const next = { ...DEFAULT_AFFILIATE_CONFIG, enabled: input.enabled !== false };
  for (const key of AFFILIATE_KEYS) {
    if (typeof input[key] === "string" && input[key].trim()) {
      next[key] = input[key].trim().slice(0, 80);
    }
  }
  return next;
}

export function revealUrl({ origin, event, giver, receiver, affiliate }) {
  const payload = {
    giverName: giver.name,
    receiverName: receiver.name,
    wishlist: wishLines(receiver.wishes),
    listTitle: receiver.listTitle || "",
    ageBand: receiver.ageBand || "",
    shopFor: receiver.shopFor || "",
    likes: receiver.hobbies || "",
    dislikes: "",
    budget: event.budget || "",
    exchangeDate: event.eventDate || "",
    eventTitle: event.title || "Secret Santa",
    rules: "",
    affiliate: sanitizeAffiliate(affiliate),
  };
  const token = encodeSecretPayload(payload);
  const base = String(origin || "").replace(/\/$/, "");
  return `${base}/?view=reveal&t=${token}`;
}
