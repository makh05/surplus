# Surplus

A personal weight-gain app: 3,000 kcal days built around a night-shift and class schedule, a Tue/Thu/Sat gym plan with kg per set and animated how-tos, and progress tracking from 50 to 65 kg.

## Install on iPhone

1. Open **https://makh05.github.io/surplus/** in **Safari** (not Chrome).
2. Tap the **Share** button (square with an arrow), then **Add to Home Screen**, then **Add**.
3. Open **Surplus** from the Home Screen. It runs full screen like a normal app and works offline after the first open.

## Where the data lives

Everything you log is stored **only on that iPhone**, inside the Home Screen app. Nothing is sent anywhere.

- Use **Progress → Backup → Save backup** every week or two and keep the file in Files or iCloud Drive.
- Deleting the Home Screen app also deletes its data, so save a backup first. **Restore backup** brings it back.

## Files

- `index.html` – the whole app (one file)
- `manifest.webmanifest`, `sw.js` – Home Screen install and offline support
- `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` – the app icon
- `build.ps1` – rebuilds `index.html` and the icons from the source page
