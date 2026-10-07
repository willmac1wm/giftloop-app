import React, { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { api } from "../account/api";

export default function AssignmentScreen({ exchangeId, user, onNeedAccount }) {
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
      {assignment && loadedUserId === user.id && !assignment.ready && <p className="text-sm text-slate-300">Names have not been drawn yet.</p>}
      {assignment?.ready && loadedUserId === user.id && (
        <>
          <p className="text-white">You are giving to {assignment.recipientName}.</p>
          <ul className="space-y-2">
            {(assignment.items || []).map((item) => (
              <li key={item.id} className="border border-white/10 rounded-lg p-3 text-sm">
                <p className="text-white">{item.title}</p>
                {item.size || item.color ? <p className="text-xs text-slate-400">{[item.size, item.color].filter(Boolean).join(" · ")}</p> : null}
                {item.notes && <p className="text-slate-300">{item.notes}</p>}
                {item.shoppingUrl && (
                  <a className="text-sky-300 text-xs" href={item.shoppingUrl} target="_blank" rel="noopener noreferrer">Shop this gift</a>
                )}
                <p className="text-[11px] text-slate-500">Opening the store does not mark this gift purchased.</p>
                <p className="text-xs text-slate-400 mt-1">{item.reserved ? "Reserved" : "Available"}</p>
                {!item.reserved && (
                  <button
                    type="button"
                    className="btn btn-secondary text-xs mt-2"
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
              </li>
            ))}
            {(assignment.items || []).length === 0 && <li className="text-sm text-slate-400">No shared wish list yet.</li>}
          </ul>
        </>
      )}
    </section>
  );
}
