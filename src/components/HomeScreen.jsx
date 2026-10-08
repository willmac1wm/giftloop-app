import React, { useEffect, useState } from "react";
import { api } from "../account/api";
import GroupContinuity from "./GroupContinuity";
import DealBanner from "./DealBanner";
import { NEXT_ACTION_LABEL, deviceNextAction } from "../exchange/progress";

const NEXT_STEP = {
  names: "Add the people in your group",
  wishes: "Add wishes",
  exclusions: "Choose exclusions, or skip them",
  details: "Add the date and budget",
  message: "Write the invitation",
  draw: "Draw names",
  share: "Share each person's link",
};

export default function HomeScreen({
  exchange,
  user,
  onCreate,
  onContinue,
  onReveal,
  onOpenManage,
  onRevealSaved,
  onSavedFocus,
  onOpenWishlist,
}) {
  const [saved, setSaved] = useState([]);
  const [savedNote, setSavedNote] = useState("");
  const deviceKind = deviceNextAction(exchange);
  const step = exchange?.wizardStep || "start";
  const next = deviceKind === "reveal"
    ? "See who you are giving to, and read their wishes."
    : (NEXT_STEP[step] || "Continue this exchange");

  useEffect(() => {
    if (!user) {
      setSaved([]);
      setSavedNote("");
      return undefined;
    }
    let cancel = false;
    api("/api/exchanges")
      .then((data) => {
        if (!cancel) setSaved(data.exchanges || []);
      })
      .catch(() => {
        if (!cancel) setSavedNote("Saved exchanges appear here after you sign in on the live site.");
      });
    return () => {
      cancel = true;
    };
  }, [user]);

  const featuredSaved = deviceKind === "create" ? saved[0] : null;

  useEffect(() => {
    if (!onSavedFocus) return;
    if (deviceKind !== "create" || !featuredSaved) onSavedFocus(null);
    else onSavedFocus({ id: featuredSaved.id, drawn: featuredSaved.drawn, title: featuredSaved.title });
  }, [deviceKind, featuredSaved, onSavedFocus]);

  const returning = deviceKind !== "create" || Boolean(featuredSaved);

  return (
    <section className="home-screen">
      <p className="home-kicker">Christmas Secret Santa</p>
      <h1>Your exchanges</h1>

      {deviceKind !== "create" && (
        <article className="home-card">
          <h2>{exchange.title || "Secret Santa on this device"}</h2>
          <p>
            {[exchange.exchangeDate && `Gift date ${exchange.exchangeDate}`, exchange.budget && `Budget ${exchange.budget}`]
              .filter(Boolean)
              .join(" · ") || "Date and budget come in a later step."}
          </p>
          <p className="home-next">Next: {next}</p>
          <button
            type="button"
            className="btn btn-primary text-base px-5 py-3"
            onClick={deviceKind === "reveal" ? onReveal : onContinue}
          >
            {NEXT_ACTION_LABEL[deviceKind]}
          </button>
        </article>
      )}

      {featuredSaved && (
        <article className="home-card">
          <h2>{featuredSaved.title}</h2>
          <p>
            {featuredSaved.eventDate ? `Gift date ${featuredSaved.eventDate}` : "No gift date yet"}
            {featuredSaved.drawn ? " · Names are drawn" : ""}
          </p>
          <p className="home-next">
            Next: {featuredSaved.drawn ? "See who you are giving to." : "Invite people, set exclusions, then draw names."}
          </p>
          <button
            type="button"
            className="btn btn-primary text-base px-5 py-3"
            onClick={() => (featuredSaved.drawn ? onRevealSaved(featuredSaved.id) : onOpenManage(featuredSaved.id))}
          >
            {featuredSaved.drawn ? "Reveal your recipient" : "Continue your exchange"}
          </button>
        </article>
      )}

      {!returning && (
        <>
          <p className="home-lede">
            Create a group, invite people, and draw names. You can start on this device with no account.
          </p>
          <button type="button" className="btn btn-primary text-base px-5 py-3" onClick={onCreate}>
            Create an exchange
          </button>
        </>
      )}

      {user && saved.length > (featuredSaved ? 1 : 0) && (
        <div className="home-saved">
          <h2>Saved exchanges</h2>
          <ul>
            {saved.filter((item) => item.id !== featuredSaved?.id).map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.eventDate ? `Gift date ${item.eventDate}` : "No gift date yet"}{item.drawn ? " · Names are drawn" : ""}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary text-xs"
                  onClick={() => (item.drawn ? onRevealSaved(item.id) : onOpenManage(item.id))}
                >
                  {item.drawn ? "Reveal your recipient" : "Continue"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {savedNote && <p className="home-note">{savedNote}</p>}

      {returning && (
        <button type="button" className="home-quiet" onClick={onCreate}>
          Create another exchange
        </button>
      )}

      {user && <GroupContinuity key={user.id} user={user} onCreated={onOpenManage} onOpenWishlist={onOpenWishlist} />}

      <p className="home-note">
        Have an invitation? Open the link from your email or text. A private invitation works only for the invited account. An open join link says when anyone with it can ask to join.
      </p>

      <details className="home-stores">
        <summary>Holiday stores</summary>
        <DealBanner />
      </details>
    </section>
  );
}
