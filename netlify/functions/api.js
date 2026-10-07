import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { getUser } from "@netlify/identity";
import { db } from "../../db/index.js";
import {
  assignments,
  deliveries,
  exclusions,
  exchanges,
  members,
  merchants,
  notificationJobs,
  notificationPrefs,
  reservations,
  tickets,
  wishItems,
  wishLists,
} from "../../db/schema.js";
import { AGE_BANDS, SHOP_FOR } from "../../src/data/giftProfile.js";
import {
  acceptDecision,
  interpretDrawLock,
  ownerWishItem,
  recipientForMember,
  staffRole,
  supportLookupView,
  withoutPairings,
} from "../../src/server/access.js";
import { assignmentNotice, invitationNotice, planDraw, wishLines } from "../../src/server/assignments.js";
import { normalizeSmsTo, providerEnv, readProviders, sendEmail, sendSms } from "../../src/server/messages.js";
import { deliveryDecision, reminderRunAt } from "../../src/server/notifyPolicy.js";
import { DEFAULT_MERCHANTS, finalizeShoppingLink } from "../../src/server/shoppingLink.js";
import { SMS_STOP_WORDS, validTwilioSignature } from "../../src/server/twilio.js";
import { DEFAULT_AFFILIATE_CONFIG } from "../../src/utils/affiliate.js";

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

async function loadManagedExchange(id, user) {
  if (!UUID.test(String(id || ""))) return null;
  const [exchange] = await db.select().from(exchanges).where(eq(exchanges.id, id)).limit(1);
  if (!exchange) return null;
  if (exchange.organizerId === user.id) return { exchange, organizer: true };
  const [seat] = await db
    .select()
    .from(members)
    .where(and(eq(members.exchangeId, id), eq(members.userId, user.id), eq(members.exchangeRole, "co_organizer")))
    .limit(1);
  if (!seat) return null;
  return { exchange, organizer: false };
}

function memberView(member) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    listTitle: member.listTitle,
    hasWishes: wishLines(member.wishes).length > 0 || Boolean(member.wishListId),
    status: member.status || "invited",
    exchangeRole: member.exchangeRole || "member",
    inviteToken: member.inviteToken || "",
  };
}

async function exchangePayload(exchange) {
  const people = await db.select().from(members).where(eq(members.exchangeId, exchange.id));
  const rules = await db.select().from(exclusions).where(eq(exclusions.exchangeId, exchange.id));
  const sent = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.exchangeId, exchange.id))
    .orderBy(desc(deliveries.createdAt))
    .limit(40);
  const names = new Map(people.map((person) => [person.id, person.name]));
  const accepted = people.filter((person) => person.status === "accepted");
  const view = {
    exchange: {
      id: exchange.id,
      title: exchange.title,
      budget: exchange.budget,
      occasion: exchange.occasion,
      eventDate: exchange.eventDate,
      signupDeadline: exchange.signupDeadline || "",
      timezone: exchange.timezone || "America/Los_Angeles",
      inviteMessage: exchange.inviteMessage,
      status: exchange.drawnAt ? "drawn" : exchange.status || "accepting",
      drawn: Boolean(exchange.drawnAt),
      drawReady: accepted.length >= 2 && !exchange.drawnAt,
      includedCount: accepted.length,
    },
    members: people.map(memberView),
    exclusions: rules.map((rule) => ({
      id: rule.id,
      giverMemberId: rule.giverMemberId,
      receiverMemberId: rule.receiverMemberId,
      giverName: names.get(rule.giverMemberId) || "Someone",
      receiverName: names.get(rule.receiverMemberId) || "Someone",
    })),
    deliveries: sent.map((row) => ({
      id: row.id,
      memberName: names.get(row.memberId) || "Someone",
      channel: row.channel,
      status: row.status,
      detail: row.detail,
      kind: row.kind,
      createdAt: row.createdAt,
    })),
    providers: readProviders(providerEnv()),
  };
  return withoutPairings(view);
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
      signupDeadline: clip(body.signupDeadline, 40),
      timezone: clip(body.timezone, 64) || "America/Los_Angeles",
      inviteMessage: clip(body.inviteMessage, 500),
      status: "accepting",
    })
    .returning();
  await db.insert(members).values({
    exchangeId: created.id,
    userId: user.id,
    name: clip(user.name, 80) || "Organizer",
    email: user.email || "",
    status: "accepted",
    exchangeRole: "organizer",
  });
  return json(await exchangePayload(created), 201);
}

