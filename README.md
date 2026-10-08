# Secret Gifter

Secret Gifter is a Secret Santa app. An organizer can draw names on this device with no account. A second path, still being connected, stores an exchange in Netlify Database for people who sign in.

Guest reveal links are encoded in the URL. Anyone who receives the link can open it. That is not encryption, and it is not limited to the intended person. A saved exchange uses a different link, `?view=assignment&exchange=`, which asks the signed-in participant and does not put the recipient’s name in the URL. The isolated preview site below has Identity and the database turned on. Netlify sends the account-confirmation email. Secret Gifter’s own invitation and reminder email still needs Resend.

Paid plans are separate from permissions and are not part of this app yet.

## What works today

These run in the browser with `npm run dev`. They do not need a database.

- Secret Santa setup on this device: names, paste-in import, wish lists, exclusions, occasion, date, budget, and the draw. Data is saved in `localStorage` under `giftloop_secretsanta_v2`.
- The draw is `src/utils/shuffle.js`. Nobody is paired with themselves, exclusions are directional, and the default is one giving circle. Two people who exclude each other cannot be drawn.
- After the draw, each person gets a reveal link. **Email link** and **Text link** open the organizer’s own mail and messages apps. Copy, QR, print, WhatsApp, and the device share sheet are there too. Secret Gifter does not send those messages.
- The reveal page reads `?view=reveal&t=`. The token contains the giver, the receiver, and the wish list.
- Shopping uses Secret Gifter referral codes: Amazon, Walmart, Target, Bass Pro Shops, Cabela's, and Best Buy. **Affiliate tags** are an administrator control. They accept a code or a full affiliate link and store it on this device. Members do not see that control. Shopping actions say when a link may include a referral code. The deal banner, shopping-center doors, and gift finder use those codes.
- The phone browser can use the site. `index.html` has a web manifest and Apple web-app tags. An iOS Capacitor project is in `ios/`. It has not been archived or submitted. `APP_STORE_CHECKLIST.md` is the Mac path for that.

## Partially connected

These files exist. They do not finish the job in local Vite, because Netlify Identity and Netlify Database run on a Netlify deploy, not inside `npm run dev`.

- **Sign in** (`src/components/AccountScreen.jsx`) calls `@netlify/identity`. Until Identity is enabled for the site, sign-in cannot complete. New accounts are tagged `member` in `netlify/functions/identity-signup.js`. An invitation or assignment link stays in place while the person signs in, then returns them to that page. Identity signup does not create support or administrator accounts. A co-organizer flag can be stored on one exchange; the organizer screen does not offer that control yet.
- **Manage exchange** is the organizer dashboard for a saved exchange: who is invited, accepted, or declined, whether wishes exist, whether the draw is ready, exclusions, and whether a notice was sent. Co-organizers can be invited onto that exchange. The dashboard does not list recipients. Cancelling a draw requires an explicit redraw. The server draw uses the same pairing rules as the device draw, including exclusions, and a second tap does not create a second set of pairs.
- **Private invitations** use `?view=invite&code=`. Accepting requires the confirmed account whose email matches the invitation. The page does not contain an assignment. **Open join** uses `?view=join&code=`. Anyone with that link can ask to join, and the page says so. The organizer still chooses who is drawn.
- **Account assignments** use `?view=assignment&exchange=`. The page asks the matching signed-in member for their recipient. The link itself does not include the name. Older guest links that already contain a name stay readable by anyone who has them.
- **Wish lists** can be saved on the member account, shared with an exchange, and reserved by the giver. The owner’s list does not show who reserved an item. Opening a shop link does not mark it purchased.
- **Email and text** still need Resend and Twilio environment variables on a Netlify deploy. A provider accepting a message is stored as accepted, not delivered. Signed Twilio and Resend callbacks can mark it delivered or failed. Those callbacks have been checked locally with test signatures, not with live provider traffic. Texts go only to someone who opted in, and STOP cancels later texts. Reminders are rows in the database and a scheduled function sends due rows. Quiet hours (9pm–8am in the exchange timezone) leave the notice queued until morning. Cancellation and opt-out cancel pending rows. This has not been tried with live provider credentials or a real phone.
- **Wish-list messages** are Secret Gifter links (`?view=assignment&exchange=`), not product URLs. The Shop button asks the server for that retailer’s link when the giver taps it. Sample tags in the repo are not proof of an approved affiliate account.
- **Shopping links** pasted onto a wish are checked before they are stored: web links only, known retailer domains, short links left unresolved, and private network addresses rejected. Retailers with a tag in code get that tag on the shop link. Other stores keep the ordinary link. An administrator screen can store merchant rules; those rules have not been verified with a live affiliate program.
- Database tables cover exchanges, members, assignments, deliveries, exclusions, wish lists, wish items, reservations, notification preferences, reminders, tickets, and merchants (`db/schema.js`). Migrations are the folders under `netlify/database/migrations/`. Netlify applies them on deploy. `npm run db:migrate` is only for a local Netlify database. `npm run test:integration` runs the API against a local Postgres database and does not call Resend or Twilio.

