# GiftLoop

GiftLoop is a Secret Santa platform for creating exchanges, inviting participants, drawing names privately, sharing wish lists, and receiving email and optional SMS updates. Members can shop wish-list items through supported retailer affiliate links.

Launch is Secret Santa, in English, for the US, as a mobile-friendly website. One account system, one messaging system, and one shopping system stay in this app so later gifting features can reuse them. Email is the account. Text is optional and requires the recipient’s own opt-in.

## Status

Labels below match this repository, not a future design.

### Implemented

- On-device Secret Santa: names, exclusions, a draw, and a wish list saved in the browser.
- Manual share: **Email link** and **Text link** open the organizer’s own mail and messages apps.
- Shopping: Amazon, Walmart, Target, Bass Pro Shops, Cabela's, and Best Buy search links, plus a gift finder. Affiliate codes are pasted in **Affiliate Tags** and stored on that device.
- Reveal page opened from `?view=reveal&t=`. The token is encoded assignment data. It is not encrypted, and anyone who has the link can open it.

### In progress

- Sign-in screen (Netlify Identity).
- Organizer **Admin**: create an exchange, add people, draw on the server, and send links through Resend or Twilio when those environment variables are set.
- **My list**: a signed-in member edits the wish list stored for their membership.
- Database tables for exchanges, members, assignments, and delivery attempts (`netlify/database/migrations`).

### Planned

- Move accounts and data to the target stack below. Do not run that stack beside the current Netlify database.
- Invitations with acceptance, join links, and exchange states (draft, accepting participants, ready to draw, drawn, completed, cancelled).
- Co-organizers, support agents, and administrators.
- Reveal only after sign-in. Stop putting the recipient’s name in the URL.
- Wish lists that belong to the member across exchanges, with reservations that hide the buyer from the list owner.
- Scheduled reminders, SMS opt-in, STOP/HELP, and quiet hours.
- Public pages (how it works, FAQ, privacy, terms, affiliate disclosure) and support tickets.
- Central merchant and affiliate administration.
- Paid plans, only after the free exchange is in use.

## Membership

Subscription plans are separate from permissions. The free tier is the launch plan: exchanges, wish lists, private draws, and standard email. Paid Plus and Business plans are not defined yet. SMS needs a spending cap before launch. Do not promise unlimited texting.

| Role | Permissions |
| --- | --- |
| Visitor | Public pages and an invitation landing page |
| Member | Join exchanges, manage wish lists, reveal their own recipient, set notification preferences |
| Organizer | Create and manage one exchange: invitations, exclusions, and the draw |
| Co-organizer | Help manage one exchange |
| Support agent | Tickets and delivery problems, without opening secret assignments |
| Administrator | Merchants, affiliate settings, accounts, and operational tools |

A member can organize one exchange and only participate in another. Organizer, co-organizer, and support access does not include everyone’s assignments.

These roles are the target. The app today has a signed-in organizer admin and a member wish list. Visitor, co-organizer, support agent, and administrator are not built.

## Technology

The interface is already React and Vite. It is JavaScript, not TypeScript yet. Confirm that before a rewrite. Capacitor config is in the repo for a later iOS or Android package. Store signing and submission are not done.

Target backend, from the product brief. None of this is installed yet:

| Part | Target | Purpose |
| --- | --- | --- |
| Database | Supabase PostgreSQL | Accounts, exchanges, wish lists, notifications |
| Login | Supabase Auth | Email login links or codes |
| Server | TypeScript functions | Draws, permissions, invitations, messaging |
| Files | Supabase Storage | Approved uploads only |
| Email | Resend | Invitations, login mail, reminders, support |
| Text | Twilio | Opted-in SMS, delivery, and opt-out events |
| Jobs | Inngest | Reminder schedules and retries |
| Hosting | Managed HTTPS | Separate development, test, and production |

What this branch actually runs:

| Part | In the repo now |
| --- | --- |
| Interface | React 19, Vite, Tailwind |
| Login screen | `@netlify/identity` |
| Database client | `@netlify/database` and Drizzle |
| Server | `netlify/functions` |
| Email | Resend, when `RESEND_API_KEY` and `EMAIL_FROM` are set |
| Text | Twilio, when `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` are set |
| Hosting config | `netlify.toml` (Node 22) |

Pick one database. The brief’s target is Supabase. The code on this branch uses Netlify Database. Switching is planned work, not a second store of the same exchanges.

## Draw and privacy

The on-device draw lives in `src/utils/shuffle.js`. The server draw for Admin uses that same function from `src/server/assignments.js`. Both require two or more people, skip self-matches, and prefer one giving circle. Exclusions are enforced on the device draw. The server draw does not take exclusions yet.

Still required before this is the launch draw:

- Save one complete draw, and ignore a second click instead of drawing again.
- Explain an impossible exclusion set before saving or sending.
- Keep retries of email or text from starting a new draw.
- After a draw, change the guest list only through an explicit cancel or redraw.
- Show an assignment only to the signed-in giver. A forwarded link must not reveal it.

## Local development

Requires Node.js 22 and npm.

```bash
git clone https://github.com/willmac1wm/giftloop-app.git
cd giftloop-app
npm install
npm run dev
```

Open the local address Vite prints, usually `http://localhost:5173`.

```bash
npm run build
npm run smoke
```

`npm run db:generate` writes a database migration. `npm run db:migrate` applies it to a local Netlify database only. Hosted migrations run on deploy. Real Resend, Twilio, and Identity values belong in the host’s environment, not in git. `.env.example` lists the names.

## Mobile

The site is meant to be used in a phone browser. A home-screen install uses the web manifest already in the repo. That is not an App Store build. Capacitor can package the site later, after the exchange flow is tested. Native signing and store review are separate work.

## License

This repository has no `LICENSE` file. Do not treat the project as MIT-licensed until one is added.