async function handleAddMember(exchange, body) {
  const name = clip(body.name, 80);
  if (!name) return json({ error: "Each person needs a name." }, 400);
  const people = await db.select().from(members).where(eq(members.exchangeId, exchange.id));
  if (people.length >= 100) return json({ error: "This exchange already has 100 people." }, 400);
  if (exchange.drawnAt) {
    return json({ error: "Names are already drawn. Cancel the draw before adding someone." }, 409);
  }
  const email = clip(body.email, 160).toLowerCase();
  if (email && people.some((person) => person.email.toLowerCase() === email)) {
    return json({ error: "That email is already on this exchange." }, 400);
  }
  const role = body.role === "co_organizer" ? "co_organizer" : "member";
  await db.insert(members).values({
    exchangeId: exchange.id,
    name,
    email,
    phone: clip(body.phone, 40),
    status: "invited",
    inviteToken: crypto.randomUUID(),
    exchangeRole: role,
  });
  return json(await exchangePayload(exchange));
}

async function handleDeleteMember(exchange, memberId) {
  if (exchange.drawnAt) return json({ error: "Names are already drawn. Cancel the draw before removing someone." }, 409);
  if (!UUID.test(memberId)) return json({ error: "That person was not found." }, 404);
  const [target] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.exchangeId, exchange.id)))
    .limit(1);
  if (!target) return json({ error: "That person was not found." }, 404);
  if (target.exchangeRole === "organizer") return json({ error: "The organizer stays on the exchange." }, 400);
  await db.delete(members).where(eq(members.id, target.id));
  return json(await exchangePayload(exchange));
}

async function loadDrawInput(exchange) {
  const people = await db.select().from(members).where(eq(members.exchangeId, exchange.id));
  const rules = await db.select().from(exclusions).where(eq(exclusions.exchangeId, exchange.id));
  return {
    people,
    exclusions: rules.map((rule) => ({ giverId: rule.giverMemberId, receiverId: rule.receiverMemberId })),
  };
}

async function saveDraw(exchangeId, matches) {
  await db.transaction(async (tx) => {
    await tx.delete(assignments).where(eq(assignments.exchangeId, exchangeId));
    await tx.insert(assignments).values(
      matches.map((match) => ({
        exchangeId,
        giverMemberId: match.giver.id,
        receiverMemberId: match.receiver.id,
      })),
    );
    await tx.update(exchanges).set({ drawnAt: new Date(), status: "drawn" }).where(eq(exchanges.id, exchangeId));
  });
}

async function handleDraw(exchange) {
  if (exchange.drawnAt) {
    return json({ ...(await exchangePayload(exchange)), alreadyDrawn: true });
  }
  const input = await loadDrawInput(exchange);
  const planned = planDraw({ alreadyDrawn: false, ...input });
  if (!planned.success) {
    return json({ error: planned.error || "Could not draw names.", included: planned.included }, 400);
  }
  const [locked] = await db
    .update(exchanges)
    .set({ status: "drawing" })
    .where(and(eq(exchanges.id, exchange.id), isNull(exchanges.drawnAt), ne(exchanges.status, "drawing")))
    .returning();
  const claim = interpretDrawLock({ locked, fresh: locked ? null : (await db.select().from(exchanges).where(eq(exchanges.id, exchange.id)).limit(1))[0] });
  if (!claim.proceed) {
    if (claim.alreadyDrawn) {
      const [fresh] = await db.select().from(exchanges).where(eq(exchanges.id, exchange.id)).limit(1);
      return json({ ...(await exchangePayload(fresh)), alreadyDrawn: true });
    }
    return json({ error: claim.error }, claim.status || 409);
  }
  try {
    await saveDraw(exchange.id, planned.matches);
  } catch (error) {
    await db.update(exchanges).set({ status: "accepting" }).where(and(eq(exchanges.id, exchange.id), isNull(exchanges.drawnAt)));
    throw error;
  }
  const [updated] = await db.select().from(exchanges).where(eq(exchanges.id, exchange.id)).limit(1);
  return json(await exchangePayload(updated));
}

