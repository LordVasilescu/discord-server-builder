// © 2026 Mathew. All rights reserved.
// Lily Prime — one-shot server builder (REST-only, no gateway/WebSocket).
// Creates all roles, categories, channels, permission overrides, and pinned
// messages. Safe to re-run: anything that already exists by name is reused.
//
//   1. Invite the bot to the server (admin), then
//   2. cp .env.example .env  (paste your bot token; GUILD_ID can stay blank)
//   3. npm install  &&  npm run build:server

import 'dotenv/config';
import { PermissionFlagsBits as P, ChannelType } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const API = 'https://discord.com/api/v10';

// --- bitfield + color helpers -------------------------------------------------
const bits = (flags) => (flags.reduce((a, f) => a | f, 0n)).toString();
const hex = (h) => parseInt(h.replace('#', ''), 16);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Rate-limit-aware REST call. Retries on 429 and transient 5xx.
async function rest(method, path, body) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const wait = (data.retry_after ?? 1) * 1000 + 250;
      console.log(`    … rate limited, waiting ${Math.round(wait)}ms`);
      await sleep(wait);
      continue;
    }
    if (res.status >= 500) { await sleep(1000); continue; }
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${method} ${path} -> ${res.status} ${txt}`);
    }
    await sleep(250); // gentle spacing between writes
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${path} failed after retries`);
}

// --- ROLES (highest first; Discord stacks new roles at the bottom) ------------
const ROLES = [
  { key: 'emperor', name: 'Emperor', color: '#E8B923', hoist: true, mentionable: false, perms: [P.Administrator] },
  { key: 'council', name: 'High Council', color: '#9B59B6', hoist: true, mentionable: false,
    perms: [P.ManageGuild, P.ManageChannels, P.ManageRoles, P.KickMembers, P.BanMembers, P.ManageMessages, P.ManageNicknames, P.ModerateMembers, P.MentionEveryone] },
  { key: 'officers', name: 'Officers', color: '#5DADE2', hoist: true, mentionable: false,
    perms: [P.KickMembers, P.ManageMessages, P.ManageNicknames, P.ModerateMembers, P.MoveMembers, P.MuteMembers, P.DeafenMembers] },
  { key: 'bots', name: 'Bots', color: '#95A5A6', hoist: false, mentionable: false, perms: [] },
  { key: 'fleet', name: 'Fleet', color: '#2ECC71', hoist: false, mentionable: true, perms: [] },
  { key: 'cinema', name: 'Cinema', color: '#E74C3C', hoist: false, mentionable: true, perms: [] },
  { key: 'artisan', name: 'Artisan', color: '#E67E22', hoist: false, mentionable: true, perms: [] },
  { key: 'aicore', name: 'AI Core', color: '#1ABC9C', hoist: false, mentionable: true, perms: [] },
  { key: 'afterdark', name: 'After Dark', color: '#AD1457', hoist: false, mentionable: true, perms: [] },
  { key: 'citizen', name: 'Citizen', color: '#3498DB', hoist: false, mentionable: false, perms: [] },
  { key: 'initiate', name: 'Initiate', color: '#7F8C8D', hoist: false, mentionable: false, perms: [] },
];

const T = ChannelType.GuildText;     // 0
const V = ChannelType.GuildVoice;    // 2
const CAT = ChannelType.GuildCategory; // 4

