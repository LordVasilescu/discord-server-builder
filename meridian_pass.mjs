// © 2026 Mathew. All rights reserved.
// Meridian-influence pass for Grillonia Prime Discord.
// Idempotent: renames by current name, updates colors/topics/description,
// ensures missing social channels, refreshes orientation embeds.
// Does NOT dump full game zones — see GRILLONIA_PRIME_DISCORD_BIBLE.md
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { ChannelType } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const gid = process.env.GUILD_ID?.trim();
const API = 'https://discord.com/api/v10';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const auth = { Authorization: `Bot ${TOKEN}` };

if (!TOKEN || !gid) {
  console.error('Need DISCORD_TOKEN and GUILD_ID in .env');
  process.exit(1);
}

async function rest(method, path, body) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const d = await res.json().catch(() => ({}));
      await sleep((d.retry_after ?? 1) * 1000 + 300);
      continue;
    }
    if (res.status >= 500) { await sleep(1000); continue; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
    await sleep(280);
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${path} failed after retries`);
}

const hex = (h) => parseInt(h.replace('#', ''), 16);

// ---- live fetch -------------------------------------------------------------
let channels = await rest('GET', `/guilds/${gid}/channels`);
let roles = await rest('GET', `/guilds/${gid}/roles`);

const ch = (name) => channels.find((c) => c.name === name);
const cat = (name) => channels.find((c) => c.type === 4 && c.name === name);
const role = (name) => roles.find((r) => r.name === name);

async function renameChannel(from, to, topic) {
  const c = ch(from);
  if (!c) {
    // already renamed?
    if (ch(to)) { console.log(`  = #${to} already set`); return ch(to); }
    console.log(`  ? skip rename #${from} → #${to} (source missing)`);
    return null;
  }
  if (from === to && (topic === undefined || c.topic === topic)) {
    console.log(`  = #${to}`);
    return c;
  }
  const body = {};
  if (from !== to) body.name = to;
  if (topic !== undefined) body.topic = topic;
  const updated = await rest('PATCH', `/channels/${c.id}`, body);
  Object.assign(c, updated);
  console.log(`  + #${from} → #${to}`);
  return c;
}

async function renameRole(from, to, colorHex, hoist, mentionable) {
  const r = role(from) || role(to);
  if (!r) { console.log(`  ? role missing: ${from}`); return null; }
  const body = { name: to, color: hex(colorHex) };
  if (hoist !== undefined) body.hoist = hoist;
  if (mentionable !== undefined) body.mentionable = mentionable;
  const updated = await rest('PATCH', `/guilds/${gid}/roles/${r.id}`, body);
  Object.assign(r, updated);
  console.log(`  + role ${from} → ${to} (${colorHex})`);
  return r;
}

async function ensureText(name, parentName, topic) {
  if (ch(name)) { console.log(`  = #${name} exists`); return ch(name); }
  const parent = cat(parentName);
  if (!parent) { console.log(`  ? no category ${parentName} for #${name}`); return null; }
  const created = await rest('POST', `/guilds/${gid}/channels`, {
    name,
    type: ChannelType.GuildText,
    parent_id: parent.id,
    topic,
  });
  channels.push(created);
  console.log(`  + created #${name} in ${parentName}`);
  return created;
}

async function ensureVoice(name, parentName) {
  if (ch(name)) { console.log(`  = 🔊 ${name} exists`); return ch(name); }
  const parent = cat(parentName);
  if (!parent) { console.log(`  ? no category ${parentName} for 🔊 ${name}`); return null; }
  const created = await rest('POST', `/guilds/${gid}/channels`, {
    name,
    type: ChannelType.GuildVoice,
    parent_id: parent.id,
  });
  channels.push(created);
  console.log(`  + created 🔊 ${name} in ${parentName}`);
  return created;
}

// ---- 1. description ---------------------------------------------------------
console.log('— server description —');
const DESCRIPTION =
  'warm capital of 2100 — success on the skyline, home in the square. read the code. chip in. come home.';
await rest('PATCH', `/guilds/${gid}`, { description: DESCRIPTION });
console.log(`  + description set`);

