export function acceptDecision({ member, user }) {
  if (!member) return { ok: false, status: 404, error: "That invitation was not found." };
  if (member.userId && member.userId !== user?.id) {
    return { ok: false, status: 409, error: "This invitation was already accepted." };
  }
  const invitedEmail = String(member.email || "").toLowerCase();
  const accountEmail = String(user?.email || "").toLowerCase();
  if (invitedEmail && invitedEmail !== accountEmail) {
    return { ok: false, status: 403, error: "Sign in with the email address on the invitation." };
  }
  return { ok: true };
}

export function interpretDrawLock({ locked, fresh }) {
  if (locked) return { proceed: true };
  if (fresh?.drawnAt) return { alreadyDrawn: true };
  return { status: 409, error: "A draw is already in progress." };
}

export function recipientForMember({ userId, members, pairs, drawn }) {
  const member = (members || []).find((row) => row.userId === userId);
  if (!member) return { status: 404, error: "You are not on this exchange." };
  if (!drawn) return { ready: false };
  const pair = (pairs || []).filter((row) => row.giverMemberId === member.id);
  if (pair.length !== 1) return { ready: false };
  const receiver = (members || []).find((row) => row.id === pair[0].receiverMemberId);
  return {
    ready: true,
    recipientName: receiver?.name || "",
    receiverId: receiver?.id || "",
  };
}

export function withoutPairings(payload) {
  const copy = { ...(payload || {}) };
  delete copy.assignments;
  delete copy.matches;
  delete copy.pairs;
  delete copy.recipientName;
  return copy;
}

export function ownerWishItem(item) {
  return {
    id: item.id,
    title: item.title,
    notes: item.notes,
    size: item.size,
    color: item.color,
    priority: item.priority,
    originalUrl: item.originalUrl,
    shoppingUrl: item.shoppingUrl,
    retailer: item.retailer,
  };
}

export function supportLookupView({ email, seats }) {
  return {
    email,
    exchanges: (seats || []).map((seat) => ({
      exchangeTitle: seat.exchangeTitle,
      status: seat.status,
      hasWishes: Boolean(seat.hasWishes),
    })),
    failures: (seats || []).flatMap((seat) => seat.failures || []),
  };
}

export function staffRole(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  if (roles.includes("admin") || roles.includes("administrator")) return "admin";
  if (roles.includes("support")) return "support";
  return "";
}

export function memberOnlyRoles(roles) {
  return Array.from(new Set([...(Array.isArray(roles) ? roles : []).filter((role) => role === "member"), "member"]));
}