async function handleRedraw(exchange, body, organizer) {
  if (!organizer) return json({ error: "Only the organizer can cancel a draw." }, 403);
  if (body.confirm !== "redraw") {
    return json({ error: "Confirm the redraw before assignments change." }, 400);
  }
  const input = await loadDrawInput(exchange);
  const planned = planDraw({ alreadyDrawn: false, ...input });
  if (!planned.success) {
    return json({ error: planned.error || "Could not draw names.", included: planned.included }, 400);
  }
  const [locked] = await db
    .update(exchanges)
    .set({ status: "drawing" })
    .where(and(eq(exchanges.id, exchange.id), ne(exchanges.status, "drawing")))
    .returning();
  if (!locked) return json({ error: "A draw is already in progress." }, 409);
  try {
    await saveDraw(exchange.id, planned.matches);
  } catch (error) {
    await db.update(exchanges).set({ status: exchange.drawnAt ? "drawn" : "accepting" }).where(eq(exchanges.id, exchange.id));
    throw error;
  }
  const [updated] = await db.select().from(exchanges).where(eq(exchanges.id, exchange.id)).limit(1);
  return json(await exchangePayload(updated));
}

async function recordDelivery(exchangeId, memberId, channel, status, detail, kind, providerMessageId = "") {
  await db.insert(deliveries).values({
    exchangeId,
    memberId,
    channel,
    status,
    detail: clip(detail, 300),
    kind,
    providerMessageId: clip(providerMessageId, 80),
  });
}

function siteOrigin(req, context) {
  return Netlify.env.get("DEPLOY_PRIME_URL") || Netlify.env.get("URL") || context.site?.url || new URL(req.url).origin;
}

async function lookupHost(hostname) {
  const { lookup } = await import("node:dns/promises");
  return lookup(hostname, { all: true });
}

async function loadMerchants() {
  const rows = await db.select().from(merchants);
  if (!rows.length) return DEFAULT_MERCHANTS;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    domains: row.domains,
    affiliateParam: row.affiliateParam,
    configKey: row.configKey,
    enabled: row.enabled,
    countries: row.countries,
  }));
}

async function cancelSmsJobsForUser(userId) {
  const seats = await db.select().from(members).where(eq(members.userId, userId));
  const ids = seats.map((seat) => seat.id);
  if (!ids.length) return;
  await db
    .update(notificationJobs)
    .set({ status: "cancelled", detail: "Opted out of texts." })
    .where(and(inArray(notificationJobs.memberId, ids), eq(notificationJobs.channel, "sms"), eq(notificationJobs.status, "pending")));
}

async function prefsFor(userId) {
  if (!userId) return null;
  const [prefs] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId)).limit(1);
  return prefs || null;
}

