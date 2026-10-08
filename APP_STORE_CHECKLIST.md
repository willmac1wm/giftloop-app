# App Store checklist

Secret Gifter is not submitted. This is the path on a Mac with Xcode and the Apple Developer account Will already has. Do not put the reviewer password, Resend keys, Twilio keys, or `NETLIFY_DB_URL` in git or in this file.

The public pages for the listing are:

- Privacy: `https://thesecretgifter.com/privacy/`
- Support: `https://thesecretgifter.com/support/`

TheSecretGifter.com is not connected yet. Until DNS points at this project, those same pages are on the current preview site, `giftloop-preview-423`.

The operator on those pages is Essential Trade Contractors LLC, 130 County Road, Dennis, NJ 08210. The support email is essentialtradecontractors@gmail.com.

## 1. Reviewer account

1. In the Netlify UI for `giftloop-preview-423`, open Identity and create a user with an email Will controls. Confirm the user. Leave the role as member. Do not use a social provider.
2. In Terminal, from this repo, set the password only in the environment and run:

```bash
export REVIEWER_EMAIL="the confirmed address"
export REVIEWER_PASSWORD="the password Will will paste into App Store Connect"
export NETLIFY_DB_URL="the connection string from the Netlify database UI"
node scripts/seed-reviewer.mjs
```

3. The script writes one exchange named Reviewer Christmas. It does not print the password.
4. Sign in on a phone build with that same email and password. Manage exchange should show Reviewer Christmas, with Jordan invited and Maya already joined and with a wish list.

## 2. Open the iOS project

```bash
npm install
npm run build
npx cap sync ios
open ios/App/App.xcodeproj
```

Open `ios/App/App.xcodeproj`. Capacitor 8 added the iOS plugins through Swift Package Manager (`ios/App/CapApp-SPM/Package.swift`), so this project has no CocoaPods workspace. The bundle id is `com.thesecretgifter.app`. The display name is Secret Gifter. The version is `1.0.0` and the build number is `1` until Will raises them for a later upload.

## 3. Signing

1. Select the App target, Signing & Capabilities.
2. Check Automatically manage signing.
3. Choose Will's team.
4. If the bundle id is already taken, change it in Xcode and in `capacitor.config.json` together, then run `npx cap sync ios` again.
5. Add the Push Notifications capability only if a later build sends remote pushes. This build uses local notifications, which do not need that capability.

## 4. Archive and TestFlight

1. Choose Any iOS Device (arm64) as the run destination.
2. Product → Archive.
3. In the Organizer, Distribute App → App Store Connect → Upload.
4. Wait until the build appears under TestFlight. Answer the encryption question: the app only uses HTTPS, so it is exempt (`ITSAppUsesNonExemptEncryption` is false).
5. Install that TestFlight build on an iPhone. Sign in as the reviewer. Draw is already not required for the sample. Open the gift date actions and allow the calendar share and the local reminder. Open a store link and confirm it leaves the app in Safari. Delete a throwaway account, not the reviewer account, and confirm the data is gone.

## 5. App Store Connect fields

Use the draft in the review notes Will keeps with the screenshots. Suggested starting text:

- Name: Secret Gifter: Gift Exchange
- Subtitle: Secret Santa wish lists
- Keywords: secret santa,christmas,wishlist,white elephant,holiday,draw names,family
- Category: Lifestyle
- Age rating: 12+ because people can type their own wish lists and notes. There is no unrestricted browser, no in-app purchase, and no third-party sign-in.
- Privacy policy URL: the `/privacy/` address above.
- Support URL: the `/support/` address above.

Review notes should include the reviewer email and password, and this sentence: sign-in is email and password only; store links open in Safari and are not purchases inside the app.

Screenshots: 6.7-inch (1290×2796) and 6.5-inch (1284×2778) for create, invite, the participant wish list, and the reveal. The files from the last agent run are a starting set, taken in a phone-width browser, not on a device. Replace them with captures from the TestFlight build before submission if Apple asks for device shots.

## 6. Privacy nutrition label

Answer from what the app actually stores:

| Data | Collected | Linked to the user | Used for | Tracking |
| --- | --- | --- | --- | --- |
| Name | Yes | Yes | App functionality | No |
| Email address | Yes | Yes | App functionality | No |
| Phone number | Yes, when someone adds one or opts in to texts | Yes | App functionality | No |
| User content (wish lists, likes, dislikes, notes) | Yes | Yes | App functionality | No |
| Product interaction | No extra analytics product is installed |  |  | No |

The app does not track users across other companies' apps. Affiliate links are ordinary outbound retailer links, not an advertising SDK.

## 7. Info.plist and privacy manifest

`ios/App/App/Info.plist` has calendar usage strings because Add date to calendar shares an event file. Local notifications ask at the moment the person taps Remind me on this phone. There is no camera, photo library, microphone, or location key, because the app does not use those.

`ios/App/App/PrivacyInfo.xcprivacy` declares UserDefaults, file timestamps, and disk space with the reasons Capacitor uses (CA92.1, C617.1, E174.1). `NSPrivacyTracking` is false.

## 8. Publish the site once

Draft deploys do not replace the public site. When this batch is ready, one `npx netlify deploy --build --prod` against site `f860821f-ec0f-46f7-85e3-384f68a9fd51` publishes it. That is also what switches the live reminder job from every 15 minutes to hourly. Do not publish on every commit. See `AGENTS.md`.