// ---- 2. roles (palette + soft renames) --------------------------------------
console.log('— roles —');
// try both old cyber names and already-updated names
await renameRole('PRIME ARCHITECT', 'PRIME ARCHITECT', '#E8B923', true, false);
await renameRole('NETRUNNER', 'NETRUNNER', '#38BDF8', true, false);
await renameRole('ICE', 'ICE', '#A78BFA', true, false);
await renameRole('DAEMON', 'DAEMON', '#4ADE80', false, false);
await renameRole('STREET SAMURAI', 'CIRCUIT', '#FB923C', false, true);
// if already CIRCUIT
if (!role('CIRCUIT') && !role('STREET SAMURAI')) {
  // try case variants
  const sam = roles.find((r) => /samurai|circuit/i.test(r.name));
  if (sam) await renameRole(sam.name, 'CIRCUIT', '#FB923C', false, true);
}
await renameRole('HOLO-PASS', 'HOLO-PASS', '#F472B6', false, true);
await renameRole('FIXER', 'FIXER', '#818CF8', false, true);
await renameRole('PRIME CITIZEN', 'PRIME CITIZEN', '#E2E8F0', false, false);
await renameRole('OFFWORLDER', 'OFFWORLDER', '#64748B', false, false);
await renameRole('UNDERCITY', 'AFTERLIGHT', '#BE185D', false, true);
if (!role('AFTERLIGHT')) {
  const u = roles.find((r) => /undercity|afterlight/i.test(r.name));
  if (u) await renameRole(u.name, 'AFTERLIGHT', '#BE185D', false, true);
}

// refresh roles list
roles = await rest('GET', `/guilds/${gid}/roles`);

// ---- 3. categories ----------------------------------------------------------
console.log('— categories —');
const CAT_MAP = [
  // from possible current names → target
  { from: ['ORBITAL DOCK', '▓▓ ⟨ ORBITAL DOCK ⟩ ▓▓', 'ARRIVAL', '⭐ ARRIVAL'], to: 'ARRIVAL' },
  { from: ['AFTERLIFE', '░░ ⟨ AFTERLIFE ⟩ ░░', 'HEARTLIGHT', 'HEARTLIGHT ░░'], to: 'HEARTLIGHT' },
  { from: ['COMBAT', 'THE CIRCUIT', '▓▓ ⟨ ARENA ⟩ ▓▓'], to: 'THE CIRCUIT' },
  { from: ['THE FORGE', 'FAMEWORKS', '░░ ⟨ THE FORGE ⟩ ░░'], to: 'FAMEWORKS' },
  { from: ['HOLO-DECK', 'BROADCAST MILE', '▓▓ ⟨ HOLO-DECK ⟩ ▓▓'], to: 'BROADCAST MILE' },
  { from: ['BLACKWALL', 'AFTERLIGHT', '░░ ⟨ BLACKWALL ⟩ ░░'], to: 'AFTERLIGHT' },
  { from: ['THE SPIRE', 'SPIRE OPS', '▓▓ ⟨ THE SPIRE ⟩ ▓▓', 'MAINFRAME'], to: 'SPIRE OPS' },
];

for (const m of CAT_MAP) {
  let found = null;
  for (const name of m.from) {
    found = channels.find((c) => c.type === 4 && c.name === name);
    if (found) break;
    // fuzzy: category name includes key token
    const key = m.to.split(' ').pop();
    found = channels.find((c) => c.type === 4 && c.name.toUpperCase().includes(key));
    if (found && m.from.some((f) => found.name.toUpperCase().includes(f.split(' ').pop()))) break;
    // looser: match first word of target if unique
    found = null;
  }
  // more robust match by known keywords
  if (!found) {
    const keys = {
      'ARRIVAL': /orbital|arrival|initiate|start/i,
      'HEARTLIGHT': /afterlife|heartlight|neon district|the grid|hangout/i,
      'THE CIRCUIT': /combat|circuit|arena(?!.*ops)/i,
      'FAMEWORKS': /forge|fameworks|creative/i,
      'BROADCAST MILE': /holo|broadcast|cinema/i,
      'AFTERLIGHT': /blackwall|afterlight|nsfw/i,
      'SPIRE OPS': /spire|mainframe|backstage|ops/i,
    };
    found = channels.find((c) => c.type === 4 && keys[m.to]?.test(c.name));
  }
  if (!found) {
    // create category if totally missing
    const created = await rest('POST', `/guilds/${gid}/channels`, {
      name: m.to,
      type: ChannelType.GuildCategory,
    });
    channels.push(created);
    console.log(`  + created category ${m.to}`);
    continue;
  }
  if (found.name !== m.to) {
    const updated = await rest('PATCH', `/channels/${found.id}`, { name: m.to });
    Object.assign(found, updated);
    console.log(`  + category ${found.name} → ${m.to}`);
  } else {
    console.log(`  = category ${m.to}`);
  }
}