const STRUCTURE = [
  {
    name: '⭐ CAPITOL',
    overwrites: [{ role: 'everyone', allow: [P.ViewChannel, P.AddReactions, P.ReadMessageHistory], deny: [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads] }],
    channels: [
      { name: 'welcome', type: T, topic: 'First dock for new arrivals. Read, react, report in.', pinKey: 'welcome' },
      { name: 'decrees', type: T, topic: 'The imperial rule set. React ✅ to swear in.',
        overwrites: [{ role: 'officers', allow: [P.SendMessages] }, { role: 'council', allow: [P.SendMessages] }], pinKey: 'decrees' },
      { name: 'roles', type: T, topic: 'React to claim pings and unlock channels.', pinKey: 'roles' },
      { name: 'transmissions', type: T, topic: 'Empire news. Mute if you must.',
        overwrites: [{ role: 'officers', allow: [P.SendMessages] }, { role: 'council', allow: [P.SendMessages] }] },
    ],
  },
  {
    name: '🛰 COMMONS',
    overwrites: [
      { role: 'everyone', deny: [P.ViewChannel] },
      { role: 'initiate', deny: [P.ViewChannel] },
      { role: 'citizen', allow: [P.ViewChannel, P.SendMessages, P.AddReactions, P.ReadMessageHistory, P.Connect, P.Speak] },
      { role: 'officers', allow: [P.ManageMessages] },
    ],
    channels: [
      { name: 'general-comms', type: T, topic: 'The main channel. Say hi.' },
      { name: 'memes', type: T, topic: 'Post your best (or worst).' },
      { name: 'media-share', type: T, topic: 'Pics, vids, songs, cool links.' },
      { name: 'the-void', type: T, topic: 'Bad day chat. No advice unless asked.' },
      { name: 'off-topic', type: T, topic: 'Everything else.' },
    ],
  },
  {
    name: '🎮 WAR ROOM',
    overwrites: [
      { role: 'everyone', deny: [P.ViewChannel] },
      { role: 'initiate', deny: [P.ViewChannel] },
      { role: 'citizen', allow: [P.ViewChannel, P.SendMessages, P.AddReactions, P.ReadMessageHistory, P.Connect, P.Speak] },
      { role: 'officers', allow: [P.ManageMessages] },
    ],
    channels: [
      { name: 'lfg', type: T, topic: 'Looking for group — tag @Fleet if needed.' },
      { name: 'wow', type: T, topic: 'World of Warcraft.' },
      { name: 'cobblemon-mc', type: T, topic: 'july-airline.gl.joinmc.link' },
      { name: 'other-games', type: T, topic: "Everything that isn't WoW or MC." },
      { name: 'Fleet VC 1', type: V },
      { name: 'Fleet VC 2', type: V },
      { name: 'Fleet VC 3', type: V },
    ],
  },
  {
    name: '🎨 FORGE',
    overwrites: [
      { role: 'everyone', deny: [P.ViewChannel] },
      { role: 'initiate', deny: [P.ViewChannel] },
      { role: 'citizen', allow: [P.ViewChannel, P.SendMessages, P.AddReactions, P.ReadMessageHistory, P.Connect, P.Speak] },
      { role: 'officers', allow: [P.ManageMessages] },
    ],
    channels: [
      { name: 'wip', type: T, topic: 'Work in progress, rough drafts welcome.' },
      { name: 'gallery', type: T, topic: 'Finished pieces.' },
      { name: 'code-and-addons', type: T, topic: 'Code, addons, scripts, tools.' },
      { name: 'critique', type: T, topic: 'Tag @Artisan when you want eyes on something.' },
    ],
  },
  {
    name: '🎬 HOLODECK',
    overwrites: [
      { role: 'everyone', deny: [P.ViewChannel] },
      { role: 'initiate', deny: [P.ViewChannel] },
      { role: 'citizen', allow: [P.ViewChannel, P.SendMessages, P.AddReactions, P.ReadMessageHistory, P.Connect, P.Speak] },
      { role: 'officers', allow: [P.ManageMessages] },
    ],
    channels: [
      { name: 'now-playing', type: T, topic: 'Auto-updates with the current 24/7 stream.' },
      { name: 'requests', type: T, topic: 'Drop titles + a vote 👍.' },
      { name: 'watch-parties', type: T, topic: 'Scheduled via Sesh — react to RSVP.' },
      { name: '🍿 24/7 Theater', type: V },
      { name: 'Watch Party VC', type: V },
    ],
  },
  {
    name: '🤖 AI CORE',
    overwrites: [
      { role: 'everyone', deny: [P.ViewChannel] },
      { role: 'citizen', deny: [P.ViewChannel] },
      { role: 'aicore', allow: [P.ViewChannel, P.SendMessages, P.AddReactions, P.ReadMessageHistory] },
      { role: 'officers', allow: [P.ViewChannel, P.ManageMessages] },
    ],
    channels: [
      { name: 'ai-chat', type: T, topic: 'Text models — keep it in here.' },
      { name: 'ai-images', type: T, topic: 'Image gen — prompt + result.' },
      { name: 'ai-experiments', type: T, topic: 'Weird stuff, side projects.' },
    ],
  },
  {
    name: '🔴 AFTER DARK',
    overwrites: [
      { role: 'everyone', deny: [P.ViewChannel] },
      { role: 'citizen', deny: [P.ViewChannel] },
      { role: 'afterdark', allow: [P.ViewChannel, P.SendMessages, P.AddReactions, P.ReadMessageHistory] },
      { role: 'officers', allow: [P.ViewChannel, P.ManageMessages] },
    ],
    channels: [
      { name: 'after-dark', type: T, nsfw: true, topic: '18+ only. Opt in via #roles. Keep it here.' },
    ],
  },
  {
    name: '🛠 COMMAND DECK',
    overwrites: [{ role: 'everyone', deny: [P.ViewChannel] }],
    channels: [
      { name: 'bot-commands', type: T, topic: 'Run bot commands here.',
        overwrites: [{ role: 'citizen', allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] }] },
      { name: 'officers-log', type: T, topic: 'Audit + mod log.',
        overwrites: [{ role: 'officers', allow: [P.ViewChannel, P.ReadMessageHistory] }, { role: 'council', allow: [P.ViewChannel] }] },
      { name: 'war-council', type: T, topic: 'High Council only.',
        overwrites: [{ role: 'council', allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] }, { role: 'emperor', allow: [P.ViewChannel] }] },
      { name: '🔊 AFK', type: V, overwrites: [{ role: 'everyone', allow: [P.ViewChannel, P.Connect] }] },
    ],
  },
];

