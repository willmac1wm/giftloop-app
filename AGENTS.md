# Agent notes

## Deploys and credits

This project’s Netlify team is billed for production publishes and for database time.

- A production deploy (`npx netlify deploy --build --prod`, or restoring a deploy onto the public site URL) costs 15 credits. Do that once, when a batch is ready for the public URL.
- Draft deploys (`npx netlify deploy --build`, without `--prod`) and pull-request previews are the default. Do not publish every commit.
- The site to link is `giftloop-preview-423`, id `f860821f-ec0f-46f7-85e3-384f68a9fd51`. Do not create another site.
- Function time and database time cost credits per hour. Netlify Database sleeps after 5 idle minutes. Do not add a scheduled function that queries the database on a tight loop.
- The reminder worker runs once an hour. It reads a Blobs marker first and skips the database when no reminder is due. Keep that gate if you change the worker.
- Resend, Twilio, and `NETLIFY_DB_URL` are set in the Netlify UI. Never put those values in source, `.env.example`, chat, or GitHub.

## App Store

`APP_STORE_CHECKLIST.md` is the path Will runs on a Mac. The `ios/` project is the Capacitor app. Do not add Google, Facebook, or other social sign-in. Email through Netlify Identity is the only account provider. Store links open outside the app and are not purchases inside Secret Gifter.

## Product limits that are still true

Guest reveal links can be opened by anyone who has them. Account assignment links require the signed-in member. Sample affiliate codes are not an approved merchant account. Local `npm run dev` does not run Identity or the database.
