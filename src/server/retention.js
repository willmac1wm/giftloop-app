import { and, desc, eq, inArray, or } from "drizzle-orm";
import { exchanges, members, wishLists, giftPreferences, exchangeTraditions, notificationJobs } from "../../db/schema.js";
import { cleanTradition, cleanVibe, EMPTY_VIBE, nextExchangeValues } from "../retention/model.js";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
export function retentionService(db) {
  async function access(user, id, ownerOnly = false) {
    if (!UUID.test(String(id || ""))) fail("Exchange not found.", 404);
    const [exchange] = await db.select().from(exchanges).where(eq(exchanges.id, id)).limit(1);
    if (!exchange) fail("Exchange not found.", 404);
    if (exchange.organizerId === user.id) return exchange;
    if (!ownerOnly) {
      const [seat] = await db.select().from(members).where(and(eq(members.exchangeId, id), eq(members.userId, user.id), eq(members.status, "accepted"))).limit(1);
      if (seat) return exchange;
    }
    fail("Exchange not found.", 404);
  }
  return {
    async vibe(user, body) {
      if (body) {
        const data = cleanVibe(body);
        await db.insert(giftPreferences).values({ userId: user.id, ...data }).onConflictDoUpdate({ target: giftPreferences.userId, set: { ...data, updatedAt: new Date() } });
      }
      const [row] = await db.select().from(giftPreferences).where(eq(giftPreferences.userId, user.id));
      return { vibe: row ? cleanVibe(row) : EMPTY_VIBE };
    },
    async clearVibe(user) {
      await db.delete(giftPreferences).where(eq(giftPreferences.userId, user.id));
      return { vibe: EMPTY_VIBE };
    },
    async history(user) {
      const seats = await db.select().from(members).where(and(eq(members.userId, user.id), eq(members.status, "accepted")));
      const ids = seats.map(row => row.exchangeId);
      const rows = await db.select().from(exchanges).where(ids.length ? or(eq(exchanges.organizerId, user.id), inArray(exchanges.id, ids)) : eq(exchanges.organizerId, user.id)).orderBy(desc(exchanges.createdAt));
      return { exchanges: rows.map(row => ({ id: row.id, title: row.title, budget: row.budget, occasion: row.occasion, eventDate: row.eventDate, timezone: row.timezone, organizer: row.organizerId === user.id })) };
    },
    async tradition(user, id, body) {
      const exchange = await access(user, id, Boolean(body));
      if (body) {
        const data = cleanTradition(body);
        await db.insert(exchangeTraditions).values({ exchangeId: id, ...data }).onConflictDoUpdate({ target: exchangeTraditions.exchangeId, set: { ...data, updatedAt: new Date() } });
      }
      const [row] = await db.select().from(exchangeTraditions).where(eq(exchangeTraditions.exchangeId, id));
      const owner = exchange.organizerId === user.id;
      let reminders = [];
      if (owner) reminders = await db.select().from(notificationJobs).where(and(eq(notificationJobs.exchangeId, id), eq(notificationJobs.kind, "reunion"), inArray(notificationJobs.status, ["pending", "sending", "failed"])));
      return { tradition: row ? cleanTradition(row) : cleanTradition({}), organizer: owner,
        reminder: reminders.map(job => ({ id: job.id, runAt: job.runAt, status: job.status, detail: job.detail }))[0] || null };
    },
    async create(user, body) {
      let previous;
      if (body.sourceExchangeId) previous = await access(user, body.sourceExchangeId, true);
      if (body.wishListId) {
        if (!UUID.test(String(body.wishListId))) fail("Choose one of your own lists.");
        const [owned] = await db.select().from(wishLists).where(and(eq(wishLists.id, body.wishListId), eq(wishLists.ownerUserId, user.id)));
        if (!owned) fail("Choose one of your own lists.", 403);
        if (body.wishesReviewed !== true) fail("Review your saved wishes before sharing them with a new group.");
      }
      const values = nextExchangeValues(user, body);
      return db.transaction(async tx => {
        const [exchange] = await tx.insert(exchanges).values(values).returning();
        await tx.insert(members).values({ exchangeId: exchange.id, userId: user.id, email: user.email || "", name: String(user.name || "Organizer").slice(0,80), status: "accepted", exchangeRole: "organizer", wishListId: body.wishListId || null });
        if (previous) {
          const [prior] = await tx.select().from(exchangeTraditions).where(eq(exchangeTraditions.exchangeId, previous.id));
          if (prior) await tx.insert(exchangeTraditions).values({ exchangeId: exchange.id, theme: prior.theme, rules: prior.rules });
        }
        return { exchangeId: exchange.id };
      });
    },
    async reminder(user, id, body) {
      await access(user, id, true);
      const cancel = body.cancel === true;
      const when = new Date(body.runAt);
      if (!cancel && (!Number.isFinite(when.getTime()) || when <= new Date())) fail("Choose a future reminder time.");
      return db.transaction(async tx => {
        await tx.select().from(exchanges).where(eq(exchanges.id, id)).for("update");
        const [seat] = await tx.select().from(members).where(and(eq(members.exchangeId, id), eq(members.userId, user.id), eq(members.status, "accepted"))).limit(1);
        if (!seat) fail("An accepted organizer account is required.");
        const [sending] = await tx.select().from(notificationJobs).where(and(eq(notificationJobs.exchangeId, id), eq(notificationJobs.kind, "reunion"), eq(notificationJobs.status, "sending"))).limit(1);
        if (sending) fail("The reminder is already being sent. Please try again later.", 409);
        await tx.update(notificationJobs).set({ status: "cancelled", detail: "Changed by the organizer." }).where(and(eq(notificationJobs.exchangeId, id), eq(notificationJobs.kind, "reunion"), inArray(notificationJobs.status, ["pending", "failed"])));
        if (!cancel) await tx.insert(notificationJobs).values({ exchangeId: id, memberId: seat.id, channel: "email", kind: "reunion", runAt: when });
        return { saved: true };
      });
    },
  };
}
