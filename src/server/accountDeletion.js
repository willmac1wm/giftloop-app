import { and, eq, sql } from "drizzle-orm";
import {
  exchanges,
  giftPreferences,
  members,
  notificationJobs,
  notificationPrefs,
  tickets,
  wishLists,
} from "../../db/schema.js";

const removedMember = {
  userId: null,
  name: "Removed member",
  email: "",
  phone: "",
  listTitle: "",
  ageBand: "",
  shopFor: "",
  wishes: "",
  hobbies: "",
  dislikes: "",
  status: "declined",
  inviteToken: null,
  wishListId: null,
};

export async function deleteAccountData(database, user) {
  const userId = String(user?.id || "");
  const email = String(user?.email || "").trim().toLowerCase();
  if (!userId) {
    const error = new Error("Sign in to continue.");
    error.status = 401;
    throw error;
  }

  await database.delete(exchanges).where(eq(exchanges.organizerId, userId));

  const seats = await database
    .select()
    .from(members)
    .where(email
      ? sql`${members.userId} = ${userId} OR lower(${members.email}) = ${email}`
      : eq(members.userId, userId));

  for (const seat of seats) {
    await database
      .update(notificationJobs)
      .set({ status: "cancelled", detail: "This account was deleted." })
      .where(and(eq(notificationJobs.memberId, seat.id), eq(notificationJobs.status, "pending")));
    await database.update(members).set(removedMember).where(eq(members.id, seat.id));
  }

  await database.delete(wishLists).where(eq(wishLists.ownerUserId, userId));
  await database.delete(notificationPrefs).where(eq(notificationPrefs.userId, userId));
  await database.delete(giftPreferences).where(eq(giftPreferences.userId, userId));
  await database.delete(tickets).where(eq(tickets.requesterUserId, userId));

  return { deleted: true, exchangesRemoved: true, membershipsCleared: seats.length };
}
