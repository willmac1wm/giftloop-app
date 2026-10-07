import React, { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { api } from "../account/api";
import DealBanner from "./DealBanner";

const NEXT_STEP = {
  names: "Add the people in your group",
  wishes: "Add wishes",
  exclusions: "Choose exclusions, or skip them",
  details: "Add the date and budget",
  message: "Write the invitation",
  draw: "Draw names",
  share: "Share each person's link",
};

export default function HomeScreen({ exchange, user, onCreate, onContinue, onOpenManage }) {
  const [saved, setSaved] = useState([]);
  const [savedNote, setSavedNote] = useState("");

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

  const step = exchange?.wizardStep || "start";
  const inProgress = step !== "start" || Boolean(exchange?.title) || Boolean(exchange?.matches);
  const next = NEXT_STEP[step] || "Continue this exchange";

  return (
    <section className="home-screen">
      <p className="home-kicker">Christmas Secret Santa</p>
      <h1>Your exchanges</h1>
      <p className="home-lede">
        Create a group, invite people, and draw names. You can start on this device with no account.
      </p>
      <button type="button" className="btn btn-primary text-base px-5 py-3" onClick={onCreate}>
        <Gift size={18} />
        Create an exchange
      </button>

      {inProgress && (
        <article className="home-card">
          <h2>{exchange.title || "Secret Santa on this device"}</h2>
          <p>
            {[exchange.exchangeDate && `Gift date ${exchange.exchangeDate}`, exchange.budget && `Budget ${exchange.budget}`]
              .filter(Boolean)
              .join(" · ") || "Date and budget come in a later step."}
          </p>
          <p className="home-next">Next: {next}</p>
          <button type="button" className="btn btn-secondary text-sm" onClick={onContinue}>
            Continue
          </button>
        </article>
      )}

      {user && saved.length > 0 && (
        <div className="home-saved">
          <h2>Saved exchanges</h2>
          <ul>
            {saved.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.eventDate ? `Gift date ${item.eventDate}` : "No gift date yet"}{item.drawn ? " · Names are drawn" : ""}</span>
                </div>
                <button type="button" className="btn btn-secondary text-xs" onClick={() => onOpenManage(item.id)}>
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {savedNote && <p className="home-note">{savedNote}</p>}

      <p className="home-note">
        Have an invitation? Open the link from your email or text. A private invitation works only for the invited account. An open join link says when anyone with it can ask to join.
      </p>

      <details className="home-stores">
        <summary>Holiday stores</summary>
        <p className="home-note">
          Store buttons can include a referral code. Sample codes are not an approved affiliate account. Paste your own codes from the menu under Affiliate tags.
        </p>
        <DealBanner />
      </details>
    </section>
  );
}