async function handleNotify(exchange, body, req, context) {
  const kind = body.kind === "invite" ? "invite" : "assignment";
  if (kind === "assignment" && !exchange.drawnAt) return json({ error: "Draw names before sending assignment notices." }, 400);
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
  const origin = String(siteOrigin(req, context)).replace(/\/$/, "");
  const results = [];

  for (const person of people) {
    if (kind === "invite" && person.exchangeRole === "organizer") continue;
    const prefs = await prefsFor(person.userId);
    const prior = await db
      .select()
      .from(deliveries)
      .where(and(
        eq(deliveries.memberId, person.id),
        eq(deliveries.channel, channel),
        eq(deliveries.kind, kind),
        inArray(deliveries.status, ["sent", "accepted", "delivered"]),
      ));
    const decision = deliveryDecision({
      channel,
      kind,
      prefs,
      sentCount: prior.length,
      resend: body.resend === true,
      memberStatus: person.status,
    });
    const address = channel === "email" ? person.email : prefs?.phone || "";
    if (!decision.send || !address) {
      const reason = !address && decision.send ? "No address on file." : decision.reason;
      if (reason && reason !== "Already sent.") {
        await recordDelivery(exchange.id, person.id, channel, "skipped", reason, kind);
      }
      results.push({ name: person.name, status: "skipped" });
      continue;
    }
    const url = kind === "invite"
      ? `${origin}/?view=invite&code=${person.inviteToken}`
      : `${origin}/?view=assignment&exchange=${exchange.id}`;
    const text = kind === "invite"
      ? invitationNotice({ title: exchange.title, url })
      : assignmentNotice({ title: exchange.title, url });
    try {
      const providerMessageId = channel === "email"
        ? await sendEmail({
          to: person.email,
          subject: kind === "invite" ? `Invitation to ${exchange.title}` : kind === "reminder" ? `Reminder for ${exchange.title}` : "Your recipient is ready",
          text,
          env,
        })
        : await sendSms({ to: address, text, env });
      await recordDelivery(exchange.id, person.id, channel, "accepted", "Accepted by the provider. Delivery is not confirmed yet.", kind, providerMessageId);
      results.push({ name: person.name, status: "accepted" });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Send failed.";
      await recordDelivery(exchange.id, person.id, channel, "failed", detail, kind);
      results.push({ name: person.name, status: "failed" });
    }
  }

  if (body.memberId) return json({ results });
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

async function handleInviteGet(token) {
  const [member] = await db.select().from(members).where(eq(members.inviteToken, token)).limit(1);
  if (!member) return json({ error: "That invitation was not found." }, 404);
  const [exchange] = await db.select().from(exchanges).where(eq(exchanges.id, member.exchangeId)).limit(1);
  return json({
    exchangeTitle: exchange?.title || "Secret Santa",
    eventDate: exchange?.eventDate || "",
    budget: exchange?.budget || "",
    name: member.name,
    status: member.status,
  });
}

async function handleInviteDecline(token) {
  const [member] = await db.select().from(members).where(eq(members.inviteToken, token)).limit(1);
  if (!member) return json({ error: "That invitation was not found." }, 404);
  if (member.status === "accepted" && member.userId) {
    return json({ error: "This invitation was already accepted." }, 409);
  }
  await db.update(members).set({ status: "declined" }).where(eq(members.id, member.id));
  await db
    .update(notificationJobs)
    .set({ status: "cancelled", detail: "This person declined." })
    .where(and(eq(notificationJobs.memberId, member.id), eq(notificationJobs.status, "pending")));
  return json({ status: "declined" });
}

async function handleInviteAccept(user, token) {
  const [member] = await db.select().from(members).where(eq(members.inviteToken, token)).limit(1);
  const decision = acceptDecision({ member, user });
  if (!decision.ok) return json({ error: decision.error }, decision.status);
  await db.update(members).set({ status: "accepted", userId: user.id }).where(eq(members.id, member.id));
  return json({ status: "accepted", exchangeId: member.exchangeId });
}

async function handleAssignment(user, exchangeId) {
  if (!UUID.test(exchangeId)) return json({ error: "That exchange was not found." }, 404);
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.exchangeId, exchangeId), eq(members.userId, user.id)))
    .limit(1);
  if (!member) return json({ error: "You are not on this exchange." }, 404);
  const people = await db.select().from(members).where(eq(members.exchangeId, exchangeId));
  const pairs = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.exchangeId, exchangeId), eq(assignments.giverMemberId, member.id)));
  const [exchange] = await db.select().from(exchanges).where(eq(exchanges.id, exchangeId)).limit(1);
  const visible = recipientForMember({
    userId: user.id,
    members: people,
    pairs,
    drawn: Boolean(exchange?.drawnAt),
  });
  if (visible.status) return json({ error: visible.error }, visible.status);
  if (!visible.ready) return json({ ready: false, exchangeTitle: exchange?.title || "Secret Santa" });
  const receiver = people.find((row) => row.id === visible.receiverId);
  let items = [];
  if (receiver?.wishListId) {
    const rows = await db.select().from(wishItems).where(eq(wishItems.listId, receiver.wishListId));
    const held = rows.length
      ? await db.select().from(reservations).where(inArray(reservations.itemId, rows.map((row) => row.id)))
      : [];
    items = rows.map((item) => ({
      id: item.id,
      title: item.title,
      notes: item.notes,
      size: item.size,
      color: item.color,
      priority: item.priority,
      shoppingUrl: item.shoppingUrl,
      retailer: item.retailer,
      reserved: held.some((row) => row.itemId === item.id),
      reservedByMe: held.some((row) => row.itemId === item.id && row.memberId === member.id),
    }));
  }
  return json({
    ready: true,
    exchangeId,
    exchangeTitle: exchange.title,
    recipientName: receiver?.name || "",
    items,
  });
}

async function handleWishLists(user) {
  const lists = await db.select().from(wishLists).where(eq(wishLists.ownerUserId, user.id)).orderBy(desc(wishLists.createdAt));
  const result = [];
  for (const list of lists) {
    const items = await db.select().from(wishItems).where(eq(wishItems.listId, list.id));
    result.push({
      id: list.id,
      title: list.title,
      items: items.map(ownerWishItem),
    });
  }
  return json({ lists: result });
}

async function handleCreateWishList(user, body) {
  const title = clip(body.title, 80);
  if (!title) return json({ error: "Name the wish list." }, 400);
  await db.insert(wishLists).values({ ownerUserId: user.id, title });
  return handleWishLists(user);
}