No concrete limit in this app requires replacing Netlify Database, Netlify Identity, Netlify Functions, Resend, or Twilio. Supabase and Inngest were a suggestion. They are not the stack, and this repo does not install them.

## Notification timing

Account → Notifications → **Reminder timing & quiet hours** lets each member choose a gift-date reminder 1, 3, 7, or 14 days ahead, a preferred local time, an IANA time zone, and quiet-hour start/end times. Defaults are seven days ahead at 09:00 with 21:00–08:00 quiet hours. Timing does not enroll anyone in SMS or turn off opt-outs. Gift-date reminders still require the organizer to queue them; saving preferences alone does not schedule new messages.

Changes reschedule pending gift-date jobs. The worker checks current preferences before sending, delays messages during personal quiet hours, and cancels gift-date reminders after the event date. Explicit next-exchange planning dates are preserved, with quick choices for one month, six months, or six weeks before next year’s gift date. A missed preferred time can deliver on the next eligible run while the gift date has not passed. The scheduled function runs once an hour. It does not open the database when no reminder is due. Delivery is not exact to the minute. Identity sign-in emails are outside these exchange-message preferences.

Deploy migration `20261008002502_notification_timing` before using the settings. `npm run test:notification-timing` covers local dates, fractional time zones, daylight-saving gaps/folds, quiet hours, preferences, opt-outs, and planning presets. Live provider and iPhone checks remain pending.

## Returning groups and gift preferences

Implemented on this branch; deployment and live account/iPhone checks are still required:

- Home offers **Start another group** after a signed-in member has joined an exchange. The new saved exchange includes only the organizer. The member can explicitly reuse their own list after reviewing its contents. No guests, invitations, exclusions, assignments, or notification consent are copied.
- **Your groups & traditions** is a collapsed Home section. Accepted members can see that exchange’s theme, written rules, memories, and approved photo. Only the organizer can edit or clear them. One compressed raster photo (up to 450,000 data-URL characters) is stored with the private record; there is no public photo feed or remote image import.
- **Plan our next exchange** reuses the title, occasion, budget, theme, and written rules after review. The date is selected afresh. Photos and memories stay with the original exchange, and invitations must be sent again. These are new exchanges linked conceptually through their saved traditions, not an automatically re-enrolled membership group.
- An organizer can schedule, replace, or cancel one email planning reminder per exchange. It goes only to that organizer and uses the existing reminder queue, email preference, and quiet hours. Email provider setup and a published scheduled function are required; a saved reminder is not proof of delivery.
- **My gift vibe** is an expandable section of My wish list: interests, things to avoid, secondhand/homemade/experience preferences, and “Choose from my list,” “Use my list for inspiration,” or “Surprise me.” The account owner can edit or clear it. It is returned on the existing authorized recipient page, not in organizer or staff payloads. This stores explicit preferences; it does not infer interests or change affiliate ranking.

