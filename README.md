# Discord Server Builder

A collection of Node.js scripts that build, theme, and maintain a complete Discord community
server ("Grillonia Prime") through the Discord REST API, plus Python scripts that procedurally
generate the server's artwork. Instead of clicking through Discord's settings by hand, the
whole server — roles, categories, channels, permission overrides, pinned guide embeds, emoji,
and icon — is defined in code and can be re-applied safely.

## Features

- **One-shot server build** (`build.mjs`) — creates roles, categories, text/voice channels,
  permission overwrites, and pinned welcome messages. REST-only (no gateway connection) and
  idempotent: anything that already exists by name is reused.
- **Rate-limit-aware REST helper** — retries on HTTP 429 using `retry_after` and on transient 5xx.
- **Theming passes** — scripted renames, topics, colors, and server description updates
  (`rename.mjs`, `polish.mjs`, `cleanup.mjs`, `apply_v2.mjs`, `meridian_pass.mjs`), with a
  matching undo script (`reverse_meridian_pass.mjs`).
- **Rich embeds and pins** — replaces orientation pins with styled embeds and attached banner
  art (`embeds.mjs`, `setup_redline_radio.mjs`, `setup_music_spotlight.mjs`, `setup_orgo.mjs`,
  `pin_*.mjs`), uploading images through multipart requests.
- **Assets** — uploads custom emoji idempotently (`upload_emoji.mjs`) and sets the guild icon
  (`set_icon.mjs`).
- **Inspection tools** — `dump.mjs` and `pins.mjs` print the live server structure and pins.
- **Procedural art (Python + Pillow)**
  - `generate_hero.py` — synthwave hero banners (gradient sky, sun, perspective grid, title).
  - `generate_icon.py` / `generate_icon_badass.py` — planet-from-orbit server icons.
  - `generate_emoji.py` — neon-glow 128x128 emoji built from grayscale masks with colored halos.
- **Movie-night bot** (`bot.mjs`) — `/movie <title>` and `/willis` slash commands that pull
  poster, synopsis, runtime, rating, and where-to-watch providers from the TMDB API.

Design documents: [`SETUP.md`](SETUP.md) (manual build plan),
[`CYBERPUNK_THEME.md`](CYBERPUNK_THEME.md), and
[`GRILLONIA_PRIME_DISCORD_BIBLE.md`](GRILLONIA_PRIME_DISCORD_BIBLE.md) (design bible).

## Tech stack

Node.js (ES modules), Discord REST API v10, discord.js v14 (bot + permission flags), dotenv,
Python 3 + Pillow, TMDB API.

## Setup

1. Create a Discord application + bot, invite it to your server with Administrator permission.
2. Install and configure:
   ```bash
   npm install
   cp .env.example .env      # DISCORD_TOKEN, GUILD_ID, and any IDs the script you run needs
   ```
3. Run a script, for example:
   ```bash
   npm run build:server      # build the full server layout
   npm run dump              # print current server structure
   node upload_emoji.mjs
   node bot.mjs              # movie-night bot (needs TMDB_API_KEY)
   ```
4. Regenerate artwork (optional):
   ```bash
   pip install pillow
   python generate_hero.py
   python generate_emoji.py
   python generate_icon.py
   ```

> Large video assets (`art/*.mp4`) used by some pin scripts are not included in the repository.
> The art scripts reference Windows system fonts (e.g. `C:/Windows/Fonts/impact.ttf`).

## License

© 2026 Mathew Vasilescu. All rights reserved. See [LICENSE](LICENSE).
