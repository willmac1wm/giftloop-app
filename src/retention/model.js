export const GIFT_APPROACHES = {
  list: "Choose from my list",
  inspiration: "Use my list for inspiration",
  surprise: "Surprise me",
};
export const EMPTY_VIBE = { interests: "", avoid: "", approach: "inspiration", secondhand: false, handmade: false, experiences: false };
const clip = (value, max) => String(value ?? "").trim().slice(0, max);
export function cleanVibe(body) {
  if (!Object.hasOwn(GIFT_APPROACHES, body.approach)) throw new Error("Choose how you would like someone to use your list.");
  return { interests: clip(body.interests, 500), avoid: clip(body.avoid, 500), approach: body.approach,
    secondhand: body.secondhand === true, handmade: body.handmade === true, experiences: body.experiences === true };
}
export function cleanTradition(body) {
  const photo = String(body.photo || "");
  // Inline raster only: no remote tracking URLs, SVG, or externally fetched files.
  if (photo && (photo.length > 450000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))) throw new Error("Choose a smaller JPEG photo.");
  if (photo && body.photoApproved !== true) throw new Error("Confirm permission from everyone pictured before sharing the photo.");
  return { theme: clip(body.theme, 120), rules: clip(body.rules, 1500), memory: clip(body.memory, 1500), photo, photoApproved: Boolean(photo) };
}
export function nextExchangeValues(user, body) {
  const title = clip(body.title, 120);
  if (!title) throw new Error("Name your new exchange.");
  const eventDate = clip(body.eventDate, 10);
  if (eventDate && (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || new Date(`${eventDate}T12:00:00Z`).toISOString().slice(0, 10) !== eventDate)) throw new Error("Choose a valid gift date.");
  const timezone = clip(body.timezone, 64) || "UTC";
  new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  // Deliberate allowlist: no old dates, memberships, exclusions, pairings, consent,
  // reservations, photos, invitations or tokens are copied into another group.
  return { organizerId: user.id, organizerEmail: user.email || "", title,
    occasion: clip(body.occasion, 40) || "Gift exchange", budget: clip(body.budget, 40),
    eventDate, timezone, status: "accepting" };
}
