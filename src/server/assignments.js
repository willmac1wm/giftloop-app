import { encodeSecretPayload } from "../utils/crypto.js";
import { DEFAULT_AFFILIATE_CONFIG } from "../utils/affiliate.js";
import { generateSecretSantaDraw } from "../utils/shuffle.js";

const AFFILIATE_KEYS = ["amazonTag", "walmartPublisherId", "bassProPartnerId", "targetPartnerId", "bestBuyPartnerId"];

export function drawMembers(people, exclusions = []) {
  const participants = people.map((person) => ({ id: person.id, name: person.name }));
  return generateSecretSantaDraw(participants, exclusions, true);
}

export function planDraw({ alreadyDrawn, people, exclusions }) {
  if (alreadyDrawn) return { alreadyDrawn: true, success: true, matches: null, included: [] };
  const included = (people || []).filter((person) => person.status === "accepted");
  const includedIds = new Set(included.map((person) => person.id));
  const activeExclusions = (exclusions || []).filter(
    (rule) => includedIds.has(rule.giverId) && includedIds.has(rule.receiverId),
  );
  const result = drawMembers(included, activeExclusions);
  return {
    alreadyDrawn: false,
    included: included.map((person) => ({ id: person.id, name: person.name, status: person.status })),
    ...result,
  };
}

export function assignmentNotice({ title, url }) {
  return `Your recipient for ${title || "Secret Santa"} is ready.\n\nSign in to see who you drew:\n${url}\n\nThis message does not include their name.`;
}

export function invitationNotice({ title, url }) {
  return `You are invited to ${title || "a Secret Santa"}.\n\nOpen this link to accept or decline. It does not reveal any assignments:\n${url}`;
}

export function wishListNotice({ title, url }) {
  return `A wish list for ${title || "Secret Santa"} is ready.\n\nOpen it in GiftLoop. Later edits stay on this page:\n${url}\n\nThis message does not include a store link or an assignment.`;
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
    dislikes: receiver.dislikes || "",
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