// refresh
channels = await rest('GET', `/guilds/${gid}/channels`);

// ---- 4. channel renames + topics --------------------------------------------
console.log('— channels —');

// ARRIVAL
await renameChannel('boot-sequence', 'boot-sequence', 'first dock. read the code. chip in. come home.');
await renameChannel('the-code', 'the-code', 'planetary law. break it = disconnect. ICE has final call.');
await renameChannel('augments', 'augments', 'react to install chips. remove to uninstall.');
await renameChannel('jack-in', 'jack-in', 'intros — who you are, what you run. no wrong answers.');
await renameChannel('LANDING-PAD', 'LANDING-PAD');

// HEARTLIGHT (was AFTERLIFE hangout)
await renameChannel('the-game-strip', 'heartlight', 'the square. main hangout. say something.');
await renameChannel('the-street', 'heartlight', 'the square. main hangout. say something.');
await renameChannel('heartlight', 'heartlight', 'the square. main hangout. say something.');
await renameChannel('data-cache', 'data-cache', 'pics, clips, tracks, cool links.');
await renameChannel('memes', 'signal-noise', 'memes, junk data, low priority.');
await renameChannel('signal-noise', 'signal-noise', 'memes, junk data, low priority.');
await renameChannel('the-void', 'the-void', 'bad day chat. no advice unless asked.');
await renameChannel('off-topic', 'off-topic', 'everything else.');
await renameChannel('AFTERLIFE-BAR', 'HEARTLIGHT-PLAZA');
await renameChannel('HEARTLIGHT-PLAZA', 'HEARTLIGHT-PLAZA');
await renameChannel('ROOFTOP', 'ROOFTOP');
await renameChannel('NEON-LOUNGE', 'HEARTLIGHT-PLAZA');

// THE CIRCUIT
await renameChannel('game-grid', 'game-grid', 'all games — builds, wins, salt, patch notes.');
await renameChannel('squad-up', 'squad-up', 'LFG — tag @CIRCUIT when you need a crew.');
await renameChannel('ARENA-01', 'ARENA-01');
await renameChannel('ARENA-02', 'ARENA-02');

// FAMEWORKS
await renameChannel('CREATION', 'CREATION');
await renameChannel('in-construction', 'in-construction', 'WIPs welcome. ship it rough.');
await renameChannel('gallery', 'gallery', 'finished pieces.');
await renameChannel('source', 'source', 'code, scripts, tools.');
await renameChannel('peer-review', 'peer-review', 'tag @FIXER when you want eyes on it.');

// BROADCAST MILE
await renameChannel('-ON.STREAM', 'ON.STREAM');
await renameChannel('ON.STREAM', 'ON.STREAM');
await renameChannel('ALWAYS-ON.FEED', 'ON.STREAM');
await renameChannel('signal-feed', 'signal-feed', 'now playing / requests. the feed never sleeps.');
await renameChannel('queue', 'queue', 'drop movie titles. react to vote.');
await renameChannel('sync-up', 'sync-up', 'scheduled watch parties.');

// AFTERLIGHT
await renameChannel('jig-jig', 'afterlight', 'night grid. 18+. opt in via #augments.');
await renameChannel('afterlight', 'afterlight', 'night grid. 18+. opt in via #augments.');

// SPIRE OPS
await renameChannel('terminal', 'terminal', 'spire command line. bot commands live here.');
await renameChannel('watch-log', 'watch-log', 'ICE log. officers only.');
await renameChannel('sysadmin', 'sysadmin', 'architect / netrunner only.');
await renameChannel('mod-log', 'watch-log', 'ICE log. officers only.');
await renameChannel('admin', 'sysadmin', 'architect / netrunner only.');

