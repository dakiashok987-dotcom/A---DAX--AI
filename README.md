# DAKX AI — Super Creator

A mobile-first static web app starter with a black, neon-blue and purple design.

## Included in this starter
- Responsive dashboard
- AI Chat draft panel (demo placeholder, not connected to a live AI model)
- Story-to-video scene outline generator
- Image prompt builder
- Browser text-to-speech playback (device/browser dependent)
- Story, code and game planning helpers
- Local project saving with browser localStorage
- Basic PWA manifest and service worker

## Run on an Android phone
1. Extract this ZIP using your phone's file manager.
2. Upload the extracted files to a new GitHub repository, or use a static hosting provider.
3. For Netlify: create a new site from the repository. Build command can be left empty; publish directory is `.`.
4. Open the published website in Chrome. Use the browser menu to choose **Add to Home screen** where available.

## Important: live AI features
The current version is a working UI and local prompt/draft starter, not a complete AI service. Real AI chat, image generation and video rendering require provider APIs and a backend. Do not put secret API keys in `app.js` or any browser file. A server-side API endpoint should hold keys and enforce limits.

## Android APK
A website can be wrapped as an Android app using a trusted WebView/Capacitor workflow, but APK creation/signing is a separate step. Test the deployed website first. This project does not include a compiled APK.

## Deploy on Netlify
- Repository root contains `index.html`.
- Build command: leave blank.
- Publish directory: `.`

## Project files
- `index.html` — interface and pages
- `styles.css` — responsive neon design
- `app.js` — navigation, local draft tools, speech, local saving
- `manifest.webmanifest` — PWA metadata
- `sw.js` — basic offline cache