async function handleAddWishItem(user, listId, body) {
  if (!UUID.test(listId)) return json({ error: "That wish list was not found." }, 404);
  const [list] = await db.select().from(wishLists).where(and(eq(wishLists.id, listId), eq(wishLists.ownerUserId, user.id))).limit(1);
  if (!list) return json({ error: "That wish list was not found." }, 404);
  const title = clip(body.title, 160);
  if (!title) return json({ error: "Name the gift." }, 400);
  const original = clip(body.originalUrl, 2000);
  let prepared = { originalUrl: "", shoppingUrl: "", retailer: "", affiliateApplied: false };
  if (original) {
    prepared = await finalizeShoppingLink(original, DEFAULT_AFFILIATE_CONFIG, {
      merchants: await loadMerchants(),
      lookupImpl: lookupHost,
    });
    if (!prepared.ok) return json({ error: prepared.reason }, 400);
  }
  await db.insert(wishItems).values({
    listId,
    title,
    notes: clip(body.notes, 500),
    size: clip(body.size, 40),
    color: clip(body.color, 40),
    priority: clip(body.priority, 20),
    originalUrl: prepared.originalUrl || "",
    shoppingUrl: prepared.shoppingUrl || "",
    retailer: prepared.retailer || "",
  });
  return handleWishLists(user);
}

async function handleUpdateWishItem(user, itemId, body) {
  if (!UUID.test(itemId)) return json({ error: "That gift was not found." }, 404);
  const [item] = await db.select().from(wishItems).where(eq(wishItems.id, itemId)).limit(1);
  if (!item) return json({ error: "That gift was not found." }, 404);
  const [list] = await db
    .select()
    .from(wishLists)
    .where(and(eq(wishLists.id, item.listId), eq(wishLists.ownerUserId, user.id)))
    .limit(1);
  if (!list) return json({ error: "That gift was not found." }, 404);
  const title = clip(body.title, 160);
  if (!title) return json({ error: "Name the gift." }, 400);
  const original = clip(body.originalUrl ?? item.originalUrl, 2000);
  let prepared = { originalUrl: item.originalUrl, shoppingUrl: item.shoppingUrl, retailer: item.retailer };
  if (original !== item.originalUrl) {
    if (!original) {
      prepared = { originalUrl: "", shoppingUrl: "", retailer: "" };
    } else {
      prepared = await finalizeShoppingLink(original, DEFAULT_AFFILIATE_CONFIG, {
        merchants: await loadMerchants(),
        lookupImpl: lookupHost,
      });
      if (!prepared.ok) return json({ error: prepared.reason }, 400);
    }
  }
  await db
    .update(wishItems)
    .set({
      title,
      notes: clip(body.notes ?? item.notes, 500),
      size: clip(body.size ?? item.size, 40),
      color: clip(body.color ?? item.color, 40),
      priority: clip(body.priority ?? item.priority, 20),
      originalUrl: prepared.originalUrl || "",
      shoppingUrl: prepared.shoppingUrl || "",
      retailer: prepared.retailer || "",
    })
    .where(eq(wishItems.id, item.id));
  return handleWishLists(user);
}

async function handleShareList(user, body) {
  if (!UUID.test(String(body.wishListId || "")) || !UUID.test(String(body.exchangeId || ""))) {
    return json({ error: "Choose a list and an exchange." }, 400);
  }
  const [list] = await db
    .select()
    .from(wishLists)
    .where(and(eq(wishLists.id, body.wishListId), eq(wishLists.ownerUserId, user.id)))
    .limit(1);
  if (!list) return json({ error: "That wish list was not found." }, 404);
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.exchangeId, body.exchangeId), eq(members.userId, user.id)))
    .limit(1);
  if (!member) return json({ error: "You are not on this exchange." }, 403);
  await db.update(members).set({ wishListId: list.id }).where(eq(members.id, member.id));
  return json({ shared: true });
}

