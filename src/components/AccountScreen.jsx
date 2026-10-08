import React, { useState } from "react";
import { KeyRound, LogIn, UserPlus } from "lucide-react";
import { api, authErrorMessage } from "../account/api";
import { clearPrivateRevealNotes } from "../account/privacy";
import { sound } from "../utils/audio";
import NotificationSettings from "./NotificationSettings";

export default function AccountScreen({
  user,
  recovery,
  onSignedIn,
  onSignedOut,
  onBack,
  backLabel = "Back home",
  staff = "",
  onOpenSupport,
  onOpenMerchants,
  onOpenAffiliate,
}) {
  const [mode, setMode] = useState(recovery ? "recovery" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (work) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    sound.playClick();
    run(async () => {
      const identity = await import("@netlify/identity");
      if (mode === "signup") {
        const created = await identity.signup(email.trim(), password, { full_name: name.trim() });
        if (created?.confirmedAt) {
          onSignedIn(created);
        } else {
          setMessage("Check your email and confirm the account, then sign in.");
          setMode("login");
        }
        return;
      }
      if (mode === "recovery") {
        const updated = await identity.updateUser({ password });
        setMessage("Password saved.");
        onSignedIn(updated || user);
        return;
      }
      if (mode === "forgot") {
        await identity.requestPasswordRecovery(email.trim());
        setMessage("If that account exists, a reset link is on its way.");
        setMode("login");
        return;
      }
      const signedIn = await identity.login(email.trim(), password);
      onSignedIn(signedIn);
    });
  };

  const signOut = () => {
    sound.playClick();
    run(async () => {
      const identity = await import("@netlify/identity");
      await identity.logout();
      onSignedOut();
    });
  };

  return (
    <section className="glass-panel p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center">
          <KeyRound size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold font-heading text-white">Account</h2>
          <p className="text-xs text-slate-400">Profile, notifications, and support.</p>
        </div>
      </div>

      {user && mode !== "recovery" && (
        <div className="mb-4 space-y-4">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10">
            <p className="text-sm text-white">Signed in as {user.email}</p>
            <button type="button" onClick={signOut} className="btn btn-secondary text-xs mt-3" disabled={busy}>
              Sign out
            </button>
          </div>
          <NotificationSettings />
          <SupportTicket />
          <p className="text-xs text-slate-400">
            <a className="text-sky-300" href="/privacy/">Privacy policy</a>
            {" · "}
            <a className="text-sky-300" href="/support/">Support</a>
          </p>
          <DeleteAccount onDeleted={onSignedOut} />
          {staff && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary text-xs" onClick={onOpenSupport}>Support tools</button>
              {staff === "admin" && (
                <button type="button" className="btn btn-secondary text-xs" onClick={onOpenMerchants}>Platform merchants</button>
              )}
              {staff === "admin" && onOpenAffiliate && (
                <button type="button" className="btn btn-secondary text-xs" onClick={onOpenAffiliate}>Affiliate tags</button>
              )}
            </div>
          )}
        </div>
      )}

      {(!user || mode === "recovery") && (
      <>
      <p className="text-sm text-slate-200 mb-3">Support is on this page after you sign in.</p>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <label className="block text-xs text-slate-300">
            Name
            <input className="glass-input w-full mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        {mode !== "recovery" && (
          <label className="block text-xs text-slate-300">
            Email
            <input
              className="glass-input w-full mt-1"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label className="block text-xs text-slate-300">
            {mode === "recovery" ? "New password" : "Password"}
            <input
              className="glass-input w-full mt-1"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        )}
        {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
        {message && <p className="text-sm text-emerald-300">{message}</p>}
        <button type="submit" className="btn btn-gold text-sm" disabled={busy}>
          {mode === "signup" ? <UserPlus size={14} /> : <LogIn size={14} />}
          {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "recovery" ? "Save password" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {mode !== "login" && (
          <button type="button" className="text-sky-300" onClick={() => setMode("login")}>Sign in</button>
        )}
        {mode !== "signup" && (
          <button type="button" className="text-sky-300" onClick={() => setMode("signup")}>Create account</button>
        )}
        {mode !== "forgot" && mode !== "recovery" && (
          <button type="button" className="text-slate-400" onClick={() => setMode("forgot")}>Forgot password</button>
        )}
        <button type="button" className="text-slate-400" onClick={onBack}>{backLabel}</button>
      </div>
      </>
      )}
      {user && mode !== "recovery" && (
        <button type="button" className="text-xs text-slate-400 mt-4" onClick={onBack}>{backLabel}</button>
      )}
    </section>
  );
}

function DeleteAccount({ onDeleted }) {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const remove = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/account/delete", { method: "POST", json: { confirm: "delete" } });
      const identity = await import("@netlify/identity");
      const current = identity.currentUser();
      const token = current?.token?.access_token;
      if (token) {
        await fetch("/.netlify/identity/user", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      }
      clearPrivateRevealNotes();
      await identity.logout();
      onDeleted();
    } catch (err) {
      setError(err.message || "The account could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="text-xs text-rose-300" onClick={() => setOpen(true)}>
        Delete account
      </button>
    );
  }

  return (
    <form className="space-y-2 border border-rose-500/30 rounded-xl p-3" onSubmit={remove}>
      <h3 className="text-sm font-semibold text-white">Delete account</h3>
      <p className="text-xs text-slate-300">
        This removes exchanges you organize, your wish lists, and your notification settings. Your name, email, phone, and wishes are cleared from exchanges you joined. Type DELETE to confirm.
      </p>
      <input className="glass-input w-full" aria-label="Type DELETE to confirm" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      <button className="btn btn-secondary text-xs" type="submit" disabled={busy || phrase !== "DELETE"}>Delete my account and data</button>
    </form>
  );
}

function SupportTicket() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        api("/api/tickets", { method: "POST", json: { subject, body: message } })
          .then(() => {
            setSubject("");
            setMessage("");
            setNotice("Support ticket saved.");
          })
          .catch((err) => setError(err.message));
      }}
    >
      <h3 className="text-sm font-semibold text-white">Support</h3>
      <input className="glass-input w-full" aria-label="Ticket subject" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
      <textarea className="glass-input w-full min-h-20" aria-label="Ticket message" placeholder="What happened?" value={message} onChange={(e) => setMessage(e.target.value)} required />
      <button className="btn btn-secondary text-xs" type="submit">Send to support</button>
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      {notice && <p className="text-sm text-emerald-300">{notice}</p>}
    </form>
  );
}