// ensure social channels that may be missing
console.log('— ensure channels —');
await ensureText('jack-in', 'ARRIVAL', 'intros — who you are, what you run. no wrong answers.');
await ensureText('signal-noise', 'HEARTLIGHT', 'memes, junk data, low priority.');
await ensureText('the-void', 'HEARTLIGHT', 'bad day chat. no advice unless asked.');
await ensureText('off-topic', 'HEARTLIGHT', 'everything else.');
await ensureText('squad-up', 'THE CIRCUIT', 'LFG — tag @CIRCUIT when you need a crew.');
await ensureText('in-construction', 'FAMEWORKS', 'WIPs welcome. ship it rough.');
await ensureText('gallery', 'FAMEWORKS', 'finished pieces.');
await ensureText('source', 'FAMEWORKS', 'code, scripts, tools.');
await ensureText('peer-review', 'FAMEWORKS', 'tag @FIXER when you want eyes on it.');
await ensureText('signal-feed', 'BROADCAST MILE', 'now playing / requests. the feed never sleeps.');
await ensureText('queue', 'BROADCAST MILE', 'drop movie titles. react to vote.');
await ensureText('sync-up', 'BROADCAST MILE', 'scheduled watch parties.');
await ensureText('watch-log', 'SPIRE OPS', 'ICE log. officers only.');
await ensureText('sysadmin', 'SPIRE OPS', 'architect / netrunner only.');
await ensureVoice('HEARTLIGHT-PLAZA', 'HEARTLIGHT');
await ensureVoice('SYNC-CHAMBER', 'BROADCAST MILE');
await ensureVoice('OFFLINE', 'SPIRE OPS');

// reparent known channels into correct districts if they drifted
console.log('— reparent —');
const PARENTS = {
  'boot-sequence': 'ARRIVAL',
  'the-code': 'ARRIVAL',
  'augments': 'ARRIVAL',
  'jack-in': 'ARRIVAL',
  'LANDING-PAD': 'ARRIVAL',
  'heartlight': 'HEARTLIGHT',
  'signal-noise': 'HEARTLIGHT',
  'data-cache': 'HEARTLIGHT',
  'the-void': 'HEARTLIGHT',
  'off-topic': 'HEARTLIGHT',
  'HEARTLIGHT-PLAZA': 'HEARTLIGHT',
  'ROOFTOP': 'HEARTLIGHT',
  'game-grid': 'THE CIRCUIT',
  'squad-up': 'THE CIRCUIT',
  'ARENA-01': 'THE CIRCUIT',
  'ARENA-02': 'THE CIRCUIT',
  'in-construction': 'FAMEWORKS',
  'gallery': 'FAMEWORKS',
  'source': 'FAMEWORKS',
  'peer-review': 'FAMEWORKS',
  'CREATION': 'FAMEWORKS',
  'signal-feed': 'BROADCAST MILE',
  'queue': 'BROADCAST MILE',
  'sync-up': 'BROADCAST MILE',
  'ON.STREAM': 'BROADCAST MILE',
  'SYNC-CHAMBER': 'BROADCAST MILE',
  'afterlight': 'AFTERLIGHT',
  'terminal': 'SPIRE OPS',
  'watch-log': 'SPIRE OPS',
  'sysadmin': 'SPIRE OPS',
  'OFFLINE': 'SPIRE OPS',
};
channels = await rest('GET', `/guilds/${gid}/channels`);
for (const [name, parentName] of Object.entries(PARENTS)) {
  const c = ch(name);
  const p = cat(parentName);
  if (!c || !p) continue;
  if (c.parent_id === p.id) continue;
  await rest('PATCH', `/channels/${c.id}`, { parent_id: p.id });
  console.log(`  + moved #${name} → ${parentName}`);
}

// ---- 5. orientation embeds --------------------------------------------------
console.log('— orientation embeds —');
channels = await rest('GET', `/guilds/${gid}/channels`);
const id = (n) => ch(n)?.id;
const codeId = id('the-code');
const augId = id('augments');
const heartId = id('heartlight');
const afterId = id('afterlight');

