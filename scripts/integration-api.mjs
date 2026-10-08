/**
 * API tests against local Postgres. Provider calls are intercepted.
 * This does not prove live Resend, Twilio, affiliate commission, or a Netlify deploy.
 */
import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";
import { resendSignature } from "../src/server/resendWebhook.js";
import { twilioSignature } from "../src/server/twilio.js";
import { handler as identitySignup } from "../netlify/functions/identity-signup.js";

const DATABASE_URL = process.env.NETLIFY_DB_URL || "postgres://giftloop:giftloop@127.0.0.1:5432/giftloop_test";
process.env.NETLIFY_DB_URL = DATABASE_URL;
process.env.NETLIFY_DB_DRIVER = "server";

const DAYTIME = "2026-10-07T18:00:00.000Z";
const QUIET = "2026-10-07T06:00:00.000Z";
const results = [];
const outbound = [];
let resendMode = "ok";
let smsMode = "ok";
let clock = DAYTIME;

const users = {
  organizer: profile("user-organizer", "organizer@example.com", "Olivia", ["member"]),
  ada: profile("user-ada", "ada@example.com", "Ada", ["member"]),
  bea: profile("user-bea", "bea@example.com", "Bea", ["member"]),
  cam: profile("user-cam", "cam@example.com", "Cam", ["member"]),
  stranger: profile("user-stranger", "stranger@example.com", "Sam", ["member"]),
  unverified: profile("user-unverified", "ada@example.com", "Ada", ["member"], ""),
  support: profile("user-support", "support@example.com", "Support", ["support"]),
  admin: profile("user-admin", "admin@example.com", "Admin", ["admin"]),
};

function profile(id, email, name, roles, confirmedAt = "2026-01-02T00:00:00.000Z") {
  return {
    id,
    email,
    confirmed_at: confirmedAt || null,
    user_metadata: { full_name: name },
    app_metadata: { roles },
  };
}

const env = {
  URL: "https://preview.test",
  DEPLOY_PRIME_URL: "https://preview.test",
  RESEND_API_KEY: "",
  EMAIL_FROM: "",
  TWILIO_ACCOUNT_SID: "",
  TWILIO_AUTH_TOKEN: "",
  TWILIO_FROM_NUMBER: "",
  RESEND_WEBHOOK_SECRET: "",
};

globalThis.Netlify = { env: { get: (key) => env[key] || "" } };

const RealDate = Date;
function installClock() {
  class FrozenDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(clock);
      else super(...args);
    }
    static now() {
      return new RealDate(clock).getTime();
    }
    static parse(value) {
      return RealDate.parse(value);
    }
    static UTC(...args) {
      return RealDate.UTC(...args);
    }
  }
  globalThis.Date = FrozenDate;
}

function authHeader(init) {
  const headers = init?.headers;
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get("authorization") || headers.get("Authorization") || "";
  return headers.Authorization || headers.authorization || "";
}

globalThis.fetch = async (url, init) => {
  const href = String(url);
  if (href.endsWith("/.netlify/identity/user")) {
    const token = authHeader(init).replace(/^Bearer\s+/i, "");
    const user = users[token];
    if (!user) return new Response("no", { status: 401 });
    return Response.json(user);
  }
  if (href.includes("api.resend.com")) {
    const body = JSON.parse(init.body);
    outbound.push({ channel: "email", ...body });
    if (resendMode === "fail") return Response.json({ message: "Resend rejected the test message." }, { status: 422 });
    return Response.json({ id: `email_${outbound.length}` });
  }
  if (href.includes("api.twilio.com")) {
    outbound.push({ channel: "sms", body: String(init.body) });
    if (smsMode === "fail") return Response.json({ message: "Twilio rejected the test message." }, { status: 400 });
    return Response.json({ sid: `SM${outbound.length}` });
  }
  throw new Error(`Unexpected network call: ${href}`);
};

function assert(condition, detail) {
  if (!condition) {
    const error = new Error(typeof detail === "string" ? detail : JSON.stringify(detail, null, 2));
    throw error;
  }
}

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, result: "passed" });
    console.log(`passed  ${name}`);
  } catch (error) {
    results.push({ name, result: "failed", error: error.message });
    console.error(`failed  ${name}\n${error.message}`);
  }
}

async function applyMigrations(client) {
  const root = new URL("../netlify/database/migrations/", import.meta.url);
  const folders = readdirSync(root).filter((name) => /^\d+_/.test(name)).sort();
  for (const folder of folders) {
    const sql = readFileSync(new URL(`${folder}/migration.sql`, root), "utf8").replaceAll("--> statement-breakpoint", "");
    await client.query(sql);
  }
}

const { default: handler } = await import("../netlify/functions/api.js");
const { default: reminders } = await import("../netlify/functions/reminders.js");

