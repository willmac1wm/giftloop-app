# GiftLoop — Secret Santa

This app is Secret Santa only. Each gift type is its own app, with its own draw. Email and text sharing, and the affiliate shop, stay the same so a later gift type can replace the Secret Santa draw without rebuilding how links are sent or how guests shop.

The swap point is `src/games/secretSanta.js`. The draw itself is `src/utils/shuffle.js`. Sending links is `src/utils/revealLink.js`. Store referral tags are `src/utils/affiliate.js`.

---

## Key features

### Secret Santa
- One gift circle: nobody draws themselves, and exclusion rules are honored.
- Exclusions are a step of their own before the draw.
- Private reveal links stay on this device. Email and text open the organizer’s own mail and messages apps.
- After the name is unwrapped, shop that person through Gift Loop referral links.
- Christmas confetti on the draw and the unwrap: snowflakes, candy canes, and ornaments.

### iPhone and mobile (PWA + Capacitor)
- **iOS Standalone App**: Configured with `apple-mobile-web-app-capable`, safe-area insets (`viewport-fit=cover`, Dynamic Island and Home Bar padding), and standalone web manifest.
- **Native Share Sheet**: Direct integration with iOS AirDrop, Messages, and WhatsApp.
- **Capacitor Support**: Ready to compile into a native `.ipa` for Xcode, TestFlight, or the App Store.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm or yarn

### Installation & Local Run
```bash
# Clone the repository
git clone https://github.com/willmac1wm/giftloop-app.git
cd giftloop-app

# Install dependencies
npm install

# Start local dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📱 Running on iPhone

### Option A: Add to Home Screen (Instant PWA)
1. Open the hosted or local IP URL (`http://<your-local-ip>:5173`) in **Safari** on your iPhone.
2. Tap the **Share** button (box with upward arrow).
3. Tap **Add to Home Screen** and tap **Add**.
4. Launch GiftLoop from your home screen as a standalone full-screen app!

### Option B: Build Native iOS App (Capacitor & Xcode)
```bash
# 1. Build the production web bundle
npm run build

# 2. Add the iOS platform
npx cap add ios

# 3. Sync web assets into Xcode project
npx cap sync ios

# 4. Open in Xcode
npx cap open ios
```
From Xcode, select your iPhone or simulator and hit **Run** (Cmd + R).

---

## 🔒 Privacy & Security

- **No Email Harvesting**: Emails and phone numbers are completely optional.
- **Zero Database Tracking**: All pairings and event data are persisted safely in the browser's `localStorage` and encoded in URL hashes.
- **Encrypted Reveal Tokens**: Assignments are obfuscated and encoded directly into individual links so only the recipient can see who they drew.

---

## 📄 License
MIT License. Open source and free for holiday gatherings everywhere!