async function handleReserve(user, itemId) {
  if (!UUID.test(itemId)) return json({ error: "That gift was not found." }, 404);
  const [item] = await db.select().from(wishItems).where(eq(wishItems.id, itemId)).limit(1);
  if (!item) return json({ error: "That gift was not found." }, 404);
  const [ownerList] = await db.select().from(wishLists).where(eq(wishLists.id, item.listId)).limit(1);
  if (ownerList?.ownerUserId === user.id) return json({ error: "You cannot reserve a gift on your own list." }, 403);
  const seats = await db.select().from(members).where(eq(members.userId, user.id));
  const giver = [];
  for (const row of seats) {
    const [pair] = await db
      .select()
      .from(assignments)
      .where(and(eq(assignments.giverMemberId, row.id)))
      .limit(1);
    if (!pair) continue;
    const [receiver] = await db.select().from(members).where(eq(members.id, pair.receiverMemberId)).limit(1);
    if (receiver?.wishListId === item.listId) giver.push(row);
  }
  if (!giver.length) return json({ error: "Only the person giving this gift can reserve it." }, 403);
  try {
    await db.insert(reservations).values({ itemId, memberId: giver[0].id });
  } catch {
    return json({ error: "Someone already reserved that gift." }, 409);
  }
  return json({ reserved: true });
}

async function handleSettings(user, method, body) {
  const [existing] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, user.id)).limit(1);
  if (method === "GET") {
    return json({
      emailInvites: existing?.emailInvites !== false,
      emailAssignments: existing?.emailAssignments !== false,
      emailReminders: existing?.emailReminders !== false,
      smsOptIn: Boolean(existing?.smsOptIn),
      phone: existing?.phone || "",
    });
  }
  const next = {
    userId: user.id,
    emailInvites: body.emailInvites !== false,
    emailAssignments: body.emailAssignments !== false,
    emailReminders: body.emailReminders !== false,
    smsOptIn: body.smsOptIn === true,
    smsStoppedAt: body.smsOptIn === true ? "" : new Date().toISOString(),
    phone: clip(body.phone, 40),
  };
  if (next.smsOptIn && !next.phone) return json({ error: "Add the phone number that should receive texts." }, 400);
  if (existing) {
    await db.update(notificationPrefs).set(next).where(eq(notificationPrefs.userId, user.id));
  } else {
    await db.insert(notificationPrefs).values(next);
  }
  if (!next.smsOptIn) await cancelSmsJobsForUser(user.id);
  return json({ ...next, smsStoppedAt: undefined, smsOptIn: next.smsOptIn });
}

async function handleQueueReminders(exchange) {
  const when = reminderRunAt(exchange.eventDate);
  if (!when) return json({ error: "Add an exchange date before queueing reminders." }, 400);
  const people = await db.select().from(members).where(eq(members.exchangeId, exchange.id));
  let queued = 0;
  for (const person of people) {
    if (person.status !== "accepted") continue;
    const pending = await db
      .select()
      .from(notificationJobs)
      .where(and(eq(notificationJobs.memberId, person.id), eq(notificationJobs.kind, "reminder"), eq(notificationJobs.status, "pending")));
    if (pending.length) continue;
    const prefs = await prefsFor(person.userId);
    for (const channel of ["email", "sms"]) {
      const decision = deliveryDecision({ channel, kind: "reminder", prefs, memberStatus: person.status });
      if (!decision.send) continue;
      if (channel === "email" && !person.email) continue;
      await db.insert(notificationJobs).values({
        exchangeId: exchange.id,
        memberId: person.id,
        channel,
        kind: "reminder",
        runAt: when,
      });
      queued += 1;
    }
  }
  return json({ ...(await exchangePayload(exchange)), queued });
}

async function handleCreateTicket(user, body) {
  const subject = clip(body.subject, 120);
  const message = clip(body.body, 4000);
  if (!subject || !message) return json({ error: "Add a subject and a message." }, 400);
  await db.insert(tickets).values({
    requesterUserId: user.id,
    requesterEmail: user.email || "",
    subject,
    body: message,
    status: "open",
  });
  return json({ created: true });
}

async function handleSupportTickets(user) {
  if (!staffRole(user)) return json({ error: "That page was not found." }, 404);
  const rows = await db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(100);
  return json({
    tickets: rows.map((row) => ({
      id: row.id,
      requesterEmail: row.requesterEmail,
      subject: row.subject,
      body: row.body,
      status: row.status,
      createdAt: row.createdAt,
    })),
  });
}