The migration `20261007235032_group_retention` adds the preferences and traditions tables. Run `npm run test:retention` for local PGlite integration coverage of all migrations, account/group authorization, copying boundaries, wish-list ownership/review, photo approval, reminder replacement/cancellation, and clearing data. This does not substitute for Netlify Identity, live email delivery, concurrent hosted Postgres sessions, or real iPhone testing. No live-party synchronization was added.

## White Elephant

White Elephant is on this branch again (`src/components/WhiteElephantTab.jsx`) and opens from the menu. It stays on this device, like the no-account draw. Merging the earlier Secret Santa commits by themselves would have deleted that file; this branch puts it back.

## Roadmap

Permissions below are not subscription tiers. Free use is the current product. Paid tiers can wait.

| Role | Target access | In this branch |
| --- | --- | --- |
| Visitor | Public pages and an invitation | The site is public. A private invite accepts or declines and does not show an assignment. An open join link says anyone with it can ask to join. |
| Member | Account, wish lists they own, their own assignment, notification choices | Sign-in, a wish-list page, notification settings, and an assignment page that returns only that member’s recipient |
| Organizer | One exchange: invites, exclusions, draw | Device wizard, plus Manage exchange for a saved exchange. The screen does not list recipients. |
| Co-organizer | Help manage one exchange | The API can store the role. The organizer screen does not grant it yet. |
| Support staff | Tickets, account help, and failed email or text, without opening assignments | API and a Support screen exist. They return 404 for an ordinary member. They have not been tried against live Identity roles. |
| Administrator | Merchants, affiliate setup, and who has staff access | A merchant screen exists for an Identity `admin` role. Staff access is still granted in the Netlify Identity UI. Signup cannot grant it. Sample affiliate tags are not a verified program. |

Next implementation work, in order:

1. Prove a saved exchange on a Netlify deploy with Identity enabled: several accounts, one failed invitation, one impossible exclusion, one ordinary retailer link, and one phone that has not opted in.
2. Prove the reminder queue on a Netlify deploy: quiet hours, opt-out, and a real provider callback. The queue must not draw names again.
3. Prove support and merchant admin with Identity roles on that deploy. Keep those separate from Manage exchange, and keep assignments out of the support view.
4. After the shared web exchange passes on desktop and a real iPhone, package it with Capacitor. Packaging is not an App Store release.

## Preview site

The isolated preview is [giftloop-preview-423](https://giftloop-preview-423.netlify.app). It is a separate Netlify project from any future production site. Its production branch is `cursor/shared-exchange-service-234a`, and that is the only allowed branch. Pushes to `main` are not published there.

Another developer can work on it like this:

```bash
git clone https://github.com/willmac1wm/giftloop-app.git
cd giftloop-app
git checkout cursor/shared-exchange-service-234a
npm install
npx netlify link --id f860821f-ec0f-46f7-85e3-384f68a9fd51
npx netlify deploy --build
```

`npx netlify deploy --build` uploads a draft preview. Use that while iterating. `npx netlify deploy --build --prod` publishes the public URL and spends production credits, so publish once when a batch is ready, not on every change. Do not point these commands at a different site. Local `npm run dev` still does not run Identity or the database. `AGENTS.md` is the note other agents should follow.

Git-based builds are configured for that one branch. They currently fail while preparing the repo (`Host key verification failed`) because this project has no GitHub deploy key and the Netlify GitHub app is not installed on `willmac1wm/giftloop-app`. Installing the Netlify GitHub app on that repository, with access to this branch, is what makes a push deploy by itself. Until then, use the CLI deploy above.

Set Resend and Twilio only in the Netlify UI for this project, as secrets, for the functions runtime. The names are in `.env.example`. Leave the example values empty. Do not commit a `.env` file.

`NETLIFY_DB_URL` is also set there, as a secret. The Netlify database API for this project returns the `netlifydb_readonly` connection string. Migration `20261007235000_app_role_grants` grants that role the writes the exchange needs. Do not paste the connection string into git or chat.

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
