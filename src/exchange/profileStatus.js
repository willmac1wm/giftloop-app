function filled(value) {
  if (Array.isArray(value)) return value.some((item) => String(item || "").trim());
  return Boolean(String(value || "").trim());
}

export function profileStatus(person = {}) {
  if (person.status === "declined") return "Declined";
  if (person.status === "requested") return "Asked to join";
  const hasList = filled(person.wishlist) || filled(person.wishes) || person.hasWishes || person.wishListId;
  if (hasList || filled(person.likes) || filled(person.hobbies) || filled(person.dislikes)) return "Wishlist added";
  if (person.joined || person.status === "accepted") return "Joined";
  return "Invited";
}