const PINS = {
  welcome:
`⟡  W E L C O M E   T O   G R I L L O N I A   P R I M E  ⟡

You've docked at the capitol. Boarding sequence:

①  Read the #decrees and react ✅ to gain citizenship
②  Claim your pings in #roles
③  Report in at #general-comms
④  Tune #now-playing if you want something on in the background

Long may the empire run.`,
  decrees:
`⟡  IMPERIAL DECREES  ⟡

1. Don't be a dick.
2. No slurs, harassment, or doxxing. Zero tolerance.
3. NSFW stays in the gated #after-dark channel — opt in via #roles, nowhere else.
4. Spoilers go in tags ||like this||.
5. Keep AI generation in the 🤖 AI CORE channels.
6. Officers and the High Council have final say. DM the Emperor if something's broken.

React ✅ below to swear in as a Citizen and unlock the rest of the empire.`,
  roles:
`⟡  CLAIM YOUR DESIGNATION  ⟡

React to opt into pings and unlock channels:

✅  Citizen     — swear in, unlock the server
🚀  Fleet       — LFG + game nights
🎬  Cinema      — movie night pings + request voting
🎨  Artisan     — project feedback pings
🤖  AI Core     — unlocks the AI CORE channels
🔴  After Dark  — unlocks the gated NSFW channel (18+)

(Remove your reaction to drop the designation.)`,
};
const PIN_REACTIONS = { decrees: ['✅'], roles: ['✅', '🚀', '🎬', '🎨', '🤖', '🔴'] };

// -----------------------------------------------------------------------------
const roleMap = new Map(); // key -> role id

function resolveOverwrites(specs, everyoneId) {
  return (specs ?? []).map((s) => {
    const id = s.role === 'everyone' ? everyoneId : roleMap.get(s.role);
    if (!id) throw new Error(`Unknown role in overwrite: ${s.role}`);
    return { id, type: 0, allow: bits(s.allow ?? []), deny: bits(s.deny ?? []) };
  });
}

async function resolveGuild() {
  const id = process.env.GUILD_ID?.trim();
  if (id) {
    const g = await fetch(`${API}/guilds/${id}`, { headers: { Authorization: `Bot ${TOKEN}` } });
    if (g.ok) return (await g.json());
    console.log(`GUILD_ID ${id} not reachable (${g.status}); auto-detecting…`);
  }
  const r = await rest('GET', '/users/@me/guilds');
  if (!r.length) throw new Error('Bot is in 0 servers. Invite it first, then re-run.');
  if (r.length > 1) throw new Error(`Bot is in ${r.length} servers. Set GUILD_ID in .env.`);
  return r[0];
}

