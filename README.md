# A-DAX AI — All-in-One Super Creator

A mobile-friendly AI workspace with Dashboard, AI Chat, Story to Video storyboard, Image Studio, Voice Studio, Story Writer, Code Studio, Game Creator and locally saved projects.

## Files
- `index.html`, `styles.css`, `app.js`: frontend
- `server.js`: Node.js backend API
- `package.json`: Render start command
- `manifest.webmanifest`, `sw.js`: install/PWA support

## Important configuration
The frontend calls the existing Render API at `https://a-dax-ai.onrender.com`.

Set secrets only in Render Dashboard → your backend service → Environment:
- `OPENAI_API_KEY` — required for real AI chat and image generation (provider billing/limits may apply)
- `OPENAI_CHAT_MODEL` — optional; defaults to `gpt-4.1-mini`
- `IMAGE_MODEL` — optional; defaults to `gpt-image-1`
- `TTS_MODEL` — optional; defaults to `gpt-4o-mini-tts`
- `BRAVE_API_KEY` — optional; enables web search
- `ACCESS_TOKEN` — optional; if enabled, the frontend must also be configured to send the token before protected requests will work.

Never put API keys in `app.js`, HTML, or any public GitHub file.

## Deploy
### Backend on Render
Deploy this repository as a **Web Service** with Node runtime. Build command can be blank or `npm install`; start command is `npm start`. Add secrets through Render Environment settings. The server listens on `process.env.PORT`.

### Frontend on Netlify
Deploy the repository as a static site with publish directory set to the repository root and no build command. The current CORS allowlist in `server.js` includes `https://cool-axolotl-22b926.netlify.app`. If your Netlify URL changes, update `ALLOWED_ORIGINS` in `server.js` to include the exact new origin and redeploy the backend.

## Current feature notes
- AI Chat and Image Studio call the backend endpoints `/api/chat` and `/api/image`.
- Image generation requires a valid provider API key and access to the configured model; it may incur charges.
- Voice Studio currently uses the browser's speech synthesis. It does not call `/api/tts` yet.
- Story to Video creates a storyboard/prompt plan; it does not render video files.
- Story Writer, Code Studio and Game Creator currently create structured starter drafts, not full AI-generated content or playable builds.
- My Projects uses local browser storage and does not sync across devices.
- Search endpoint exists on the backend but requires `BRAVE_API_KEY` and is not yet exposed as a frontend tool.
