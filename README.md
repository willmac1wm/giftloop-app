# GiftLoop

GiftLoop is a Secret Santa app. An organizer can draw names on this device with no account. A second path, still being connected, stores an exchange in Netlify Database for people who sign in.

Guest reveal links are encoded in the URL. Anyone who receives the link can open it. That is not encryption, and it is not limited to the intended person. A saved exchange uses a different link, `?view=assignment&exchange=`, which asks the signed-in participant and does not put the recipient’s name in the URL. That page still needs a Netlify deploy with Identity and the database turned on before it can be tried with real accounts.

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

- **Sign in** (`src/components/AccountScreen.jsx`) calls `@netlify/identity`. Until Identity is enabled for the site, sign-in cannot complete. New accounts are tagged `member` in `netlify/functions/identity-signup.js`. An invitation or assignment link stays in place while the person signs in, then returns them to that page. Identity signup does not create support or administrator accounts. A co-organizer flag can be stored on one exchange; the organizer screen does not offer that control yet.
- **Admin** is the organizer dashboard for a saved exchange: who is invited, accepted, or declined, whether wishes exist, whether the draw is ready, exclusions, and whether a notice was sent. Co-organizers can be invited onto that exchange. The dashboard does not list recipients. Cancelling a draw requires an explicit redraw. The server draw uses the same pairing rules as the device draw, including exclusions, and a second tap does not create a second set of pairs.
- **Invitations** use `?view=invite&code=`. That page can accept or decline membership. It does not contain an assignment.
- **Account assignments** use `?view=assignment&exchange=`. The page asks the matching signed-in member for their recipient. The link itself does not include the name. Older guest links that already contain a name stay readable by anyone who has them.
- **Wish lists** can be saved on the member account, shared with an exchange, and reserved by the giver. The owner’s list does not show who reserved an item. Opening a shop link does not mark it purchased.
- **Email and text** still need Resend and Twilio environment variables. A provider accepting a message is stored as accepted, not delivered. Twilio status updates can mark it delivered or failed. Texts go only to someone who opted in, and STOP cancels later texts. Reminders are rows in the database and a scheduled function sends due rows. Quiet hours are not built. This has not been tried with live provider credentials.
- **Shopping links** pasted onto a wish are checked before they are stored: web links only, known retailer domains, short links left unresolved, and private network addresses rejected. Approved retailers get the default affiliate tag. Other stores keep the ordinary link. There is no separate administrator screen for merchant rules yet.
- Database tables cover exchanges, members, assignments, deliveries, exclusions, wish lists, wish items, reservations, and notification preferences (`db/schema.js`). Migrations are `netlify/database/migrations/20261007111631_accounts` and `netlify/database/migrations/20261007115544_shared_exchange`. Netlify applies them on deploy. `npm run db:migrate` is only for a local Netlify database.

No concrete limit in this app requires replacing Netlify Database, Netlify Identity, Netlify Functions, Resend, or Twilio. Supabase and Inngest were a suggestion. They are not the stack, and this repo does not install them.

## White Elephant

White Elephant is on this branch again (`src/components/WhiteElephantTab.jsx`) and opens from the header. It stays on this device, like the no-account quick draw. Merging the earlier Secret Santa commits by themselves would have deleted that file; this branch puts it back.

## Roadmap

Permissions below are not subscription tiers. Free use is the current product. Paid tiers can wait.

| Role | Target access | In this branch |
| --- | --- | --- |
| Visitor | Public pages and an invitation | The site is public. `?view=invite&code=` accepts or declines and does not show an assignment. |
| Member | Account, wish lists they own, their own assignment, notification choices | Sign-in, a wish-list page, notification settings, and an assignment page that returns only that member’s recipient |
| Organizer | One exchange: invites, exclusions, draw | Device wizard, plus the database Admin screen. The screen does not list recipients. |
| Co-organizer | Help manage one exchange | The API can store the role. The organizer screen does not grant it yet. |
| Support staff | Tickets, account help, and failed email or text, without opening assignments | Not built. Delivery rows are visible to the organizer. |
| Administrator | Merchants, affiliate setup, and who has staff access | Not built. Affiliate codes are per browser, and wish links use the sample tags until a merchant screen exists. |

Next implementation work, in order:

1. Prove a saved exchange on a Netlify deploy with Identity enabled: several accounts, one failed invitation, one impossible exclusion, one ordinary retailer link, and one phone that has not opted in.
2. Add a reminder queue that survives a deploy, stops after cancel or opt-out, and does not draw names again.
3. Add support tools and a merchant admin screen. Keep those separate from the organizer’s Admin screen, and keep assignments out of the support view.
4. Make the phone browser comfortable, then package it with Capacitor. Packaging is not an App Store release.

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