const EMBEDS = {
  'boot-sequence': {
    file: 'hero_boot.png',
    reactions: [],
    embed: {
      title: 'WELCOME HOME',
      description:
        '**GRILLONIA PRIME** — warm capital of 2100.\n' +
        'success on the skyline. home in the square.\n\n' +
        'you just touched down. boot sequence:',
      color: hex('#E8B923'),
      fields: [
        { name: '01 · read', value: codeId ? `the code → <#${codeId}>` : 'the code', inline: true },
        { name: '02 · chip in', value: augId ? `augments → <#${augId}>` : 'augments', inline: true },
        { name: '03 · the square', value: heartId ? `heartlight → <#${heartId}>` : 'heartlight', inline: true },
        { name: '04 · the feed', value: 'join **ON.STREAM** when you want cinema or music', inline: false },
      ],
      image: { url: 'attachment://hero_boot.png' },
      footer: { text: 'come home when ready_' },
    },
  },
  'the-code': {
    file: 'hero_code.png',
    reactions: ['✅'],
    embed: {
      title: 'THE CODE',
      description: 'planetary law. break it = disconnect. ICE has final call — with a smile, but final.',
      color: hex('#5EEAD4'),
      fields: [
        { name: '01', value: '**respect the crew.** be the reason someone stays.' },
        { name: '02', value: '**no hate signal** — slurs, harassment, doxxing = instant disconnect.' },
        { name: '03', value: '**tag spoilers** — ||like this||' },
        { name: '04', value: afterId
          ? `**afterlight stays opt-in** — 18+ lives in <#${afterId}> only.`
          : '**afterlight stays opt-in** — 18+ only, gated.' },
        { name: '05', value: '**ICE has final call** — DM a **PRIME ARCHITECT** if something is broken.' },
      ],
      image: { url: 'attachment://hero_code.png' },
      footer: { text: 'react ✅ to clear customs and enter the city' },
    },
  },
  'augments': {
    file: 'hero_augments.png',
    reactions: ['✅', '⚔️', '🎬', '🛠️', '🌙'],
    embed: {
      title: 'CHIP INSTALLATION',
      description: 'react to install chips. remove a reaction to uninstall.\n*(reaction roles go live once Carl / the netrunner wires them)*',
      color: hex('#A78BFA'),
      fields: [
        { name: '✅  PRIME CITIZEN', value: 'clear customs — full city access' },
        { name: '⚔️  CIRCUIT', value: 'gaming + LFG pings' },
        { name: '🎬  HOLO-PASS', value: 'movie nights + broadcast pings' },
        { name: '🛠️  FIXER', value: 'creative / peer-review pings' },
        { name: '🌙  AFTERLIGHT', value: 'unlocks the night grid (18+)' },
      ],
      image: { url: 'attachment://hero_augments.png' },
      footer: { text: 'heartlight is open either way — chips just aim the pings' },
    },
  },
};

for (const [chName, spec] of Object.entries(EMBEDS)) {
  const channelId = id(chName);
  if (!channelId) { console.log(`  ? #${chName} missing`); continue; }

  const pins = await rest('GET', `/channels/${channelId}/pins`).catch(() => []);
  for (const p of pins) {
    await rest('DELETE', `/channels/${channelId}/messages/${p.id}`).catch(() => {});
  }

  const form = new FormData();
  form.append('payload_json', JSON.stringify({
    embeds: [spec.embed],
    attachments: [{ id: 0, filename: spec.file }],
  }));
  const buf = readFileSync(`art/${spec.file}`);
  form.append('files[0]', new Blob([buf], { type: 'image/png' }), spec.file);

  const res = await fetch(`${API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: auth,
    body: form,
  });
  if (!res.ok) {
    console.log(`  ! #${chName} post ${res.status} ${await res.text()}`);
    continue;
  }
  const msg = await res.json();
  await sleep(400);
  await rest('PUT', `/channels/${channelId}/pins/${msg.id}`).catch(() => {});
  for (const e of spec.reactions) {
    await rest('PUT', `/channels/${channelId}/messages/${msg.id}/reactions/${encodeURIComponent(e)}/@me`).catch(() => {});
  }
  console.log(`  + pinned embed in #${chName}`);
}

// ---- 6. icon ----------------------------------------------------------------
console.log('— server icon —');
try {
  const buf = readFileSync('art/server_icon.png');
  // Discord wants icon under ~256KB ideally; compress if huge
  const dataUri = `data:image/png;base64,${buf.toString('base64')}`;
  await rest('PATCH', `/guilds/${gid}`, { icon: dataUri });
  console.log('  + server icon updated (Heartlight seal)');
} catch (e) {
  console.log(`  ! icon failed: ${e.message}`);
}

console.log('\n✅ Meridian influence pass complete.');
console.log('   Bible: GRILLONIA_PRIME_DISCORD_BIBLE.md');
console.log('   Next: re-invite Iron Talon · wire Carl reaction roles · optional banner');
