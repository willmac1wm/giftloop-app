import React, { useState } from "react";
import ParticipantProfileForm from "./ParticipantProfileForm";

export default function DeviceProfileScreen({ event, personId, onSave }) {
  const person = (event?.participants || []).find((item) => item.id === personId);
  const [saved, setSaved] = useState(false);

  if (!person) {
    return (
      <section className="glass-panel p-6 max-w-lg mx-auto space-y-2">
        <h2 className="text-xl font-bold font-heading text-white">Your wish list</h2>
        <p className="text-sm text-slate-300">
          This list is not on this device. Open the invite on the phone that created the exchange, or accept the saved invitation after you sign in.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel p-6 max-w-lg mx-auto space-y-3">
      <p className="home-kicker">Your invitation</p>
      <h2 className="text-xl font-bold font-heading text-white">{event.title || "Secret Santa"}</h2>
      {saved && <p className="text-sm text-emerald-300">Saved. Your Santa sees this after the draw.</p>}
      <ParticipantProfileForm
        name={person.name}
        wishes={(person.wishlist || []).join("\n")}
        likes={person.likes || ""}
        dislikes={person.dislikes || ""}
        onSubmit={(fields) => {
          onSave(person.id, fields);
          setSaved(true);
        }}
      />
    </section>
  );
}
