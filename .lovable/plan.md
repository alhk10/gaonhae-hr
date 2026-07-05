## Goal
Give you a **working, installable `SmsBridge-debug.apk`** without needing Android Studio on your computer — GitHub builds it for you on every push, and you download the APK from the Actions tab.

## Why this route
The Lovable sandbox can't run the Android SDK / Gradle build (needs ~10 GB tooling + a long build). GitHub Actions has a free Android build environment pre-installed and will hand you the APK as a downloadable artifact within ~5 minutes.

## What I'll add

### 1. `.github/workflows/android.yml`
Workflow that runs on every push touching `android/**` (and via manual "Run workflow"):
- Checks out the repo
- Installs JDK 17 + Android SDK
- Runs `./gradlew :app:assembleDebug` inside `android/`
- Uploads `android/app/build/outputs/apk/debug/app-debug.apk` as an artifact named `SmsBridge-debug-apk`

### 2. Gradle wrapper files (required for CI, currently missing)
- `android/gradlew` (unix launcher, executable)
- `android/gradlew.bat` (Windows launcher)
- `android/gradle/wrapper/gradle-wrapper.jar`
- `android/gradle/wrapper/gradle-wrapper.properties` (pins Gradle 8.7)

### 3. `android/BUILD_APK.md` — step-by-step user guide
Two paths:

**A. GitHub Actions (recommended, no local tools):**
1. Click **GitHub → Export project** in Lovable (top-right).
2. On GitHub, open the repo → **Actions** tab → enable workflows if prompted.
3. Pick **Build Android APK** → **Run workflow** → wait ~5 min.
4. Open the finished run → **Artifacts** → download `SmsBridge-debug-apk.zip`.
5. Unzip → transfer `app-debug.apk` to your phone (email, Drive, USB).
6. On the phone: tap the APK → allow "Install unknown apps" for your file manager → Install.
7. Open **SMS Bridge**, tap **Scan QR to pair**, point at the QR from the webapp, then **Save & Start**.
8. Grant SMS + Notifications + Camera permissions. Turn OFF battery optimisation for SMS Bridge.

**B. Local build with Android Studio (fallback):**
1. Install Android Studio (Hedgehog+).
2. Open the `android/` folder → let Gradle sync.
3. Plug in phone (USB debugging on) → press ▶ Run, or **Build → Build APK**.
4. Install the APK from `android/app/build/outputs/apk/debug/`.

## What you get
- APK is **debug-signed** — installs and works, just can't be published to Play (and we're sideload-only anyway because of SMS permissions).
- Same source you already have — QR pairing, 3s delay, foreground sync service — nothing behavioural changes.

## Files touched
- `.github/workflows/android.yml` (new)
- `android/gradlew` (new, executable)
- `android/gradlew.bat` (new)
- `android/gradle/wrapper/gradle-wrapper.jar` (new, binary via lovable-assets)
- `android/gradle/wrapper/gradle-wrapper.properties` (new)
- `android/BUILD_APK.md` (new)

No webapp, database, or edge-function changes.
