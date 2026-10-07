const PRIVATE_PREFIXES = ["giftloop_note_", "giftloop_purchased_"];

export function clearPrivateRevealNotes() {
  try {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && PRIVATE_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // A private browser mode can block storage. Sign-out still drops the signed-in screens.
  }
}
