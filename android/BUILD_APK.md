# Build the SMS Bridge APK

You have two ways to get an installable `.apk` file for your phone. **Option A is easiest — no software to install on your computer.**

---

## Option A — Let GitHub build it for you (recommended)

Prerequisite: this Lovable project is connected to GitHub (in Lovable: **+ menu → GitHub → Connect project**).

1. Open your project's GitHub repo in a browser.
2. Click the **Actions** tab. If prompted, click **I understand my workflows, enable them**.
3. In the left sidebar pick **Build Android APK**.
4. On the right, click **Run workflow → Run workflow**. (It also runs automatically on any push that touches `android/`.)
5. Wait ~5 minutes for the green ✓.
6. Click the finished run → scroll to **Artifacts** → download **`SmsBridge-debug-apk`** (a zip).
7. Unzip it — inside is **`app-debug.apk`**.
8. Send that file to your phone (email attachment, Google Drive, USB cable, WhatsApp to yourself, etc.).

### Install on your phone

1. Tap the `app-debug.apk` file in your file manager.
2. Android will warn about unknown sources — tap **Settings → allow this source → Install**.
3. Open **SMS Bridge**.
4. In the Lovable webapp: **SMS Bridge → Devices → Register device**, fill label + delay, click **Register**. A QR code appears.
5. In the Android app tap **Scan QR to pair** → point camera at the QR. All fields auto-fill.
6. Tick **Enabled**, tap **Save & Start**.
7. Grant every permission it asks for: **SMS (send + receive), Camera, Notifications**.
8. Go to **Settings → Apps → SMS Bridge → Battery → Unrestricted** so Android doesn't kill it in the background.

Done. The persistent "SMS Bridge running" notification means it's alive.

---

## Option B — Build locally with Android Studio

Only needed if you don't want to use GitHub.

1. Install **Android Studio** (Hedgehog or newer) from https://developer.android.com/studio.
2. In Lovable, click **+ menu → GitHub → Connect project**, then clone your repo, or use **Download codebase** from the Code Editor.
3. In Android Studio: **File → Open** → pick the `android/` folder → wait for Gradle sync (first time takes 5–10 min while it downloads the SDK).
4. Plug your Android phone in with USB, enable **Developer options → USB debugging**.
5. Click the green ▶ **Run** button — it installs and launches on the phone. Or use **Build → Build Bundle(s) / APK(s) → Build APK(s)**; the file appears at `android/app/build/outputs/apk/debug/app-debug.apk`.
6. Pair via QR as in Option A steps 4–8.

---

## Troubleshooting

- **"App not installed" on phone** — you already have an older SMS Bridge installed with a different signature; uninstall it first.
- **Actions build fails on `Set up Android SDK`** — re-run the workflow; the SDK action occasionally times out on first fetch.
- **QR scan does nothing** — grant Camera permission in Android settings, then tap Scan again.
- **SMS never send** — check the phone has SIM + credit, SMS permission granted, and the app isn't battery-restricted.
- **Google Play install blocked** — expected. This app uses SMS permissions; Google Play forbids non-default-SMS-handlers with these permissions. Sideload only.
