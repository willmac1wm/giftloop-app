import React, { useState } from "react";
import { organizerMatch } from "../exchange/progress";

function wishText(item) {
  if (typeof item === "string") return item;
  return item?.title || "";
}

export default function ExchangeWishLinks({ event, onOpenMine, onPreview }) {
  const [open, setOpen] = useState(false);
  const match = organizerMatch(event);
  const people = event?.participants || [];
  const receiver = match ? people.find((person) => person.id === match.receiver?.id) || match.receiver : null;
  const wishes = (receiver?.wishlist || []).map(wishText).filter(Boolean);

  return (
    <div className="exchange-wishes">
      <button type="button" className="btn btn-secondary text-sm" onClick={onOpenMine}>
        My wish list
      </button>
      <button
        type="button"
        className="btn btn-secondary text-sm"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        My recipient&apos;s wishes
      </button>
      {open && (
        <div className="exchange-wish-panel">
          {!match && (
            <p>Names are not drawn yet. Set exclusions, then draw names. Your recipient&apos;s wishes show up here after that.</p>
          )}
          {match && (
            <>
              <p>You are giving to {receiver?.name || "your recipient"}.</p>
              {wishes.length === 0 ? (
                <p>No wishes yet.</p>
              ) : (
                <ul>
                  {wishes.map((wish) => <li key={wish}>{wish}</li>)}
                </ul>
              )}
              {onPreview && (
                <button type="button" className="btn btn-primary text-sm" onClick={onPreview}>
                  Reveal your recipient
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
