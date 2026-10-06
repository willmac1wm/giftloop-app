# GiftLoop 🎁 — Secret Santa & White Elephant Hub

> A modern, privacy-first **Secret Santa** and **White Elephant** (Yankee Swap / Dirty Santa) web and iPhone application. Zero external email collection, provably fair backtracking shuffling with exclusions, client-side secret reveal links, scannable QR passes, and live turn-by-turn game master.

---

## 🌟 Key Features

### 🎁 1. Secret Santa Studio (Elfster & DrawNames Alternative)
- **Circular Hamiltonian Derangement Engine**: Guarantees a single continuous gift circle where no one draws themselves and all mutual/unidirectional exclusion rules are strictly satisfied.
- **Custom Exclusion Matrix**: Prevent spouses, roommates, or past-year pairs from drawing each other with 1 click.
- **Client-Side Secret Reveal Links**: Encrypted, URL-safe tokens (`?view=reveal&t=...`) that decrypt only the viewer's assigned match on their device.
- **Instant Sharing**: 1-click copy link, WhatsApp, SMS, and native iOS share sheet integration (`navigator.share`).
- **Scannable QR Codes**: Generate on-screen QR passes for in-person holiday parties so guests can scan their assignment directly with their phone camera.
- **Printable Blind Envelopes**: Pre-formatted printable sheet with fold-over lines for physical party envelopes.
- **3D Gift Box Unwrap Experience**: Recipients unwrap a 3D animated present with celebratory confetti, holiday chimes, recipient wishlists, and private notes.

### 🐘 2. White Elephant (Yankee Swap / Dirty Santa) Arena
- **Draft & Turn Order Randomizer**: Animated shuffle reel for player sequence (`#1` to `#N`).
- **Live Game Master**: Interactive turn engine showing whose turn it is and eligible moves.
- **Steal Mechanism & Frozen Rules**: Configurable max steals per gift (standard 3 steals before it becomes **FROZEN ❄️**).
- **Robbed Player Flow**: When a gift is stolen, the player is automatically prompted to unwrap a new gift or steal an unlocked gift.
- **Live Action Feed**: Real-time activity timeline logging every unwrap and steal.

### 📱 3. iPhone & Mobile First (PWA + Capacitor Native)
- **iOS Standalone App**: Configured with `apple-mobile-web-app-capable`, safe-area insets (`viewport-fit=cover`, Dynamic Island and Home Bar padding), and standalone web manifest.
- **Mobile Bottom Navigation**: Apple-style tab bar with haptic feedback for one-handed thumb navigation.
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
