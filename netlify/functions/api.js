import { and, desc, eq, sql } from "drizzle-orm";
import { getUser } from "@netlify/identity";
import { db } from "../../db/index.js";
import { assignments, deliveries, exchanges, members } from "../../db/schema.js";
import { AGE_BANDS, SHOP_FOR } from "../../src/data/giftProfile.js";
import { drawMembers, revealUrl, sanitizeAffiliate, wishLines } from "../../src/server/assignments.js";
import { providerEnv, readProviders, sendEmail, sendSms } from "../../src/server/messages.js";
import { smsText } from "../../src/utils/revealLink.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AGE_IDS = new Set(AGE_BANDS.map((item) => item.id));
const SHOP_IDS = new Set(SHOP_FOR.map((item) => item.id));

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clip(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

async function readJson(req) {
  if (req.method === "GET" || req.method === "DELETE") return {};
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email || "",
    name: user.name || "",
    confirmedAt: user.confirmedAt || "",
  };
}

async function loadOwnedExchange(id, user) {
  if (!UUID.test(id)) return null;
  const [exchange] = await db.select().from(exchanges).where(eq(exchanges.id, id)).limit(1);
  if (!exchange || exchange.organizerId !== user.id) return null;
  return exchange;
}

function memberView(member) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    listTitle: member.listTitle,
    hasWishes: wishLines(member.wishes).length > 0,
  };
}

async function exchangePayload(exchange) {
  const people = await db.select().from(members).where(eq(members.exchangeId, exchange.id));
  const sent = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.exchangeId, exchange.id))
    .orderBy(desc(deliveries.createdAt))
    .limit(40);
  const names = new Map(people.map((person) => [person.id, person.name]));
  return {
    exchange: {
      id: exchange.id,
      title: exchange.title,
      budget: exchange.budget,
      occasion: exchange.occasion,
      eventDate: exchange.eventDate,
      inviteMessage: exchange.inviteMessage,
      drawn: Boolean(exchange.drawnAt),
    },
    members: people.map(memberView),
    deliveries: sent.map((row) => ({
      id: row.id,
      memberName: names.get(row.memberId) || "Someone",
      channel: row.channel,
      status: row.status,
      detail: row.detail,
      createdAt: row.createdAt,
    })),
    providers: readProviders(providerEnv()),
  };
}

async function handleSession() {
  const user = await getUser();
  return json({
    user: user ? publicUser(user) : null,
    providers: readProviders(providerEnv()),
  });
}

async function handleListExchanges(user) {
  const rows = await db
    .select()
    .from(exchanges)
    .where(eq(exchanges.organizerId, user.id))
    .orderBy(desc(exchanges.createdAt));
  return json({
    exchanges: rows.map((row) => ({
      id: row.id,
      title: row.title,
      drawn: Boolean(row.drawnAt),
      eventDate: row.eventDate,
    })),
  });
}

async function handleCreateExchange(user, body) {
  const title = clip(body.title, 120);
  if (!title) return json({ error: "Name the exchange." }, 400);
  const [created] = await db
    .insert(exchanges)
    .values({
      organizerId: user.id,
      organizerEmail: user.email || "",
      title,
      budget: clip(body.budget, 40),
      occasion: clip(body.occasion, 40) || "Christmas",
      eventDate: clip(body.eventDate, 40),
      inviteMessage: clip(body.inviteMessage, 500),
    })
    .returning();
  await db.insert(members).values({
    exchangeId: created.id,
    userId: user.id,
    name: clip(user.name, 80) || "Organizer",
    email: user.email || "",
  });
  return json(await exchangePayload(created), 201);
}

async function handleAddMember(exchange, body) {
  const name = clip(body.name, 80);
  if (!name) return json({ error: "Each person needs a name." }, 400);
  const people = await db.select().from(members).where(eq(members.exchangeId, exchange.id));
  if (people.length >= 100) return json({ error: "This exchange already has 100 people." }, 400);
  if (exchange.drawnAt) return json({ error: "Names are already drawn, so the guest list is closed." }, 409);
  const email = clip(body.email, 160).toLowerCase();
  if (email && people.some((person) => person.email.toLowerCase() === email)) {
    return json({ error: "That email is already on this exchange." }, 400);
  }
  await db.insert(members).values({
    exchangeId: exchange.id,
    name,
    email,
    phone: clip(body.phone, 40),
  });
  return json(await exchangePayload(exchange));
}