async function main() {
  if (!TOKEN || TOKEN.includes('paste-your')) {
    console.error('ERROR: set DISCORD_TOKEN in .env first.');
    process.exit(1);
  }
  const guild = await resolveGuild();
  const gid = guild.id;
  console.log(`Building in: ${guild.name} (${gid})\n`);

  const existingRoles = await rest('GET', `/guilds/${gid}/roles`);
  const everyoneId = gid; // @everyone role id == guild id

  // Tighten @everyone baseline.
  console.log('Adjusting @everyone base permissions…');
  await rest('PATCH', `/guilds/${gid}/roles/${everyoneId}`, {
    permissions: bits([P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.AddReactions,
      P.Connect, P.Speak, P.AttachFiles, P.EmbedLinks, P.UseApplicationCommands]),
  });

  console.log('\nCreating roles (highest first)…');
  for (const def of ROLES) {
    const found = existingRoles.find((r) => r.name === def.name);
    if (found) { console.log(`  = role exists: ${def.name}`); roleMap.set(def.key, found.id); continue; }
    const created = await rest('POST', `/guilds/${gid}/roles`, {
      name: def.name, color: hex(def.color), hoist: def.hoist, mentionable: def.mentionable, permissions: bits(def.perms),
    });
    console.log(`  + role: ${def.name}`);
    roleMap.set(def.key, created.id);
  }

  console.log('\nCreating categories + channels…');
  let channels = await rest('GET', `/guilds/${gid}/channels`);
  const pinTargets = [];

  for (const catDef of STRUCTURE) {
    let cat = channels.find((c) => c.type === CAT && c.name === catDef.name);
    if (!cat) {
      cat = await rest('POST', `/guilds/${gid}/channels`, {
        name: catDef.name, type: CAT, permission_overwrites: resolveOverwrites(catDef.overwrites, everyoneId),
      });
      console.log(`+ category: ${catDef.name}`);
    } else console.log(`= category exists: ${catDef.name}`);

    for (const ch of catDef.channels) {
      let channel = channels.find((c) => c.parent_id === cat.id && c.name === ch.name && c.type === ch.type);
      if (!channel) {
        channel = await rest('POST', `/guilds/${gid}/channels`, {
          name: ch.name, type: ch.type, parent_id: cat.id,
          topic: ch.type === T ? ch.topic : undefined,
          nsfw: ch.nsfw ?? false,
          permission_overwrites: ch.overwrites ? resolveOverwrites(ch.overwrites, everyoneId) : undefined,
        });
        console.log(`    + channel: ${ch.name}`);
      } else console.log(`    = channel exists: ${ch.name}`);
      if (ch.pinKey) pinTargets.push({ id: channel.id, name: ch.name, key: ch.pinKey });
    }
  }

  console.log('\nPosting pinned messages…');
  for (const t of pinTargets) {
    const pins = await rest('GET', `/channels/${t.id}/pins`).catch(() => null);
    if (pins && pins.length > 0) { console.log(`    = pin exists in #${t.name}`); continue; }
    const msg = await rest('POST', `/channels/${t.id}/messages`, { content: PINS[t.key] });
    await rest('PUT', `/channels/${t.id}/pins/${msg.id}`).catch(() => console.log(`    ! could not pin in #${t.name}`));
    for (const emoji of PIN_REACTIONS[t.key] ?? []) {
      await rest('PUT', `/channels/${t.id}/messages/${msg.id}/reactions/${encodeURIComponent(emoji)}/@me`).catch(() => {});
    }
    console.log(`    + pinned in #${t.name}`);
  }

  console.log('\n✅ Lily Prime build complete.');
  console.log('Next: invite Carl-bot + friends, then run the Phase 6 configs.');
}

main().catch((err) => { console.error('\nBUILD FAILED:', err.message); process.exit(1); });
