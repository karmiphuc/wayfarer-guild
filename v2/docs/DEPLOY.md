# Deploy

GitHub Pages serves the `main` branch root of `karmiphuc/wayfarer-guild`. **Current state (2026-09-27): Mode B** —
GitHub has the bundle (`v2/game.js`) + assets + docs; the modular source is only in the owner's local clone. v1 lives at the repo root, v2 in `v2/`:
**https://karmiphuc.github.io/wayfarer-guild/v2/** (Pages updates ~1 minute after a commit to `main`).

Always run `node v2/tests/check.mjs` (and `--full` for balance changes) before deploying.

## Mode A — git (preferred when allowed)

The ES modules run as-is on Pages; no bundle needed.
```
git checkout -b feature/<name>      # work on a branch
node v2/tests/check.mjs
git commit -am "feat(v2): ..."      # conventional commits
git push -u origin feature/<name>   # open a PR, merge to main after review
```
Ship `v2/index.html, v2/css/, v2/js/, v2/assets/` (the atlas, audio, UI files and licenses are what the page loads;
extra source PNGs in `assets/` are harmless).

## Mode B — paste-only / web upload (no git on the machine)

This is how v2 was first deployed (the owner's work machine may not push code).
1. `python3 v2/tools/bundle.py` → `dist/v2/` contains exactly what the live game needs:
   `index.html` (loads `game.js`), `css/style.css`, `game.js` (all modules bundled), and `assets/` (49 files: atlas, audio,
   UI images, licenses).
2. Upload through the GitHub web UI. The file picker cannot keep folder paths, so upload **one folder per commit** by opening
   `https://github.com/karmiphuc/wayfarer-guild/upload/main/v2/<folder>` and choosing that folder's files:
   `assets/atlas` → `assets/audio/music` → `assets/audio/sfx` → `assets` (license txt files) → `assets/items` →
   `assets/ui/ThemeWood` → `assets/ui` (font) → `assets/ui/emote` → `assets/chars` → `css` → **last** `v2` (`index.html`, `game.js`).
   Code goes last so the live page never references assets that aren't there yet.
3. For a code-only change you only re-upload `v2/game.js` (and `index.html`/`style.css` if they changed).
   After adding sprites also re-upload `v2/assets/atlas/*`.

### Automating Mode B with a browser agent (what worked)

With the owner's logged-in Chrome (Claude in Chrome tools): for each folder →
`navigate` to the upload URL → `find` "file input type=file" → `file_upload` with the absolute paths (≤ 10 MB per call) →
run JS in the page: wait until the text "Uploading N of M" disappears, set `input[name="message"]` to a conventional
commit message, click the button whose text is "Commit changes" → wait ~5 s → next folder.
Verify at the end by opening the Pages URL headless and asserting no HTTP ≥ 400 responses and no page errors.

## Verify the live site

- Open https://karmiphuc.github.io/wayfarer-guild/v2/?new — the title card shows a Start button, the village renders.
- DevTools → Network: no 404s. Console: no red errors.
- If a sprite is invisible: the atlas on GitHub is older than the code → re-upload `v2/assets/atlas/*`.

## Private preview link (optional)

A private Claude Artifact of an earlier version exists (https://claude.ai/artifact/U5acZLLHj3eQVWvsAAyKiH). Artifacts allow
at most 255 files and no `confirm()`/downloads; use the `dist/v2` bundle contents if you republish. Only republish if the
owner asks (it uploads the code to claude.ai).