async function call(method, path, { token, body, raw, headers } = {}) {
  globalThis.netlifyIdentityContext = token
    ? { token, url: "https://identity.test/.netlify/identity" }
    : undefined;
  const req = new Request(`https://preview.test${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(raw ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      ...(headers || {}),
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const response = await handler(req, { site: { url: "https://preview.test" } });
  const text = await response.text();
  let json = text;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: response.status, json, text };
}

function memberByEmail(payload, email) {
  return payload.members.find((member) => member.email === email);
}

async function pairs(client, exchangeId) {
  const { rows } = await client.query(
    `select g.email as giver_email, g.name as giver_name, r.email as receiver_email, r.name as receiver_name
     from assignments a
     join members g on g.id = a.giver_member_id
     join members r on r.id = a.receiver_member_id
     where a.exchange_id = $1
     order by g.email`,
    [exchangeId],
  );
  return rows;
}

function validCircle(rows) {
  const givers = new Set(rows.map((row) => row.giver_email));
  const receivers = new Set(rows.map((row) => row.receiver_email));
  return givers.size === rows.length && receivers.size === rows.length && rows.every((row) => row.giver_email !== row.receiver_email);
}

async function createExchange(title, guests) {
  const created = await call("POST", "/api/exchanges", {
    token: "organizer",
    body: { title, eventDate: "2026-12-20", timezone: "America/Los_Angeles", budget: "25" },
  });
  assert(created.status === 201, created);
  for (const guest of guests) {
    const added = await call("POST", `/api/exchanges/${created.json.exchange.id}/members`, {
      token: "organizer",
      body: { name: guest.name, email: guest.email },
    });
    assert(added.status === 200, added);
  }
  const detail = await call("GET", `/api/exchanges/${created.json.exchange.id}`, { token: "organizer" });
  assert(detail.status === 200, detail);
  return detail.json;
}

async function acceptGuests(detail, tokensByEmail) {
  for (const [email, token] of Object.entries(tokensByEmail)) {
    const member = memberByEmail(detail, email);
    const accepted = await call("POST", `/api/invites/${member.inviteToken}/accept`, { token });
    assert(accepted.status === 200 && accepted.json.status === "accepted", accepted);
  }
}

installClock();

const admin = new pg.Client({ connectionString: DATABASE_URL });
await admin.connect();
await admin.query("drop schema public cascade; create schema public;");
await applyMigrations(admin);

await check("signup cannot grant staff", async () => {
  const response = await identitySignup({
    body: JSON.stringify({ user: { app_metadata: { roles: ["admin", "support", "member"] } } }),
  });
  const body = JSON.parse(response.body);
  assert(JSON.stringify(body.app_metadata.roles) === JSON.stringify(["member"]), body);
});

await check("ordinary member cannot use staff endpoints", async () => {
  const merchants = await call("POST", "/api/admin/merchants", {
    token: "ada",
    body: { id: "amazon", name: "Amazon", domains: "amazon.com", enabled: true },
  });
  assert(merchants.status === 404, merchants);
  const lookup = await call("GET", "/api/support/lookup?email=ada@example.com", { token: "ada" });
  assert(lookup.status === 404, lookup);
  const tickets = await call("GET", "/api/support/tickets", { token: "ada" });
  assert(tickets.status === 404, tickets);
  const resend = await call("POST", "/api/support/resend", {
    token: "ada",
    body: { exchangeId: "00000000-0000-4000-8000-000000000001", memberId: "00000000-0000-4000-8000-000000000002" },
  });
  assert(resend.status === 404, resend);
  const count = await admin.query("select count(*)::int as n from merchants");
  assert(count.rows[0].n === 0, count.rows);
});

await check("support can look up status and cannot edit merchants", async () => {
  const denied = await call("POST", "/api/admin/merchants", {
    token: "support",
    body: { id: "amazon", name: "Amazon", domains: "amazon.com" },
  });
  assert(denied.status === 404, denied);
  const lookup = await call("GET", "/api/support/lookup?email=nobody@example.com", { token: "support" });
  assert(lookup.status === 200, lookup);
  assert(!("recipientName" in lookup.json), lookup.json);
});

await check("administrator can read merchant settings", async () => {
  const listed = await call("GET", "/api/admin/merchants", { token: "admin" });
  assert(listed.status === 200 && listed.json.merchants.some((row) => row.id === "amazon"), listed);
  assert(!JSON.stringify(listed.json).includes("RESEND_API_KEY"), listed.json);
});

await check("private invitation requires the confirmed address", async () => {
  const detail = await createExchange("Private draw", [
    { name: "Ada", email: "ada@example.com" },
    { name: "Bea", email: "bea@example.com" },
  ]);
  const ada = memberByEmail(detail, "ada@example.com");
  const preview = await call("GET", `/api/invites/${ada.inviteToken}`);
  assert(preview.json.kind === "private" && preview.json.warning.includes("confirmed account"), preview.json);
  assert(!("recipientName" in preview.json), preview.json);
  const wrong = await call("POST", `/api/invites/${ada.inviteToken}/accept`, { token: "stranger" });
  assert(wrong.status === 403, wrong);
  const unverified = await call("POST", `/api/invites/${ada.inviteToken}/accept`, { token: "unverified" });
  assert(unverified.status === 403, unverified);
  const accepted = await call("POST", `/api/invites/${ada.inviteToken}/accept`, { token: "ada" });
  assert(accepted.status === 200 && accepted.json.status === "accepted", accepted);
  const again = await call("POST", `/api/invites/${ada.inviteToken}/accept`, { token: "stranger" });
  assert(again.status === 409, again);
});

await check("open join asks to join and is not drawn until accepted", async () => {
  const detail = await createExchange("Open house", [{ name: "Ada", email: "ada@example.com" }]);
  await acceptGuests(detail, { "ada@example.com": "ada" });
  const opened = await call("POST", `/api/exchanges/${detail.exchange.id}/join`, { token: "organizer", body: { open: true } });
  assert(opened.json.exchange.joinOpen === true && opened.json.exchange.joinToken, opened.json.exchange);
  const preview = await call("GET", `/api/join/${opened.json.exchange.joinToken}`);
  assert(preview.json.kind === "open" && preview.json.warning.includes("Anyone with this link"), preview.json);
  const requested = await call("POST", `/api/join/${opened.json.exchange.joinToken}/request`, {
    token: "stranger",
    body: { name: "Sam" },
  });
  assert(requested.status === 200 && requested.json.status === "requested", requested);
  const before = await call("GET", `/api/exchanges/${detail.exchange.id}`, { token: "organizer" });
  const sam = before.json.members.find((member) => member.email === "stranger@example.com");
  assert(sam.status === "requested", before.json.members);
  const drawn = await call("POST", `/api/exchanges/${detail.exchange.id}/draw`, { token: "organizer", body: {} });
  assert(drawn.status === 200, drawn);
  const matched = await pairs(admin, detail.exchange.id);
  assert(matched.length === 2 && !matched.some((row) => row.giver_email === "stranger@example.com"), matched);
});

await check("a member cannot open the organizer exchange", async () => {
  const detail = await createExchange("Hidden desk", [
    { name: "Ada", email: "ada@example.com" },
    { name: "Bea", email: "bea@example.com" },
  ]);
  await acceptGuests(detail, { "ada@example.com": "ada", "bea@example.com": "bea" });
  const hidden = await call("GET", `/api/exchanges/${detail.exchange.id}`, { token: "ada" });
  assert(hidden.status === 404, hidden);
});

await check("simultaneous draws keep one consistent pairing", async () => {
  const detail = await createExchange("Race", [
    { name: "Ada", email: "ada@example.com" },
    { name: "Bea", email: "bea@example.com" },
    { name: "Cam", email: "cam@example.com" },
  ]);
  await acceptGuests(detail, { "ada@example.com": "ada", "bea@example.com": "bea", "cam@example.com": "cam" });
  const [first, second] = await Promise.all([
    call("POST", `/api/exchanges/${detail.exchange.id}/draw`, { token: "organizer", body: {} }),
    call("POST", `/api/exchanges/${detail.exchange.id}/draw`, { token: "organizer", body: {} }),
  ]);
  for (const response of [first, second]) {
    assert(response.status === 200 || response.status === 409, response);
    assert(!response.text.includes("giverMemberId"), "organizer response included assignment ids");
  }
  const matched = await pairs(admin, detail.exchange.id);
  assert(matched.length === 4 && validCircle(matched), matched);
  const organizerView = await call("GET", `/api/exchanges/${detail.exchange.id}`, { token: "organizer" });
  assert(!organizerView.text.includes("receiverMemberId") && !organizerView.text.includes("recipientName"), organizerView.text.slice(0, 400));
  const adaView = await call("GET", `/api/assignment?exchange=${detail.exchange.id}`, { token: "ada" });
  assert(adaView.json.ready === true && adaView.json.recipientName, adaView.json);
  assert(!adaView.text.includes("giverMemberId"), adaView.text);
});

await check("impossible exclusions do not write assignments", async () => {
  const detail = await createExchange("Impossible", [
    { name: "Ada", email: "ada@example.com" },
    { name: "Bea", email: "bea@example.com" },
  ]);
  await acceptGuests(detail, { "ada@example.com": "ada", "bea@example.com": "bea" });
  const fresh = await call("GET", `/api/exchanges/${detail.exchange.id}`, { token: "organizer" });
  const ada = memberByEmail(fresh.json, "ada@example.com");
  const bea = memberByEmail(fresh.json, "bea@example.com");
  for (const [giver, receiver] of [[ada, bea], [bea, ada]]) {
    const rule = await call("POST", `/api/exchanges/${detail.exchange.id}/exclusions`, {
      token: "organizer",
      body: { giverMemberId: giver.id, receiverMemberId: receiver.id },
    });
    assert(rule.status === 200, rule);
  }
  const drawn = await call("POST", `/api/exchanges/${detail.exchange.id}/draw`, { token: "organizer", body: {} });
  assert(drawn.status === 400, drawn);
  const count = await admin.query("select count(*)::int as n from assignments where exchange_id = $1", [detail.exchange.id]);
  assert(count.rows[0].n === 0, count.rows);
});

await check("a failed redraw leaves the previous pairs in place", async () => {
  const detail = await createExchange("Redraw", [
    { name: "Ada", email: "ada@example.com" },
    { name: "Bea", email: "bea@example.com" },
    { name: "Cam", email: "cam@example.com" },
  ]);
  await acceptGuests(detail, { "ada@example.com": "ada", "bea@example.com": "bea", "cam@example.com": "cam" });
  const drawn = await call("POST", `/api/exchanges/${detail.exchange.id}/draw`, { token: "organizer", body: {} });
  assert(drawn.status === 200, drawn);
  const before = await pairs(admin, detail.exchange.id);
  await admin.query(
    `insert into exclusions (exchange_id, giver_member_id, receiver_member_id)
     select $1, giver.id, receiver.id
     from members giver
     join members receiver on receiver.exchange_id = giver.exchange_id and receiver.id <> giver.id
     where giver.exchange_id = $1`,
    [detail.exchange.id],
  );
  const redraw = await call("POST", `/api/exchanges/${detail.exchange.id}/redraw`, {
    token: "organizer",
    body: { confirm: "redraw" },
  });
  assert(redraw.status === 400, redraw);
  const after = await pairs(admin, detail.exchange.id);
  assert(JSON.stringify(after) === JSON.stringify(before), { before, after });
});

await check("shared wish lists keep ownership, edits, and reservation privacy", async () => {
  const first = await createExchange("List one", [
    { name: "Ada", email: "ada@example.com" },
    { name: "Bea", email: "bea@example.com" },
  ]);
  const second = await createExchange("List two", [
    { name: "Ada", email: "ada@example.com" },
    { name: "Bea", email: "bea@example.com" },
  ]);
  await acceptGuests(first, { "ada@example.com": "ada", "bea@example.com": "bea" });
  await acceptGuests(second, { "ada@example.com": "ada", "bea@example.com": "bea" });
  const created = await call("POST", "/api/wish-lists", { token: "bea", body: { title: "Bea holiday" } });
  const listId = created.json.lists[0].id;
  const items = [
    {
      title: "Trail bottle",
      originalUrl: "https://www.amazon.com/dp/B0TESTITEM?th=1&psc=1",
      size: "20 oz",
      color: "green",
    },
    {
      title: "Red flannel",
      originalUrl: "https://www.target.com/p/flannel/-/A-12345678?preselect=red",
      size: "M",
      color: "red",
    },
    {
      title: "Handmade scarf",
      originalUrl: "https://www.etsy.com/listing/12345/blue-scarf?variation0=555",
    },
    { title: "A walk in the park" },
  ];
  for (const item of items) {
    const saved = await call("POST", `/api/wish-lists/${listId}/items`, { token: "bea", body: item });
    assert(saved.status === 200, saved);
  }
  for (const exchange of [first, second]) {
    const shared = await call("POST", "/api/wish-lists/share", {
      token: "bea",
      body: { wishListId: listId, exchangeId: exchange.exchange.id },
    });
    assert(shared.status === 200 && shared.json.shared === true, shared);
  }
  const seats = await admin.query(
    "select exchange_id, wish_list_id from members where email = 'bea@example.com' and wish_list_id is not null",
  );
  assert(seats.rows.length >= 2 && new Set(seats.rows.map((row) => row.wish_list_id)).size === 1, seats.rows);
  const drawn = await call("POST", `/api/exchanges/${first.exchange.id}/draw`, { token: "organizer", body: {} });
  assert(drawn.status === 200, drawn);
  const matched = await pairs(admin, first.exchange.id);
  const giver = matched.find((row) => row.receiver_email === "bea@example.com");
  const giverToken = Object.entries(users).find(([, user]) => user.email === giver.giver_email)?.[0];
  const outsider = giver.giver_email === "ada@example.com" ? "organizer" : "ada";
  const assignment = await call("GET", `/api/assignment?exchange=${first.exchange.id}`, { token: giverToken });
  const bottle = assignment.json.items.find((item) => item.title === "Trail bottle");
  assert(bottle.size === "20 oz" && bottle.color === "green", assignment.json.items);
  const reserved = await call("POST", `/api/wish-items/${bottle.id}/reserve`, { token: giverToken });
  assert(reserved.status === 200 && reserved.json.reserved === true, reserved);
  const ownerLists = await call("GET", "/api/wish-lists", { token: "bea" });
  const ownerItem = ownerLists.json.lists[0].items.find((item) => item.id === bottle.id);
  assert(!("reserved" in ownerItem) && !("reservedByMe" in ownerItem), ownerItem);
  const giverAgain = await call("GET", `/api/assignment?exchange=${first.exchange.id}`, { token: giverToken });
  const seen = giverAgain.json.items.find((item) => item.id === bottle.id);
  assert(seen.reserved === true && seen.reservedByMe === true, seen);
  const blockedShop = await call("POST", `/api/wish-items/${bottle.id}/shop`, { token: outsider });
  assert(blockedShop.status === 403, blockedShop);
  const shop = await call("POST", `/api/wish-items/${bottle.id}/shop`, { token: giverToken });
  const shopUrl = new URL(shop.json.shoppingUrl);
  assert(shop.json.retailer === "amazon" && shop.json.affiliateApplied === true, shop.json);
  assert(shopUrl.searchParams.get("tag") === "giftloop-20", shopUrl.toString());
  assert(shopUrl.searchParams.get("th") === "1" && shopUrl.searchParams.get("psc") === "1", shopUrl.toString());
  for (const key of ["giver", "receiver", "recipient", "name"]) assert(!shopUrl.searchParams.has(key), shopUrl.toString());
  const flannel = assignment.json.items.find((item) => item.title === "Red flannel");
  const target = await call("POST", `/api/wish-items/${flannel.id}/shop`, { token: giverToken });
  const targetUrl = new URL(target.json.shoppingUrl);
  assert(target.json.retailer === "target" && target.json.affiliateApplied === true, target.json);
  assert(targetUrl.searchParams.get("preselect") === "red" && targetUrl.searchParams.get("afid") === "giftloop", targetUrl.toString());
  const scarf = assignment.json.items.find((item) => item.title === "Handmade scarf");
  const etsy = await call("POST", `/api/wish-items/${scarf.id}/shop`, { token: giverToken });
  assert(etsy.json.affiliateApplied === false && etsy.json.shoppingUrl.includes("etsy.com/listing/12345"), etsy.json);
  assert(!/[?&](tag|wmlspartner|afid|affCode|irclickid)=/.test(etsy.json.shoppingUrl), etsy.json.shoppingUrl);
  const idea = assignment.json.items.find((item) => item.title === "A walk in the park");
  const plain = await call("POST", `/api/wish-items/${idea.id}/shop`, { token: giverToken });
  assert(plain.json.shoppingUrl === "" && plain.json.affiliateApplied === false, plain.json);
  const edited = await call("POST", `/api/wish-items/${bottle.id}`, {
    token: "bea",
    body: { title: "Trail bottle updated", notes: "lid included", size: "20 oz", color: "green" },
  });
  assert(edited.status === 200, edited);
  const reopened = await call("GET", `/api/assignment?exchange=${first.exchange.id}`, { token: giverToken });
  assert(reopened.json.items.some((item) => item.title === "Trail bottle updated"), reopened.json.items);
});

function enableProviders() {
  env.RESEND_API_KEY = "test-resend";
  env.EMAIL_FROM = "GiftLoop <gifts@example.com>";
  env.TWILIO_ACCOUNT_SID = "AC_test";
  env.TWILIO_AUTH_TOKEN = "twilio-test-token";
  env.TWILIO_FROM_NUMBER = "+15555550000";
}

await check("unconfigured email does not mark a message delivered", async () => {
  env.RESEND_API_KEY = "";
  env.EMAIL_FROM = "";
  const detail = await createExchange("No mail", [{ name: "Ada", email: "ada@example.com" }]);
  await acceptGuests(detail, { "ada@example.com": "ada" });
  const before = outbound.length;
  const sent = await call("POST", `/api/exchanges/${detail.exchange.id}/notify`, {
    token: "organizer",
    body: { channel: "email", kind: "invite" },
  });
  assert(sent.status === 503, sent);
  assert(outbound.length === before, outbound);
  const rows = await admin.query("select status from deliveries where exchange_id = $1", [detail.exchange.id]);
  assert(rows.rows.length === 0, rows.rows);
});

await check("quiet hours defer without sending", async () => {
  enableProviders();
  clock = QUIET;
  const detail = await createExchange("Quiet", [{ name: "Ada", email: "ada@example.com" }]);
  await acceptGuests(detail, { "ada@example.com": "ada" });
  const before = outbound.length;
  const sent = await call("POST", `/api/exchanges/${detail.exchange.id}/notify`, {
    token: "organizer",
    body: { channel: "email", kind: "invite" },
  });
  clock = DAYTIME;
  assert(sent.status === 200 && sent.json.results.every((row) => row.status === "deferred"), sent.json.results);
  assert(outbound.length === before, outbound.slice(before));
  const jobs = await admin.query("select status, run_at from notification_jobs where exchange_id = $1", [detail.exchange.id]);
  assert(jobs.rows.length === 1 && jobs.rows[0].status === "pending" && new Date(jobs.rows[0].run_at) > new RealDate(QUIET), jobs.rows);
});

await check("wish-list email and text use a GiftLoop link", async () => {
  enableProviders();
  resendMode = "ok";
  smsMode = "ok";
  clock = DAYTIME;
  const detail = await createExchange("Wish notes", [
    { name: "Ada", email: "ada@example.com" },
    { name: "Bea", email: "bea@example.com" },
  ]);
  await acceptGuests(detail, { "ada@example.com": "ada", "bea@example.com": "bea" });
  const opted = await call("POST", "/api/settings", {
    token: "ada",
    body: { smsOptIn: true, phone: "+15555550111", emailInvites: true, emailAssignments: true, emailReminders: true },
  });
  assert(opted.status === 200, opted);
  const drawn = await call("POST", `/api/exchanges/${detail.exchange.id}/draw`, { token: "organizer", body: {} });
  assert(drawn.status === 200, drawn);
  const matched = await pairs(admin, detail.exchange.id);
  const before = outbound.length;
  const emailed = await call("POST", `/api/exchanges/${detail.exchange.id}/notify`, {
    token: "organizer",
    body: { channel: "email", kind: "wishlist" },
  });
  assert(emailed.json.results.every((row) => row.status === "accepted"), emailed.json.results);
  const texted = await call("POST", `/api/exchanges/${detail.exchange.id}/notify`, {
    token: "organizer",
    body: { channel: "sms", kind: "wishlist" },
  });
  assert(texted.json.results.some((row) => row.status === "accepted"), texted.json.results);
  assert(texted.json.results.some((row) => row.status === "skipped"), texted.json.results);
  const sent = outbound.slice(before);
  assert(sent.some((row) => row.channel === "email") && sent.some((row) => row.channel === "sms"), sent);
  for (const message of sent) {
    const text = message.text || new URLSearchParams(message.body || "").get("Body") || "";
    assert(text.includes(`/?view=assignment&exchange=${detail.exchange.id}`), text);
    assert(!text.includes("amazon.com") && !text.includes("etsy.com"), text);
    for (const row of matched) {
      if (message.to?.includes(row.giver_email) || message.body?.includes("15555550111")) {
        assert(!text.includes(row.receiver_name), text);
      }
    }
  }
  const stored = await admin.query(
    "select status from deliveries where exchange_id = $1 and kind = 'wishlist' and status = 'accepted'",
    [detail.exchange.id],
  );
  assert(stored.rows.length >= 2, stored.rows);
});

await check("a failed provider send is stored as failed", async () => {
  enableProviders();
  resendMode = "fail";
  const detail = await createExchange("Bounce", [{ name: "Ada", email: "ada@example.com" }]);
  await acceptGuests(detail, { "ada@example.com": "ada" });
  const sent = await call("POST", `/api/exchanges/${detail.exchange.id}/notify`, {
    token: "organizer",
    body: { channel: "email", kind: "invite" },
  });
  resendMode = "ok";
  assert(sent.json.results.some((row) => row.status === "failed"), sent.json.results);
  const rows = await admin.query("select status from deliveries where exchange_id = $1", [detail.exchange.id]);
  assert(rows.rows.some((row) => row.status === "failed") && !rows.rows.some((row) => row.status === "delivered"), rows.rows);
});

await check("Twilio delivery and STOP are signature-checked", async () => {
  enableProviders();
  const detail = await createExchange("Texts", [{ name: "Ada", email: "ada@example.com" }]);
  await acceptGuests(detail, { "ada@example.com": "ada" });
  await call("POST", "/api/settings", {
    token: "ada",
    body: { smsOptIn: true, phone: "+15555550123", emailInvites: true, emailAssignments: true, emailReminders: true },
  });
  const sent = await call("POST", `/api/exchanges/${detail.exchange.id}/notify`, {
    token: "organizer",
    body: { channel: "sms", kind: "invite" },
  });
  assert(sent.json.results.some((row) => row.status === "accepted"), sent.json.results);
  const delivery = await admin.query(
    "select provider_message_id from deliveries where exchange_id = $1 and channel = 'sms' and status = 'accepted'",
    [detail.exchange.id],
  );
  const sid = delivery.rows[0].provider_message_id;
  const statusParams = { MessageSid: sid, MessageStatus: "delivered" };
  const statusUrl = "https://preview.test/api/sms/twilio";
  const bad = await call("POST", "/api/sms/twilio", {
    raw: new URLSearchParams(statusParams).toString(),
    headers: { "x-twilio-signature": "not-a-signature" },
  });
  assert(bad.status === 403, bad);
  const still = await admin.query("select status from deliveries where provider_message_id = $1", [sid]);
  assert(still.rows[0].status === "accepted", still.rows);
  const good = await call("POST", "/api/sms/twilio", {
    raw: new URLSearchParams(statusParams).toString(),
    headers: { "x-twilio-signature": twilioSignature(statusUrl, statusParams, env.TWILIO_AUTH_TOKEN) },
  });
  assert(good.status === 200, good);
  const delivered = await admin.query("select status from deliveries where provider_message_id = $1", [sid]);
  assert(delivered.rows[0].status === "delivered", delivered.rows);
  await admin.query(
    "insert into notification_jobs (exchange_id, member_id, channel, kind, run_at) select $1, id, 'sms', 'reminder', '2020-01-01T00:00:00Z' from members where exchange_id = $1 and email = 'ada@example.com'",
    [detail.exchange.id],
  );
  const stopParams = { Body: "STOP", From: "+15555550123" };
  const stopped = await call("POST", "/api/sms/twilio", {
    raw: new URLSearchParams(stopParams).toString(),
    headers: { "x-twilio-signature": twilioSignature(statusUrl, stopParams, env.TWILIO_AUTH_TOKEN) },
  });
  assert(stopped.status === 200, stopped);
  const prefs = await admin.query("select sms_opt_in, sms_stopped_at from notification_prefs where user_id = 'user-ada'");
  assert(prefs.rows[0].sms_opt_in === false && prefs.rows[0].sms_stopped_at, prefs.rows);
  const jobs = await admin.query(
    "select status from notification_jobs where exchange_id = $1 and channel = 'sms' and kind = 'reminder'",
    [detail.exchange.id],
  );
  assert(jobs.rows.every((row) => row.status === "cancelled"), jobs.rows);
});

await check("reminder claim sends once and opt-out cancels the rest", async () => {
  enableProviders();
  const detail = await createExchange("Reminders", [{ name: "Bea", email: "bea@example.com" }]);
  await acceptGuests(detail, { "bea@example.com": "bea" });
  await admin.query(
    "insert into notification_jobs (exchange_id, member_id, channel, kind, run_at) select $1, id, 'email', 'reminder', '2020-01-01T00:00:00Z' from members where exchange_id = $1 and email = 'bea@example.com'",
    [detail.exchange.id],
  );
  const held = outbound.filter((row) => row.subject?.includes("Reminders")).length;
  await reminders();
  const early = outbound.filter((row) => row.subject?.includes("Reminders"));
  assert(early.length === held, early);
  const waiting = await admin.query("select status, run_at from notification_jobs where exchange_id = $1 and kind = 'reminder'", [detail.exchange.id]);
  assert(waiting.rows[0].status === "pending" && new Date(waiting.rows[0].run_at).toISOString() === "2026-12-13T17:00:00.000Z", waiting.rows);
  await admin.query("update exchanges set event_date = '2026-10-08' where id = $1", [detail.exchange.id]);
  await admin.query("update notification_jobs set run_at = '2020-01-01T00:00:00Z' where exchange_id = $1", [detail.exchange.id]);
  const before = outbound.length;
  await Promise.all([reminders(), reminders()]);
  const sent = outbound.slice(before).filter((row) => row.channel === "email" && row.subject?.includes("Reminders"));
  assert(sent.length === 1, sent);
  const jobs = await admin.query("select status from notification_jobs where exchange_id = $1 and kind = 'reminder' and channel = 'email'", [detail.exchange.id]);
  assert(jobs.rows.length === 1 && jobs.rows[0].status === "sent", jobs.rows);
  const again = outbound.length;
  await reminders();
  assert(outbound.length === again, outbound.slice(again));
  await call("POST", "/api/settings", {
    token: "bea",
    body: { smsOptIn: true, phone: "+15555550199", emailInvites: true, emailAssignments: true, emailReminders: true },
  });
  await admin.query(
    "insert into notification_jobs (exchange_id, member_id, channel, kind, run_at) select $1, id, 'sms', 'reminder', '2020-01-01T00:00:00Z' from members where exchange_id = $1 and email = 'bea@example.com'",
    [detail.exchange.id],
  );
  const optedOut = await call("POST", "/api/settings", {
    token: "bea",
    body: { smsOptIn: false, phone: "+15555550199", emailInvites: true, emailAssignments: true, emailReminders: true },
  });
  assert(optedOut.status === 200, optedOut);
  const cancelled = await admin.query(
    "select status from notification_jobs where exchange_id = $1 and channel = 'sms'",
    [detail.exchange.id],
  );
  assert(cancelled.rows.every((row) => row.status === "cancelled"), cancelled.rows);
});

await check("declining cancels pending notices", async () => {
  const detail = await createExchange("Decline", [{ name: "Cam", email: "cam@example.com" }]);
  const cam = memberByEmail(detail, "cam@example.com");
  await admin.query(
    "insert into notification_jobs (exchange_id, member_id, channel, kind, run_at) values ($1, $2, 'email', 'invite', now() + interval '1 day')",
    [detail.exchange.id, cam.id],
  );
  const declined = await call("POST", `/api/invites/${cam.inviteToken}/decline`);
  assert(declined.status === 200 && declined.json.status === "declined", declined);
  const jobs = await admin.query("select status from notification_jobs where member_id = $1", [cam.id]);
  assert(jobs.rows[0].status === "cancelled", jobs.rows);
});

await check("quiet-hour reminder stays queued and a failed attempt does not duplicate", async () => {
  enableProviders();
  const detail = await createExchange("Retry", [{ name: "Cam", email: "cam@example.com" }]);
  await acceptGuests(detail, { "cam@example.com": "cam" });
  await admin.query("update exchanges set event_date = '2026-10-08' where id = $1", [detail.exchange.id]);
  await admin.query(
    "insert into notification_jobs (exchange_id, member_id, channel, kind, run_at) select $1, id, 'email', 'reminder', '2020-01-01T00:00:00Z' from members where exchange_id = $1 and email = 'cam@example.com'",
    [detail.exchange.id],
  );
  clock = QUIET;
  const before = outbound.length;
  await reminders();
  clock = DAYTIME;
  assert(outbound.length === before, outbound.slice(before));
  const deferred = await admin.query("select status, attempts from notification_jobs where exchange_id = $1", [detail.exchange.id]);
  assert(deferred.rows[0].status === "pending" && deferred.rows[0].attempts === 0, deferred.rows);
  resendMode = "fail";
  await reminders();
  resendMode = "ok";
  const retried = await admin.query("select status, attempts from notification_jobs where exchange_id = $1", [detail.exchange.id]);
  assert(retried.rows[0].status === "pending" && retried.rows[0].attempts === 1, retried.rows);
  await reminders();
  const done = await admin.query(
    "select status from notification_jobs where exchange_id = $1",
    [detail.exchange.id],
  );
  const deliveries = await admin.query(
    "select status from deliveries where exchange_id = $1 and kind = 'reminder'",
    [detail.exchange.id],
  );
  assert(done.rows[0].status === "sent" && deliveries.rows.length === 1 && deliveries.rows[0].status === "accepted", { done: done.rows, deliveries: deliveries.rows });
});

await check("Resend delivery callback requires a valid signature", async () => {
  enableProviders();
  env.RESEND_WEBHOOK_SECRET = "whsec_" + Buffer.from("resend-test-secret").toString("base64");
  const detail = await createExchange("Receipts", [{ name: "Ada", email: "ada@example.com" }]);
  const member = memberByEmail(detail, "ada@example.com");
  await admin.query(
    "insert into deliveries (exchange_id, member_id, channel, status, kind, provider_message_id) values ($1, $2, 'email', 'accepted', 'invite', 'email_callback_1')",
    [detail.exchange.id, member.id],
  );
  const payload = JSON.stringify({ type: "email.delivered", data: { email_id: "email_callback_1" } });
  const id = "msg_test";
  const timestamp = "1717171717";
  const signature = resendSignature({ id, timestamp, body: payload, secret: env.RESEND_WEBHOOK_SECRET });
  const bad = await call("POST", "/api/email/resend", {
    raw: payload,
    headers: { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": "v1,bm90LXZhbGlk" },
  });
  assert(bad.status === 403, bad);
  const good = await call("POST", "/api/email/resend", {
    raw: payload,
    headers: { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` },
  });
  assert(good.status === 200, good);
  const row = await admin.query("select status from deliveries where provider_message_id = 'email_callback_1'");
  assert(row.rows[0].status === "delivered", row.rows);
});