async function handleDeleteMember(exchange, memberId) {
  if (exchange.drawnAt) return json({ error: "Names are already drawn, so people stay on the list." }, 409);
  if (!UUID.test(memberId)) return json({ error: "That person was not found." }, 404);
  await db.delete(members).where(and(eq(members.id, memberId), eq(members.exchangeId, exchange.id)));
  return json(await exchangePayload(exchange));
}

async function handleDraw(exchange) {
  if (exchange.drawnAt) return json({ error: "Names are already drawn." }, 409);
  const people = await db.select().from(members).where(eq(members.exchangeId, exchange.id));
  const result = drawMembers(people);
  if (!result.success) return json({ error: result.error || "Could not draw names." }, 400);
  await db.delete(assignments).where(eq(assignments.exchangeId, exchange.id));
  await db.insert(assignments).values(
    result.matches.map((match) => ({
      exchangeId: exchange.id,
      giverMemberId: match.giver.id,
      receiverMemberId: match.receiver.id,
    })),
  );
  await db.update(exchanges).set({ drawnAt: new Date() }).where(eq(exchanges.id, exchange.id));
  const [updated] = await db.select().from(exchanges).where(eq(exchanges.id, exchange.id)).limit(1);
  return json(await exchangePayload(updated));
}

async function recordDelivery(exchangeId, memberId, channel, status, detail) {
  await db.insert(deliveries).values({
    exchangeId,
    memberId,
    channel,
    status,
    detail: clip(detail, 300),
  });
}

async function handleNotify(exchange, body, req, context) {
  if (!exchange.drawnAt) return json({ error: "Draw names before sending links." }, 400);
  const channel = body.channel === "sms" ? "sms" : body.channel === "email" ? "email" : "";
  if (!channel) return json({ error: "Choose email or text." }, 400);
  const env = providerEnv();
  const providers = readProviders(env);
  if (channel === "email" && !providers.emailReady) {
    return json({ error: "Email is not configured. Add RESEND_API_KEY and EMAIL_FROM in Netlify." }, 503);
  }
  if (channel === "sms" && !providers.smsReady) {
    return json({ error: "Texting is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in Netlify." }, 503);
  }

  const people = await db.select().from(members).where(eq(members.exchangeId, exchange.id));
  const pairs = await db.select().from(assignments).where(eq(assignments.exchangeId, exchange.id));
  const byId = new Map(people.map((person) => [person.id, person]));
  const origin = Netlify.env.get("DEPLOY_PRIME_URL") || Netlify.env.get("URL") || context.site?.url || new URL(req.url).origin;
  const affiliate = sanitizeAffiliate(body.affiliate);
  const results = [];

  for (const pair of pairs) {
    const giver = byId.get(pair.giverMemberId);
    const receiver = byId.get(pair.receiverMemberId);
    if (!giver || !receiver) continue;
    const address = channel === "email" ? giver.email : giver.phone;
    if (!address) {
      await recordDelivery(exchange.id, giver.id, channel, "skipped", "No address on file.");
      results.push({ name: giver.name, status: "skipped" });
      continue;
    }
    const url = revealUrl({ origin, event: exchange, giver, receiver, affiliate });
    const text = smsText(
      { title: exchange.title, inviteMessage: exchange.inviteMessage },
      giver.name,
      url,
    );
    try {
      if (channel === "email") {
        await sendEmail({
          to: giver.email,
          subject: `Your private link for ${exchange.title}`,
          text,
          env,
        });
      } else {
        await sendSms({ to: giver.phone, text, env });
      }
      await recordDelivery(exchange.id, giver.id, channel, "sent", "Sent.");
      results.push({ name: giver.name, status: "sent" });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Send failed.";
      await recordDelivery(exchange.id, giver.id, channel, "failed", detail);
      results.push({ name: giver.name, status: "failed" });
    }
  }

  const [updated] = await db.select().from(exchanges).where(eq(exchanges.id, exchange.id)).limit(1);
  const payload = await exchangePayload(updated);
  return json({ ...payload, results });
}

