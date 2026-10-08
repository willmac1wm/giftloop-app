/**
 * Create the App Store reviewer exchange.
 *
 * Do not put the password in this file or in git. Will sets it in the shell
 * and copies the same email and password into App Store Connect review notes.
 *
 *   REVIEWER_EMAIL=... REVIEWER_PASSWORD=... NETLIFY_DB_URL=... \
 *     node scripts/seed-reviewer.mjs
 *
 * Identity must already have that confirmed account. Create it in the Netlify
 * UI (Identity → Users) or by signing up on the site and confirming the email.
 * The script looks the account up with the password grant and then writes one
 * sample exchange. It refuses to print the password.
 */
import { randomBytes } from "node:crypto";
import pg from "pg";

const email = String(process.env.REVIEWER_EMAIL || "").trim().toLowerCase();
const password = String(process.env.REVIEWER_PASSWORD || "");
const site = String(process.env.REVIEWER_SITE || "https://giftloop-preview-423.netlify.app").replace(/\/$/, "");
const databaseUrl = process.env.NETLIFY_DB_URL || "";

if (!email || !password || !databaseUrl) {
  console.error("Set REVIEWER_EMAIL, REVIEWER_PASSWORD, and NETLIFY_DB_URL in the environment. They are not stored in the repo.");
  process.exit(1);
}

const tokenResponse = await fetch(`${site}/.netlify/identity/token`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
  body: new URLSearchParams({ grant_type: "password", username: email, password }),
});
if (!tokenResponse.ok) {
  console.error("Identity did not accept that email and password. Confirm the account in the Netlify UI, then run this again.");
  process.exit(1);
}
const token = await tokenResponse.json();
const userResponse = await fetch(`${site}/.netlify/identity/user`, {
  headers: { Authorization: `Bearer ${token.access_token}`, accept: "application/json" },
});
if (!userResponse.ok) {
  console.error("The reviewer account signed in, but the profile could not be read.");
  process.exit(1);
}
const user = await userResponse.json();
if (!user.confirmed_at) {
  console.error("Confirm the reviewer account in Netlify Identity before seeding the exchange.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  const existing = await client.query(
    "select id from exchanges where organizer_id = $1 and title = $2 limit 1",
    [user.id, "Reviewer Christmas"],
  );
  if (existing.rows[0]) {
    console.log(`Reviewer exchange already exists: ${existing.rows[0].id}`);
    process.exit(0);
  }
  await client.query("begin");
  const exchange = await client.query(
    `insert into exchanges (organizer_id, organizer_email, title, budget, occasion, event_date, status, timezone)
     values ($1, $2, 'Reviewer Christmas', '$30', 'Christmas', '2026-12-24', 'accepting', 'America/Los_Angeles')
     returning id`,
    [user.id, email],
  );
  const exchangeId = exchange.rows[0].id;
  const people = [
    ["Reviewer", email, user.id, "accepted", "organizer", "Wool socks\nSci-fi book", "Board games", ""],
    ["Jordan Smith", "jordan.reviewer@example.com", null, "invited", "member", "", "", ""],
    ["Maya Lin", "maya.reviewer@example.com", null, "accepted", "member", "Warm wool beanie", "Coffee, pottery", "Scented lotions"],
  ];
  for (const [name, personEmail, userId, status, role, wishes, hobbies, dislikes] of people) {
    await client.query(
      `insert into members (exchange_id, user_id, name, email, status, exchange_role, wishes, hobbies, dislikes, invite_token)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [exchangeId, userId, name, personEmail, status, role, wishes, hobbies, dislikes, randomBytes(18).toString("hex")],
    );
  }
  await client.query("commit");
  console.log(`Seeded reviewer exchange ${exchangeId} for ${email}. Sign in on the iPhone app and open Manage exchange.`);
} catch (error) {
  await client.query("rollback");
  console.error("The exchange was not saved.");
  process.exitCode = 1;
} finally {
  await client.end();
}
