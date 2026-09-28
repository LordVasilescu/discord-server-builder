// © 2026 Mathew. All rights reserved.
// Content polish pass for Grillonia Prime. Idempotent & safe to re-run.
//  1. Enable Community + set description (rules=#the-code, updates=#watch-log)
//  2. Add #jack-in (intros) to ORBITAL DOCK + NEON-LOUNGE voice to NEON DISTRICT
//  3. Seed a themed first message in active channels that are still empty
import 'dotenv/config';
import { ChannelType } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const API = 'https://discord.com/api/v10';
const gid = process.env.GUILD_ID.trim();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function rest(method, path, body) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) { const d = await res.json().catch(() => ({})); await sleep((d.retry_after ?? 1) * 1000 + 250); continue; }
    if (res.status >= 500) { await sleep(1000); continue; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    await sleep(300);
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${path} failed`);
}

const chans = await rest('GET', `/guilds/${gid}/channels`);
const byName = (n) => chans.find(c => c.name === n);
const catByName = (n) => chans.find(c => c.type === 4 && c.name === n);

// ---- 1. Community + description ---------------------------------------------
console.log('— Community + description —');
const guild = await rest('GET', `/guilds/${gid}`);
if (!guild.features.includes('COMMUNITY')) {
  const rules = byName('the-code');
  const updates = byName('watch-log');
  await rest('PATCH', `/guilds/${gid}`, {
    features: ['COMMUNITY'],
    rules_channel_id: rules.id,
    public_updates_channel_id: updates.id,
    verification_level: 1,
    explicit_content_filter: 2,
    default_message_notifications: 1,
    description: 'a neon ecumenopolis — ten billion lights, from the orbital spire down to the undercity. read the code. get chipped. descend.',
  });
  console.log('  + Community enabled, rules=#the-code, updates=#watch-log, description set');
} else {
  await rest('PATCH', `/guilds/${gid}`, {
    description: 'a neon ecumenopolis — ten billion lights, from the orbital spire down to the undercity. read the code. get chipped. descend.',
  });
  console.log('  = Community already on; description refreshed');
}

// ---- 2. Add channels --------------------------------------------------------
console.log('— channels —');
async function ensureChannel(name, type, catName, topic) {
  if (byName(name)) { console.log(`  = #${name} exists`); return; }
  const cat = catByName(catName);
  const c = await rest('POST', `/guilds/${gid}/channels`, {
    name, type, parent_id: cat?.id,
    topic: type === ChannelType.GuildText ? topic : undefined,
  });
  chans.push(c);
  console.log(`  + #${name} in ${catName}`);
}
await ensureChannel('jack-in', ChannelType.GuildText, '▓▓ ⟨ ORBITAL DOCK ⟩ ▓▓', '▸ jack in. who are you, offworlder? drop a handle + what you run.');
await ensureChannel('NEON-LOUNGE', ChannelType.GuildVoice, '░░ ⟨ NEON DISTRICT ⟩ ░░');

// ---- 3. Seed starter messages -----------------------------------------------
console.log('— seed messages —');
const SEEDS = {
  'jack-in': "```\n> NEW HANDLE REGISTRATION\n```\ndrop a line, choomba:\n\n▸ **handle** — what do we call you\n▸ **runs** — games / projects / what you're into\n▸ **rig** — pc, console, potato, doesn't matter\n\nno wrong answers. the grid remembers everyone.",
  'the-street': "```\n> FREQUENCY OPEN\n```\nstreet level is live. this is the main channel — say something, lurk, post a thought. no pressure, choomba.",
  'data-cache': "```\n> CACHE ONLINE\n```\ndump it here: pics, clips, tracks, cursed links. the cache never forgets.",
  'static': "```\n> //dev/null\n```\neverything else lands here. shitposts, tangents, junk data — all welcome.",
  'squad-up': "```\n> LFG BEACON\n```\nlooking for a crew? post the game + how many slots. tag a **⟨ STREET SAMURAI ⟩** to ping the squad.",
  'game-grid': "```\n> ARENA INDEX\n```\nall arenas route through here — wow, blockworld, whatever's running. patch notes, builds, screenshots, salt.",
  'in-construction': "```\n> BUILD IN PROGRESS\n```\nraw builds, half-finished runs, rough drafts. ship it ugly. nobody's judging the scaffolding.",
  'source': "```\n> SOURCE TREE\n```\ncode, scripts, addons, machine-craft. drop snippets in ```code blocks``` and link repos.",
  'signal-feed': "```\n> BROADCASTING\n```\nthe feed is always on. join **ALWAYS-ON.FEED** voice to tune in. drop requests right here.",
};
for (const [name, content] of Object.entries(SEEDS)) {
  const ch = byName(name);
  if (!ch) { console.log(`  ? #${name} missing, skip`); continue; }
  const recent = await rest('GET', `/channels/${ch.id}/messages?limit=1`).catch(() => []);
  if (recent.length > 0) { console.log(`  = #${name} not empty, skip`); continue; }
  await rest('POST', `/channels/${ch.id}/messages`, { content });
  console.log(`  + seeded #${name}`);
}

console.log('\n✅ polish pass complete.');