await check("support lookup does not include the recipient", async () => {
  const lookup = await call("GET", "/api/support/lookup?email=ada@example.com", { token: "support" });
  assert(lookup.status === 200 && lookup.json.exchanges.length > 0, lookup.json);
  assert(!lookup.text.includes("recipientName") && !lookup.text.includes("receiverMemberId"), lookup.text);
});

await check("deleting an account removes that person's saved data", async () => {
  const detail = await createExchange("Delete me", [{ name: "Bea", email: "bea@example.com" }]);
  await acceptGuests(detail, { "bea@example.com": "bea" });
  const created = await call("POST", "/api/exchanges", {
    token: "stranger",
    body: { title: "Stranger private", eventDate: "2026-12-20", timezone: "America/Los_Angeles", budget: "25" },
  });
  assert(created.status === 201, created);
  const refused = await call("POST", "/api/account/delete", { token: "stranger", body: {} });
  assert(refused.status === 400, refused);
  const removed = await call("POST", "/api/account/delete", { token: "bea", body: { confirm: "delete" } });
  assert(removed.status === 200 && removed.json.deleted === true, removed);
  const seats = await admin.query("select user_id, email from members where user_id = 'user-bea' or lower(email) = 'bea@example.com'");
  assert(seats.rows.length === 0, seats.rows);
  const kept = await admin.query("select id from exchanges where id = $1", [detail.exchange.id]);
  assert(kept.rows.length === 1, kept.rows);
  const strangerGone = await call("POST", "/api/account/delete", { token: "stranger", body: { confirm: "delete" } });
  assert(strangerGone.status === 200, strangerGone);
  const strangerExchanges = await admin.query("select id from exchanges where organizer_id = 'user-stranger'");
  assert(strangerExchanges.rows.length === 0, strangerExchanges.rows);
});

await admin.end();
const failed = results.filter((row) => row.result === "failed");
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length) process.exit(1);