async function handleSupportLookup(user, email) {
  if (!staffRole(user)) return json({ error: "That page was not found." }, 404);
  const normalized = clip(email, 160).toLowerCase();
  if (!normalized) return json({ error: "Enter an email address." }, 400);
  const people = await db.select().from(members).where(sql`lower(${members.email}) = ${normalized}`);
  const seats = [];
  for (const person of people) {
    const [exchange] = await db.select().from(exchanges).where(eq(exchanges.id, person.exchangeId)).limit(1);
    const failed = await db.select().from(deliveries).where(and(eq(deliveries.memberId, person.id), eq(deliveries.status, "failed")));
    seats.push({
      exchangeTitle: exchange?.title || "Secret Santa",
      status: person.status,
      hasWishes: wishLines(person.wishes).length > 0 || Boolean(person.wishListId),
      failures: failed.map((row) => ({ channel: row.channel, kind: row.kind, detail: row.detail, createdAt: row.createdAt })),
    });
  }
  return json(supportLookupView({ email: normalized, seats }));
}

async function handleMerchantAdmin(user, method, body) {
  if (staffRole(user) !== "admin") return json({ error: "That page was not found." }, 404);
  if (method === "GET") return json({ merchants: await loadMerchants() });
  const id = clip(body.id, 40).toLowerCase();
  if (!id || !/^[a-z0-9-]+$/.test(id)) return json({ error: "Use a short merchant id such as amazon." }, 400);
  const row = {
    id,
    name: clip(body.name, 80) || id,
    domains: clip(body.domains, 400),
    affiliateParam: clip(body.affiliateParam, 40),
    configKey: clip(body.configKey, 40),
    enabled: body.enabled !== false,
    countries: clip(body.countries, 80),
  };
  const [existing] = await db.select().from(merchants).where(eq(merchants.id, id)).limit(1);
  if (existing) await db.update(merchants).set(row).where(eq(merchants.id, id));
  else await db.insert(merchants).values(row);
  return json({ merchants: await loadMerchants() });
}

