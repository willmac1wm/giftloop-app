import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { deliveries, exchanges, members, notificationJobs, notificationPrefs } from "../../db/schema.js";
import { assignmentNotice } from "../../src/server/assignments.js";
import { providerEnv, readProviders, sendEmail, sendSms } from "../../src/server/messages.js";
import { deliveryDecision } from "../../src/server/notifyPolicy.js";

function reminderText(exchange, origin) {
  const url = `${origin}/?view=assignment&exchange=${exchange.id}`;
  if (exchange.drawnAt) return assignmentNotice({ title: exchange.title, url });
  return `Reminder for ${exchange.title || "Secret Santa"}.\n\nOpen GiftLoop:\n${url}\n\nThis message does not include anyone's assignment.`;
}

export default async function handler() {
  const now = new Date();
  const jobs = await db
    .select()
    .from(notificationJobs)
    .where(and(eq(notificationJobs.status, "pending"), lte(notificationJobs.runAt, now)))
    .limit(25);
  const env = providerEnv();
  const providers = readProviders(env);
  const origin = String(Netlify.env.get("URL") || Netlify.env.get("DEPLOY_PRIME_URL") || "").replace(/\/$/, "");

  for (const job of jobs) {
    const [person] = await db.select().from(members).where(eq(members.id, job.memberId)).limit(1);
    const [exchange] = person
      ? await db.select().from(exchanges).where(eq(exchanges.id, person.exchangeId)).limit(1)
      : [];
    const [prefs] = person?.userId
      ? await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, person.userId)).limit(1)
      : [];
    if (!person || !exchange || person.status === "declined") {
      await db.update(notificationJobs).set({ status: "cancelled", detail: "The exchange or person is no longer active." }).where(eq(notificationJobs.id, job.id));
      continue;
    }
    const prior = await db
      .select()
      .from(deliveries)
      .where(and(
        eq(deliveries.memberId, person.id),
        eq(deliveries.channel, job.channel),
        eq(deliveries.kind, job.kind),
        inArray(deliveries.status, ["sent", "accepted", "delivered"]),
      ));
    const decision = deliveryDecision({
      channel: job.channel,
      kind: job.kind,
      prefs: prefs || null,
      sentCount: prior.length,
      resend: false,
      memberStatus: person.status,
    });
    if (!decision.send) {
      await db.update(notificationJobs).set({ status: "cancelled", detail: decision.reason }).where(eq(notificationJobs.id, job.id));
      continue;
    }
    const ready = job.channel === "email" ? providers.emailReady : providers.smsReady;
    if (!ready) {
      await db.update(notificationJobs).set({
        attempts: job.attempts + 1,
        status: job.attempts + 1 >= 3 ? "failed" : "pending",
        detail: "The message provider is not configured.",
      }).where(eq(notificationJobs.id, job.id));
      continue;
    }
    try {
      const text = reminderText(exchange, origin);
      const providerMessageId = job.channel === "email"
        ? await sendEmail({ to: person.email, subject: `Reminder for ${exchange.title}`, text, env })
        : await sendSms({ to: prefs.phone, text, env });
      await db.insert(deliveries).values({
        exchangeId: exchange.id,
        memberId: person.id,
        channel: job.channel,
        status: "accepted",
        detail: "Accepted by the provider. Delivery is not confirmed yet.",
        kind: job.kind,
        providerMessageId: String(providerMessageId || "").slice(0, 80),
      });
      await db.update(notificationJobs).set({ status: "sent", detail: "Accepted by the provider." }).where(eq(notificationJobs.id, job.id));
    } catch (error) {
      const attempts = job.attempts + 1;
      await db.update(notificationJobs).set({
        attempts,
        status: attempts >= 3 ? "failed" : "pending",
        detail: error instanceof Error ? error.message.slice(0, 300) : "Send failed.",
      }).where(eq(notificationJobs.id, job.id));
    }
  }
  return new Response("ok");
}

export const config = {
  schedule: "*/15 * * * *",
};
