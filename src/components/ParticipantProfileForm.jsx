import React, { useState } from "react";

export default function ParticipantProfileForm({
  name = "",
  wishes = "",
  likes = "",
  dislikes = "",
  submitLabel = "Save my list",
  onSubmit,
}) {
  const [wishText, setWishText] = useState(wishes);
  const [likeText, setLikeText] = useState(likes);
  const [dislikeText, setDislikeText] = useState(dislikes);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ wishes: wishText, likes: likeText, dislikes: dislikeText });
      }}
    >
      <p className="text-sm text-slate-300">
        {name ? `${name}, add what you would like.` : "Add what you would like."} Your Santa sees this after the draw. The organizer does not fill it in for you.
      </p>
      <label className="block text-xs text-slate-400">
        Wishlist ideas, one per line
        <textarea className="glass-input w-full mt-1 text-sm" rows={4} value={wishText} onChange={(e) => setWishText(e.target.value)} placeholder={"Coffee beans\nWool socks\nSci-fi book"} />
      </label>
      <label className="block text-xs text-slate-400">
        Likes and hobbies
        <textarea className="glass-input w-full mt-1 text-sm" rows={2} value={likeText} onChange={(e) => setLikeText(e.target.value)} placeholder="Baking, hiking, jazz music" />
      </label>
      <label className="block text-xs text-slate-400">
        Dislikes and allergies
        <textarea className="glass-input w-full mt-1 text-sm" rows={2} value={dislikeText} onChange={(e) => setDislikeText(e.target.value)} placeholder="Nut allergy, no scented candles" />
      </label>
      <button type="submit" className="btn btn-primary text-sm">{submitLabel}</button>
    </form>
  );
}
