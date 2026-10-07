# GiftLoop

GiftLoop is a Secret Santa app. An organizer can draw names on this device with no account. A second path, still being connected, stores an exchange in Netlify Database for people who sign in.

Guest reveal links are encoded in the URL. Anyone who receives the link can open it. That is not encryption, and it is not limited to the intended person. Assignments for signed-in members are supposed to open only for the participant who drew that name. That check is not built yet.

Paid plans are separate from permissions and are not part of this app yet.

## What works today

These run in the browser with `npm run dev`. They do not need a database.

- Secret Santa setup on this device: names, paste-in import, wish lists, exclusions, occasion, date, budget, and the draw. Data is saved in `localStorage` under `giftloop_secretsanta_v2`.
- The draw is `src/utils/shuffle.js`. Nobody is paired with themselves, exclusions are directional, and the default is one giving circle. Two people who exclude each other cannot be drawn.
- After the draw, each person gets a reveal link. **Email link** and **Text link** open the organizer’s own mail and messages apps. Copy, QR, print, WhatsApp, and the device share sheet are there too. Gift Loop does not send those messages.
- The reveal page reads `?view=reveal&t=`. The token contains the giver, the receiver, and the wish list.
- Shopping uses Gift Loop referral codes: Amazon, Walmart, Target, Bass Pro Shops, Cabela's, and Best Buy. **Affiliate Tags** accepts a code or a full affiliate link and stores it on this device. The deal banner, shopping-center doors, and gift finder use those codes.
- The phone browser can use the site. `index.html` has a web manifest and Apple web-app tags. That is not an App Store build.

## Partially connected

These files exist. They do not finish the job in local Vite, because Netlify Identity and Netlify Database run on a Netlify deploy, not inside `npm run dev`.

- **Sign in** (`src/components/AccountScreen.jsx`) calls `@netlify/identity`. Until Identity is enabled for the site, sign-in cannot complete. New accounts are tagged `member` in `netlify/functions/identity-signup.js`. There is no co-organizer, support, or administrator role yet.
- **Admin** (`src/components/AdminScreen.jsx`) is the organizer’s screen for exchanges stored in the database. The API is `netlify/functions/api.js`. A signed-in user can create an exchange, add people, draw, and ask the server to email or text links. The draw on the server does not take exclusions. The admin response does not include who was paired with whom.
- **My list** (`src/components/WishListScreen.jsx`) edits the wish-list fields on that person’s row in one exchange. It is not a wish list the member keeps and reuses across exchanges. If the draw has been saved, the signed-in giver can see the person they were assigned.
- **Email** is Resend, and **text** is Twilio, in `src/server/messages.js`. Sending stays off until `RESEND_API_KEY` and `EMAIL_FROM`, or `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`, are set in the Netlify environment. The server still puts the guest reveal link in the message, so anyone who receives it can open the assignment. There is no opt-in record, STOP handling, quiet hours, reminder schedule, or delivery webhook.
- Database tables are exchanges, members, assignments, and deliveries (`db/schema.js`). The migration is `netlify/database/migrations/20261007111631_accounts`. Netlify applies it on deploy. `npm run db:migrate` is only for a local Netlify database.

No concrete limit in this app requires replacing Netlify Database, Netlify Identity, Netlify Functions, Resend, or Twilio. Supabase and Inngest were a suggestion. They are not the stack, and this repo does not install them.

## White Elephant

`main` still has the White Elephant game (`src/components/WhiteElephantTab.jsx` on `origin/main`). This branch does not mount it. The files were removed in earlier Secret Santa work, not by this README. This change does not delete White Elephant.

## Roadmap

Permissions below are not subscription tiers. Free use is the current product. Paid tiers can wait.

| Role | Target access | In this branch |
| --- | --- | --- |
| Visitor | Public pages and an invitation | The site is public. There is no invitation page. |
| Member | Account, wish lists they own, their own assignment, notification choices | Sign-in UI and a per-exchange wish-list row |
| Organizer | One exchange: invites, exclusions, draw | Device wizard, plus the database Admin screen |
| Co-organizer | Help manage one exchange | Not built |
| Support staff | Tickets, account help, and failed email or text, without opening assignments | Not built. Delivery rows exist for organizers only. |
| Administrator | Merchants, affiliate setup, and who has staff access | Not built. Affiliate codes are per browser. |

Next implementation work, in order:

1. Keep the no-account draw. Keep saying that a guest reveal link opens for anyone who has it.
2. Finish the Netlify Identity and database path on a deploy: create an exchange, sign in as a member, save a wish list, draw with the same exclusion rules as the device draw.
3. When a signed-in member opens an assignment, require that account. Do not put the recipient’s name in that URL. Leave guest links on the no-account flow.
4. Store wish lists on the member, and let them attach one to an exchange.
5. Add co-organizer on a single exchange. Organizers and co-organizers still do not get the pairing list.
6. Send email and text only after the product rules exist: email from the app, SMS only with that person’s opt-in, and a record of success or failure. Do not start a new draw when a send is retried.
7. Support staff can see tickets and delivery failures, not assignments. Administrators can manage merchant and affiliate settings and staff access.
8. Reminders can be scheduled later with Netlify scheduled functions. Replace that only if a real limit shows up.

## Local development

Node.js 22 and npm. `netlify.toml` sets Node 22, which `@netlify/identity` expects.

```bash
git clone https://github.com/willmac1wm/giftloop-app.git
cd giftloop-app
npm install
npm run dev
```

Vite prints the local address, usually `http://localhost:5173`.

```bash
npm run build
npm run smoke
```

`npm run db:generate` writes a Drizzle migration. `npm run db:migrate` applies it locally through the Netlify CLI. Do not point that command at production.

Copy `.env.example` only as a list of names. Put real Resend and Twilio values in the Netlify environment. Do not commit them.

Capacitor config is `capacitor.config.json`, and the packages are installed. There is no `ios` or `android` project in the repo, and no store build has been verified.

## License

This repository has no `LICENSE` file.