async function handleTwilio(req) {
  const text = await req.text();
  const params = Object.fromEntries(new URLSearchParams(text));
  const env = providerEnv();
  const signature = req.headers.get("x-twilio-signature") || "";
  if (!validTwilioSignature({ url: req.url, params, token: env.TWILIO_AUTH_TOKEN, signature })) {
    return json({ error: "That request was not accepted." }, 403);
  }
  const inbound = String(params.Body || "").trim().toUpperCase();
  if (SMS_STOP_WORDS.has(inbound) && params.From) {
    const from = normalizeSmsTo(params.From);
    const rows = await db.select().from(notificationPrefs);
    for (const row of rows) {
      if (normalizeSmsTo(row.phone) !== from) continue;
      await db
        .update(notificationPrefs)
        .set({ smsOptIn: false, smsStoppedAt: new Date().toISOString() })
        .where(eq(notificationPrefs.userId, row.userId));
      await cancelSmsJobsForUser(row.userId);
    }
    return new Response("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
  }
  const sid = params.MessageSid || "";
  const messageStatus = params.MessageStatus || "";
  if (sid && (messageStatus === "delivered" || messageStatus === "failed" || messageStatus === "undelivered")) {
    await db
      .update(deliveries)
      .set({
        status: messageStatus === "delivered" ? "delivered" : "failed",
        detail: `Twilio reported ${messageStatus}.`,
      })
      .where(eq(deliveries.providerMessageId, sid));
  }
  return new Response("ok");
}

async function handleAddExclusion(exchange, body) {
  if (exchange.drawnAt) return json({ error: "Cancel the draw before changing exclusions." }, 409);
  const giverMemberId = String(body.giverMemberId || "");
  const receiverMemberId = String(body.receiverMemberId || "");
  if (!UUID.test(giverMemberId) || !UUID.test(receiverMemberId)) return json({ error: "Choose two people." }, 400);
  if (giverMemberId === receiverMemberId) return json({ error: "A person cannot be excluded from themselves." }, 400);
  await db.insert(exclusions).values({ exchangeId: exchange.id, giverMemberId, receiverMemberId });
  return json(await exchangePayload(exchange));
}

export default async function handler(req, context) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[1] === "sms" && parts[2] === "twilio" && req.method === "POST") return handleTwilio(req);
    const body = await readJson(req);
    if (body === null) return json({ error: "That request was not valid JSON." }, 400);

    if (req.method === "GET" && parts.length === 2 && parts[1] === "session") return handleSession();
    if (parts[1] === "invites" && parts[2] && req.method === "GET") return handleInviteGet(parts[2]);
    if (parts[1] === "invites" && parts[2] && parts[3] === "decline" && req.method === "POST") {
      return handleInviteDecline(parts[2]);
    }

    const user = await getUser();
    if (!user?.id) return json({ error: "Sign in to continue." }, 401);
    if (parts[1] === "invites" && parts[2] && parts[3] === "accept" && req.method === "POST") {
      return handleInviteAccept(user, parts[2]);
    }
    if (parts[1] === "assignment" && req.method === "GET") {
      return handleAssignment(user, url.searchParams.get("exchange") || "");
    }
    if (parts[1] === "tickets" && req.method === "POST") return handleCreateTicket(user, body);
    if (parts[1] === "support" && parts[2] === "tickets" && req.method === "GET") return handleSupportTickets(user);
    if (parts[1] === "support" && parts[2] === "lookup" && req.method === "GET") {
      return handleSupportLookup(user, url.searchParams.get("email") || "");
    }
    if (parts[1] === "support" && parts[2] === "resend" && req.method === "POST") {
      if (!staffRole(user)) return json({ error: "That page was not found." }, 404);
      if (!UUID.test(String(body.exchangeId || "")) || !UUID.test(String(body.memberId || ""))) {
        return json({ error: "Choose a person." }, 400);
      }
      const [exchange] = await db.select().from(exchanges).where(eq(exchanges.id, body.exchangeId)).limit(1);
      if (!exchange) return json({ error: "That exchange was not found." }, 404);
      return handleNotify(exchange, { ...body, resend: true }, req, context);
    }
    if (parts[1] === "admin" && parts[2] === "merchants") {
      if (req.method === "GET" || req.method === "POST") return handleMerchantAdmin(user, req.method, body);
      return json({ error: "That action is not available." }, 405);
    }
    if (parts[1] === "settings") {
      if (req.method === "GET" || req.method === "POST") return handleSettings(user, req.method, body);
      return json({ error: "That action is not available." }, 405);
    }
    if (parts[1] === "wish-lists" && parts.length === 2) {
      if (req.method === "GET") return handleWishLists(user);
      if (req.method === "POST") return handleCreateWishList(user, body);
    }
    if (parts[1] === "wish-lists" && parts[2] && parts[3] === "items" && req.method === "POST") {
      return handleAddWishItem(user, parts[2], body);
    }
    if (parts[1] === "wish-lists" && parts[2] === "share" && req.method === "POST") return handleShareList(user, body);
    if (parts[1] === "wish-items" && parts[2] && parts[3] === "reserve" && req.method === "POST") {
      return handleReserve(user, parts[2]);
    }
    if (parts[1] === "wish-items" && parts[2] && parts.length === 3 && req.method === "POST") {
      return handleUpdateWishItem(user, parts[2], body);
    }

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
      const managed = await loadManagedExchange(parts[2], user);
      if (!managed) return json({ error: "That exchange was not found." }, 404);
      const { exchange, organizer } = managed;
      if (parts.length === 3 && req.method === "GET") return json(await exchangePayload(exchange));
      if (parts[3] === "members" && parts.length === 4 && req.method === "POST") {
        if (body.role === "co_organizer" && !organizer) {
          return json({ error: "Only the organizer can add a co-organizer." }, 403);
        }
        return handleAddMember(exchange, body);
      }
      if (parts[3] === "members" && parts[4] && req.method === "DELETE") return handleDeleteMember(exchange, parts[4]);
      if (parts[3] === "draw" && req.method === "POST") return handleDraw(exchange);
      if (parts[3] === "redraw" && req.method === "POST") return handleRedraw(exchange, body, organizer);
      if (parts[3] === "notify" && req.method === "POST") return handleNotify(exchange, body, req, context);
      if (parts[3] === "reminders" && req.method === "POST") return handleQueueReminders(exchange);
      if (parts[3] === "exclusions" && req.method === "POST") return handleAddExclusion(exchange, body);
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
    "/api/exchanges/:id/redraw",
    "/api/exchanges/:id/notify",
    "/api/exchanges/:id/exclusions",
    "/api/wishlist",
    "/api/invites/:token",
    "/api/invites/:token/accept",
    "/api/invites/:token/decline",
    "/api/assignment",
    "/api/settings",
    "/api/wish-lists",
    "/api/wish-lists/share",
    "/api/wish-lists/:id/items",
    "/api/wish-items/:id/reserve",
    "/api/wish-items/:id",
    "/api/exchanges/:id/reminders",
    "/api/tickets",
    "/api/support/tickets",
    "/api/support/lookup",
    "/api/support/resend",
    "/api/admin/merchants",
    "/api/sms/twilio",
  ],
};
