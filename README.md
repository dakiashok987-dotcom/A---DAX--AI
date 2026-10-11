# A-DAX AI — Story-to-Video starter

This project contains a mobile-friendly A-DAX AI web app and a small Node.js backend. The Story-to-Video workflow can create a scene-by-scene production plan, generate scene images, generate narration audio, and export an animated **WebM slideshow** from those images and narration.

> Important: the slideshow is made from still images with gentle camera movement. It is **not** the same as AI-generated moving video clips. Generating real moving clips and joining them would require a separate video-generation provider/API, which is not included in this starter project.

## Project files

```text
A-DAX-AI/
├── package.json
├── server.js
├── README.md
└── public/
    └── index.html
```

## How the Story-to-Video workflow works

1. Enter a story and choose duration, language, style, and aspect ratio.
2. Generate the scene plan. It includes continuity notes, scene-wise image/video prompts, and the complete voice-over script.
3. Generate all scene images, or generate individual scene images.
4. Generate the voice-over MP3.
5. Choose **Create slideshow video** to create a WebM video with gentle pan/zoom motion and narration audio. Keep the page open during export. Android Chrome is recommended; browser support can vary.
6. Download the JSON, text plan, scene images, MP3, and WebM output.

## Run locally

Requires Node.js 18 or newer. Open a terminal in this folder and run:

```bash
node server.js
```

Then open `http://localhost:3000`.

## Configure the AI services

The server reads API keys from environment variables. **Never put API keys in `public/index.html`, GitHub, or any file uploaded publicly.**

- `ANTHROPIC_API_KEY` enables story planning and AI chat outside the Claude app viewer.
- `OPENAI_API_KEY` enables scene image generation and downloadable voice-over MP3.
- `BRAVE_API_KEY` enables web search (optional).
- `ACCESS_TOKEN` is optional but recommended to protect the API endpoints. If set, enter the same token in A-DAX Settings.

Example for a local shell (use your real keys privately):

```bash
ANTHROPIC_API_KEY=your_key OPENAI_API_KEY=your_key ACCESS_TOKEN=your_private_token node server.js
```

On a hosting service, add each variable in the host's Environment Variables dashboard instead of placing keys in the code. Provider usage may cost money; check account billing and usage limits first.

## Deploy

Deploy this folder as a Node web service with:

- Build command: `npm install`
- Start command: `node server.js`
- Node version: 18 or newer

The host must publish the project root containing `server.js`, `package.json`, and the `public` folder.

## Honest limitations

- Live image/audio API calls have not been tested with your private provider accounts.
- The image and text-to-speech services need configured provider credentials and may be billed by the provider.
- Video export uses browser recording and produces WebM; MP4 export is not guaranteed on mobile browsers.
- This project does not yet call a real text-to-video service to generate moving scene clips.
