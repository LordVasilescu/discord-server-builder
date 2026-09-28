# Discord Server — Bones

Work this top-to-bottom. Phases are ordered so you never have to backtrack.
Decorate (names, colors, emoji, vibe) wherever you see **TBD** or **[decorate]**.

---

## Phase 1 — Create the server + base settings

1. **Create Server** → "Create My Own" → "For me and my friends" → name **TBD**
2. **Server Settings → Overview**
   - Server region: Automatic
   - System messages channel: leave default for now (set to `#welcome` after Phase 3)
   - Uncheck: "Send a random welcome message…" (Carl-bot will handle this)
3. **Server Settings → Safety Setup**
   - Verification Level: **Medium**
   - Explicit content filter: **Scan from members without a role**
   - Default notifications: **Only @mentions**
4. **Server Settings → Enable Community** *(do this last in Phase 1 — wait until Phase 3 if it asks for rules/updates channels)*
   - Once enabled you unlock: Stage channels, Server Insights, Discovery, Announcement channels
5. **Server Settings → Roles → @everyone**
   - Turn **OFF**: Create Invite, Change Nickname, Mention @everyone/@here, Use External Emojis, Use External Stickers
   - Leave **ON**: View Channels, Send Messages, Read Message History, Connect, Speak
   - (We'll lock channels per-category in Phase 4 — @everyone stays loose at the role level)

---

## Phase 2 — Roles

Create top-to-bottom. **Hierarchy = higher row has more power.** Drag into this order after creating.

| # | Role | Hoisted | Mentionable | Notes |
|---|------|---------|-------------|-------|
| 1 | Owner | yes | no | you only |
| 2 | Admin | yes | no | 1–2 trusted |
| 3 | Mod | yes | no | light moderation |
| 4 | Bots | no | no | auto-assigned to bots |
| 5 | Cinema VIP | no | yes | movie night ping |
| 6 | Gamer | no | yes | LFG ping |
| 7 | Creative | no | yes | project-feedback ping |
| 8 | AI Access | no | yes | gates AI category |
| 9 | Member | no | no | default after onboarding |
| 10 | Unverified | no | no | default on join |

**Permissions per role:** leave at default for now. Channel overrides in Phase 4 do the real work.

**Color scheme:** [decorate] — pick a 3–4 color palette, repeat across hierarchy bands.

---

## Phase 3 — Categories & channels

Create in this order. Channel **topic** is the small text under the channel name — skeletons below, decorate freely.

### 📌 START HERE
| Channel | Type | Topic skeleton |
|---|---|---|
| `welcome` | text | `[decorate] — first stop for new members` |
| `rules` | text | `the short list. don't be the reason we add a new one.` |
| `roles` | text | `react to grab pings — no role = no ping` |
| `announcements` | announcement | `server news. mute if you must.` |

### 💬 HANGOUT
| Channel | Type | Topic skeleton |
|---|---|---|
| `general` | text | `the firepit` |
| `memes` | text | `[decorate]` |
| `media-share` | text | `pics, vids, songs, cool links` |
| `vent` | text | `bad day chat. no advice unless asked.` |
| `off-topic` | text | `everything else` |

### 🎮 GAMING
| Channel | Type | Topic skeleton |
|---|---|---|
| `lfg` | text | `looking for group — tag @Gamer if needed` |
| `wow` | text | `world of warcraft` |
| `cobblemon-mc` | text | `july-airline.gl.joinmc.link` |
| `other-games` | text | `everything that isn't WoW or MC` |
| `Game VC 1` | voice | — |
| `Game VC 2` | voice | — |
| `Game VC 3` | voice | — |

### 🎨 CREATIVE
| Channel | Type | Topic skeleton |
|---|---|---|
| `wip` | text | `work in progress, rough drafts welcome` |
| `renders-and-art` | text | `finished pieces` |
| `code-and-addons` | text | `code, addons, scripts, tools` |
| `feedback` | text | `tag @Creative when you want eyes on something` |

### 🎬 CINEMA
| Channel | Type | Topic skeleton |
|---|---|---|
| `now-playing` | text | `auto-updates with current 24/7 stream` |
| `movie-requests` | text | `drop titles + a vote 👍` |
| `watch-parties` | text | `scheduled via Sesh — react to RSVP` |
| `🍿 24/7 Theater` | voice | (alt account screen-shares here) |
| `Watch Party VC` | voice | — |

### 🤖 AI PLAYGROUND
*Locked behind @AI Access role.*
| Channel | Type | Topic skeleton |
|---|---|---|
| `ai-chat` | text | `text models — keep it in here` |
| `ai-images` | text | `image gen — prompt + result` |
| `ai-experiments` | text | `weird stuff, jailbreak attempts, side projects` |

### 🛠️ BACKSTAGE
| Channel | Type | Visibility |
|---|---|---|
| `bot-commands` | text | members can use, hidden from #general scroll |
| `mod-log` | text | hidden — Mod+ only |
| `admin` | text | hidden — Admin+ only |
| `🔊 AFK` | voice | inactive timeout dumps users here |

After creating: **Server Settings → Overview → Inactive Channel → `🔊 AFK`**, timeout 15 min.

---

## Phase 4 — Permission overrides (the real lockdown)

Set these on the **category** — channels inherit unless you override.

### 📌 START HERE
- `@everyone` & `@Unverified`: View ✅, Send ❌, Add Reactions ✅, Read History ✅
- `@Member`: View ✅, Send ❌ (announcements), Add Reactions ✅
- `#welcome` and `#roles`: same as above (read + react only)
- `#rules`, `#announcements`: only Admin/Mod can send

### 💬 HANGOUT, 🎮 GAMING, 🎨 CREATIVE, 🎬 CINEMA
- `@everyone`: View ❌
- `@Unverified`: View ❌
- `@Member`: View ✅, Send ✅, Connect ✅, Speak ✅
- `@Mod`: Manage Messages ✅

### 🤖 AI PLAYGROUND
- `@everyone`: View ❌
- `@Member`: View ❌
- `@AI Access`: View ✅, Send ✅
- `@Mod`: Manage Messages ✅

### 🛠️ BACKSTAGE
- `@everyone`: View ❌
- `#bot-commands`: `@Member` View ✅ Send ✅
- `#mod-log`: `@Mod` View ✅
- `#admin`: `@Admin` View ✅

---

## Phase 5 — Bot invites

Invite in this order. After each invite, **drag the bot's auto-created role under @Bots** in role list.

| Bot | Purpose | Invite |
|---|---|---|
| **Carl-bot** | moderation, reaction roles, welcome, automod | https://carl.gg/ |
| **Sesh** | event scheduling | https://sesh.fyi/ |
| **Jockie Music** | voice music | https://jockiemusic.com/ |
| **Arcane** | XP/levels (optional) | https://arcane.bot/ |
| AI bot | (pick one — see Phase 7) | — |

After all bots in: limit them to relevant channels via category overrides if you want them quiet elsewhere.

---

## Phase 6 — Carl-bot config (paste in `#bot-commands`)

Default prefix: `?` — change with `?prefix !` if you want.

### Auto-role on join (unverified gate)
```
?autorole add Unverified
```
Then in `#welcome`, add a reaction-role rule that swaps `@Unverified` → `@Member` when they react to a "✅ I read the rules" message (see below).

### Welcome message
```
?welcome channel #welcome
?welcome message {user.mention} just joined — grab roles in #roles and say hi in #general
```
*(decorate the message text however you want — `{user.mention}` and `{server.name}` are valid placeholders)*

### Reaction roles
Run `?rr make` in `#bot-commands` and follow the wizard. Suggested setup for `#roles`:

| Emoji | Role | Channel(s) it unlocks |
|---|---|---|
| ✅ | Member | exits Unverified gate |
| 🎮 | Gamer | LFG pings |
| 🎬 | Cinema VIP | movie night pings |
| 🎨 | Creative | feedback pings |
| 🤖 | AI Access | unlocks AI category |

### Automod baseline
```
?automod invites on
?automod caps on 70
?automod massmention 5
?automod links whitelist youtube.com youtu.be twitch.tv twitter.com x.com bsky.app tenor.com giphy.com
```

### Logging
```
?log channel #mod-log
?log enable messageDelete messageEdit memberJoin memberLeave memberBan
```

---

## Phase 7 — Channel content skeletons

### `#welcome` (one pinned message)
```
welcome to [SERVER NAME]

→ read #rules
→ grab pings in #roles
→ say hi in #general
→ check #now-playing if you want to vibe to whatever's on the theater

[decorate]
```

### `#rules` (one pinned message)
```
1. don't be a dick
2. no slurs, no harassment, no doxxing
3. NSFW only in [TBD or "nowhere"]
4. spoilers go in spoiler tags ||like this||
5. keep AI stuff in the AI category
6. mods have final say — DM @Owner if something's broken

react ✅ below to confirm you read this and unlock the rest of the server
```

### `#roles` (one pinned message)
```
react to opt into pings:

🎮  @Gamer       — LFG and game nights
🎬  @Cinema VIP  — movie night pings + early request voting
🎨  @Creative    — project feedback pings
🤖  @AI Access   — unlocks the AI category

(remove your reaction to drop the role)
```

---

## Phase 8 — 24/7 Cinema (separate doc when you're ready)

Recommended setup:
- Spare PC or always-on machine
- Discord alt account joined to server, role `@Cinema Bot` (manual role, not a real bot)
- VLC with a playlist + screen-share into `🍿 24/7 Theater`
- Optional: a webhook posting "now playing" titles to `#now-playing` (small Python script, ~30 lines)

When you want, I'll write the VLC playlist setup + the webhook script.

---

## Phase 9 — AI bot pick (when you're ready)

| Option | Cost | Strength |
|---|---|---|
| **Shapes Inc** | free tier | character bots, easy setup |
| **ChatGPT Discord bots** (search "ChatGPT bot") | varies | text Q&A |
| **Midjourney bot** | $10/mo+ | image gen, top quality |
| **BlueWillow** | free | image gen, slower |
| Custom Claude bot | API cost | I can write this for you |

---

## Setup checklist (rip through this)

- [ ] Phase 1: server created, base settings flipped
- [ ] Phase 2: 10 roles created, hierarchy ordered
- [ ] Phase 3: all 7 categories + channels created
- [ ] Phase 4: permission overrides set per category
- [ ] Phase 5: Carl-bot, Sesh, Jockie, Arcane invited + roles dragged under @Bots
- [ ] Phase 6: Carl-bot autorole, welcome, reaction roles, automod, logging configured
- [ ] Phase 7: `#welcome`, `#rules`, `#roles` pinned messages posted
- [ ] Community Server enabled (Settings → Enable Community)
- [ ] Inactive channel + timeout set
- [ ] Phase 8: cinema rig (separate setup)
- [ ] Phase 9: AI bot picked + invited
