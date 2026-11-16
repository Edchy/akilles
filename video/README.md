# Humbell's onboarding video

About a minute, made in code with [Remotion](https://remotion.dev): real screens from the app in a phone frame, a finger showing each tap, hold and drag, a caption for every line, and a voice.

- `src/script.ts`: the scenes — what is said, which screens, where the finger goes. Change the words or timing here.
- `src/Onboarding.tsx`: how it looks.
- `public/shots/`: stills from the app (iPhone 17 Pro, 1206 × 2622).
- `public/voice/`: one file per scene, and `durations.json`, which sets each scene's length.

## Making it

```sh
npm install
npm run voice -- --voices          # list your ElevenLabs voices
npm run voice -- --voice=<id>      # narrate with one (or set HUMBELL_VOICE_ID)
npm run studio                     # watch and scrub it in the browser
npm run render                     # out/humbell-onboarding.mp4
```

The ElevenLabs key is read from `ELEVENLABS_API_KEY` or `video/.env` (`ELEVENLABS_API_KEY=…`), and is never stored in the project. With no key, `npm run voice:scratch` uses the Mac's own voice so the scenes can still be timed.

## New screens

When the app changes, the stills need retaking. They come from a separate simulator ("Humbell Video"), with saved states built from the real store and opened by deep link, so your own simulator and saved training are never touched.

`capture/` holds the tooling. It is run against a private copy of the app, never the app itself:
- `stage.cjs` builds the saved states;
- `shoot.sh` and `all.sh` take one still or all of them;
- `capture.ts` and `hooks.patch` open the sheets and menus that a deep link can't reach.

The patch was written against the app as it stood on 2026-11-15, when the workout editor was still a sheet. It needs redoing for the newer editor screen.