async function handleWishlistGet(user) {
  const email = (user.email || "").toLowerCase();
  const mine = await db.select().from(members).where(eq(members.userId, user.id));
  if (email) {
    const byEmail = await db.select().from(members).where(sql`lower(${members.email}) = ${email}`);
    const seen = new Set(mine.map((row) => row.id));
    for (const row of byEmail) {
      if (!seen.has(row.id)) mine.push(row);
    }
  }

  for (const member of mine) {
    if (member.userId !== user.id && member.email.toLowerCase() === email) {
      await db.update(members).set({ userId: user.id }).where(eq(members.id, member.id));
      member.userId = user.id;
    }
  }

  const lists = [];
  for (const member of mine) {
    const [exchange] = await db.select().from(exchanges).where(eq(exchanges.id, member.exchangeId)).limit(1);
    if (!exchange) continue;
    let givingTo = null;
    if (exchange.drawnAt) {
      const [pair] = await db
        .select()
        .from(assignments)
        .where(and(eq(assignments.exchangeId, exchange.id), eq(assignments.giverMemberId, member.id)))
        .limit(1);
      if (pair) {
        const [receiver] = await db.select().from(members).where(eq(members.id, pair.receiverMemberId)).limit(1);
        if (receiver) {
          givingTo = {
            name: receiver.name,
            listTitle: receiver.listTitle,
            wishes: receiver.wishes,
            hobbies: receiver.hobbies,
            ageBand: receiver.ageBand,
            shopFor: receiver.shopFor,
          };
        }
      }
    }
    lists.push({
      memberId: member.id,
      exchangeId: exchange.id,
      exchangeTitle: exchange.title,
      budget: exchange.budget,
      eventDate: exchange.eventDate,
      listTitle: member.listTitle,
      ageBand: member.ageBand,
      shopFor: member.shopFor,
      wishes: member.wishes,
      hobbies: member.hobbies,
      drawn: Boolean(exchange.drawnAt),
      givingTo,
    });
  }
  return json({ lists });
}

async function handleWishlistSave(user, body) {
  const memberId = clip(body.memberId, 80);
  if (!UUID.test(memberId)) return json({ error: "That wish list was not found." }, 404);
  const [member] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  const email = (user.email || "").toLowerCase();
  const owns = member && (member.userId === user.id || member.email.toLowerCase() === email);
  if (!owns) return json({ error: "That wish list belongs to someone else." }, 403);
  const ageBand = clip(body.ageBand, 20);
  const shopFor = clip(body.shopFor, 20);
  if (ageBand && !AGE_IDS.has(ageBand)) return json({ error: "Pick an age from the list." }, 400);
  if (shopFor && !SHOP_IDS.has(shopFor)) return json({ error: "Pick who the gifts are for." }, 400);
  await db
    .update(members)
    .set({
      userId: user.id,
      listTitle: clip(body.listTitle, 80),
      ageBand,
      shopFor,
      wishes: clip(body.wishes, 4000),
      hobbies: clip(body.hobbies, 500),
    })
    .where(eq(members.id, member.id));
  return handleWishlistGet(user);
}

export default async function handler(req, context) {
  try {
    const body = await readJson(req);
    if (body === null) return json({ error: "That request was not valid JSON." }, 400);
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const user = parts[1] === "session" ? null : await getUser();

    if (req.method === "GET" && parts.length === 2 && parts[1] === "session") {
      return handleSession();
    }
    if (!user?.id) return json({ error: "Sign in to continue." }, 401);

    if (parts[1] === "wishlist") {
      if (req.method === "GET") return handleWishlistGet(user);
      if (req.method === "POST") return handleWishlistSave(user, body);
      return json({ error: "That action is not available." }, 405);
    }

    if (parts[1] === "exchanges" && parts.length === 2) {
      if (req.method === "GET") return handleListExchanges(user);
      if (req.method === "POST") return handleCreateExchange(user, body);
      return json({ error: "That action is not available." }, 405);
    }

    if (parts[1] === "exchanges" && parts[2]) {
      const exchange = await loadOwnedExchange(parts[2], user);
      if (!exchange) return json({ error: "That exchange was not found." }, 404);
      if (parts.length === 3 && req.method === "GET") return json(await exchangePayload(exchange));
      if (parts[3] === "members" && parts.length === 4 && req.method === "POST") return handleAddMember(exchange, body);
      if (parts[3] === "members" && parts[4] && req.method === "DELETE") return handleDeleteMember(exchange, parts[4]);
      if (parts[3] === "draw" && req.method === "POST") return handleDraw(exchange);
      if (parts[3] === "notify" && req.method === "POST") return handleNotify(exchange, body, req, context);
    }

    return json({ error: "That page was not found." }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "Something went wrong. Try again in a moment." }, 500);
  }
}

export const config = {
  path: [
    "/api/session",
    "/api/exchanges",
    "/api/exchanges/:id",
    "/api/exchanges/:id/members",
    "/api/exchanges/:id/members/:memberId",
    "/api/exchanges/:id/draw",
    "/api/exchanges/:id/notify",
    "/api/wishlist",
  ],
};
