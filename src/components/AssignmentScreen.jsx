import React, { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { api } from "../account/api";
import { GiftVibeCard } from "./GiftVibe";
import ShopDisclosure from "./ShopDisclosure";

export default function AssignmentScreen({ exchangeId, user, onNeedAccount, onOpenWishlist }) {
  const [assignment, setAssignment] = useState(null);
  const [loadedUserId, setLoadedUserId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setAssignment(null);
    setLoadedUserId("");
    setError("");
    if (!user) return undefined;
    let cancel = false;
    api(`/api/assignment?exchange=${encodeURIComponent(exchangeId)}`)
      .then((data) => {
        if (cancel) return;
        setAssignment(data);
        setLoadedUserId(user.id);
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      });
    return () => {
      cancel = true;
    };
  }, [user, exchangeId]);

  if (!user) {
    return (
      <section className="glass-panel p-6 max-w-lg mx-auto text-center space-y-3">
        <Gift className="mx-auto text-rose-300" />
        <h2 className="text-xl font-bold text-white">Your recipient is ready</h2>
        <p className="text-sm text-slate-300">
          Sign in with the account that joined this exchange. This page does not put their name in the link.
        </p>
        <button type="button" className="btn btn-gold text-sm" onClick={onNeedAccount}>Sign in</button>
      </section>
    );
  }

  return (
    <section className="glass-panel p-6 max-w-lg mx-auto space-y-3">
      <h2 className="text-xl font-bold text-white">{assignment?.exchangeTitle || "Your recipient"}</h2>
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      {assignment && loadedUserId === user.id && !assignment.ready && (
        <>
          <p className="text-sm text-slate-300">Names have not been drawn yet. Your recipient&apos;s wishes appear after the draw.</p>
          <button type="button" className="btn btn-secondary text-sm" onClick={onOpenWishlist}>My wish list</button>
        </>
      )}
      {assignment?.ready && loadedUserId === user.id && (
        <>
          <p className="text-sm text-slate-300">Next: shop for {assignment.recipientName}.</p>
          <p className="text-lg text-white">You are giving to {assignment.recipientName}.</p>
          <div className="exchange-wishes">
            <button type="button" className="btn btn-secondary text-sm" onClick={onOpenWishlist}>My wish list</button>
          </div>
          <h3 className="text-base font-semibold text-white">My recipient&apos;s wishes</h3>
          <GiftVibeCard vibe={assignment.giftVibe} />
          <ShopDisclosure />
          <ul className="space-y-2">
            {(assignment.items || []).map((item) => (
              <li key={item.id} className="border border-white/10 rounded-lg p-3 text-sm space-y-2">
                <p className="text-white">{item.title}</p>
                {item.size || item.color ? <p className="text-xs text-slate-400">{[item.size, item.color].filter(Boolean).join(" · ")}</p> : null}
                {item.notes && <p className="text-slate-300">{item.notes}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary text-xs"
                    onClick={() => api(`/api/wish-items/${item.id}/shop`, { method: "POST", json: {} }).then((data) => {
                      if (!data.shoppingUrl) {
                        setError("This gift has no store link.");
                        return;
                      }
                      window.open(data.shoppingUrl, "_blank", "noopener");
                    }).catch((err) => setError(err.message))}
                  >
                    Shop{item.retailer ? ` at ${item.retailer}` : ""}
                  </button>
                  {!item.reserved && (
                    <button
                      type="button"
                      className="text-xs text-slate-300 underline"
                      onClick={() => api(`/api/wish-items/${item.id}/reserve`, { method: "POST", json: {} }).then(() => {
                        setAssignment({
                          ...assignment,
                          items: assignment.items.map((row) => (row.id === item.id ? { ...row, reserved: true, reservedByMe: true } : row)),
                        });
                      }).catch((err) => setError(err.message))}
                    >
                      I’ll get this
                    </button>
                  )}
                  {item.reserved && <span className="text-xs text-slate-400">Reserved</span>}
                </div>
              </li>
            ))}
            {(assignment.items || []).length === 0 && <li className="text-sm text-slate-400">No shared wish list yet.</li>}
          </ul>
        </>
      )}
    </section>
  );
}
